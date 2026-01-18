import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { createError } from '../middleware/errorHandler.js';
import { Video } from '../models/Video.model.js';
import { ChatHistory } from '../models/ChatHistory.model.js';
import { processQuery } from '../services/query-orchestrator.service.js';

export async function handleQuery(
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> {
    try {
        const { videoId, question, sessionId = uuidv4() } = req.body;

        const video = await Video.findOne({ videoId });
        if (!video?.indexed) {
            throw createError('Video not indexed. Please analyze the video first.', 400);
        }

        // Process query through RAG pipeline
        const result = await processQuery(videoId, question);

        // Save to chat history
        await ChatHistory.findOneAndUpdate(
            { videoId, sessionId },
            {
                $push: {
                    messages: [
                        { role: 'user', content: question, createdAt: new Date() },
                        {
                            role: 'assistant',
                            content: result.answer,
                            timestamp: result.primaryTimestamp,
                            formattedTime: result.formattedTime,
                            confidence: result.confidence,
                            createdAt: new Date(),
                        },
                    ],
                },
            },
            { upsert: true, new: true }
        );

        res.json({
            success: true,
            sessionId,
            answer: result.answer,
            primaryTimestamp: result.primaryTimestamp,
            formattedTime: result.formattedTime,
            confidence: result.confidence,
            context: result.context,
            secondaryTimestamps: result.secondaryTimestamps,
            metrics: result.metrics,
        });
    } catch (error) {
        next(error);
    }
}

export async function getChatHistory(
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> {
    try {
        const { videoId, sessionId } = req.params;
        const chatHistory = await ChatHistory.findOne({ videoId, sessionId });

        if (!chatHistory) {
            res.json({
                success: true,
                messages: [],
            });
            return;
        }

        res.json({
            success: true,
            messages: chatHistory.messages,
        });
    } catch (error) {
        next(error);
    }
}
