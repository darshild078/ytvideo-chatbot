import { Request, Response, NextFunction } from 'express';
import { createError } from '../middleware/errorHandler.js';
import { Video } from '../models/Video.model.js';
import { Transcript } from '../models/Transcript.model.js';
import { addIngestionJob, getIngestionJobStatus } from '../queues/ingestion.queue.js';

function extractVideoId(url: string): string | null {
    const patterns = [
        /(?:youtube\.com\/watch\?v=)([^&#]+)/,
        /(?:youtu\.be\/)([^&#?]+)/,
        /(?:youtube\.com\/embed\/)([^&#?]+)/,
        /(?:youtube\.com\/shorts\/)([^&#?]+)/,
    ];

    for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match) return match[1];
    }
    return null;
}

export async function analyzeVideo(
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> {
    try {
        const { url } = req.body;
        const videoId = extractVideoId(url);

        if (!videoId) {
            throw createError('Invalid YouTube URL', 400);
        }

        const existingVideo = await Video.findOne({ videoId });

        if (existingVideo?.indexed) {
            res.json({
                success: true,
                videoId,
                status: 'already_indexed',
                message: 'Video already indexed and ready',
                chunkCount: existingVideo.chunkCount,
            });
            return;
        }

        // Check if job is already in progress
        const jobStatus = await getIngestionJobStatus(videoId);
        if (jobStatus.status === 'active' || jobStatus.status === 'waiting') {
            res.json({
                success: true,
                videoId,
                status: 'processing',
                message: 'Video is already being processed',
                progress: jobStatus.progress,
            });
            return;
        }

        // Create video entry if it doesn't exist
        if (!existingVideo) {
            await Video.create({
                videoId,
                title: `Video ${videoId}`,
                indexed: false,
                chunkCount: 0,
            });
        }

        // Add job to ingestion queue
        const jobId = await addIngestionJob(videoId, url);

        res.json({
            success: true,
            videoId,
            jobId,
            status: 'queued',
            message: 'Video queued for processing',
        });
    } catch (error) {
        next(error);
    }
}

export async function getVideoStatus(
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> {
    try {
        const { videoId } = req.params;
        const video = await Video.findOne({ videoId });

        if (!video) {
            // Check if there's a job in progress
            const jobStatus = await getIngestionJobStatus(videoId);
            res.json({
                success: true,
                status: jobStatus.status === 'not_found' ? 'not_found' : 'processing',
                progress: jobStatus.progress || 0,
            });
            return;
        }

        if (video.indexed) {
            res.json({
                success: true,
                status: 'completed',
                progress: 100,
                chunkCount: video.chunkCount,
                title: video.title,
            });
            return;
        }

        const jobStatus = await getIngestionJobStatus(videoId);
        res.json({
            success: true,
            status: jobStatus.status === 'failed' ? 'failed' : 'processing',
            progress: jobStatus.progress || 0,
        });
    } catch (error) {
        next(error);
    }
}

export async function getTranscript(
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> {
    try {
        const { videoId } = req.params;
        const transcript = await Transcript.findOne({ videoId });

        if (!transcript) {
            throw createError('Transcript not found', 404);
        }

        res.json({
            success: true,
            transcript: transcript.segments,
            language: transcript.language,
        });
    } catch (error) {
        next(error);
    }
}
