import { generateSingleEmbedding } from './embedding.service.js';
import { queryVectors } from './vectordb.service.js';
import { filterRelevantChunks } from './rag-stage1.service.js';
import { generateAnswer, RAGResponse } from './rag-stage2.service.js';
import { Video } from '../models/Video.model.js';
import { logger } from '../utils/logger.js';

export interface QueryMetrics {
    embeddingTime: number;
    vectorSearchTime: number;
    stage1Time: number;
    stage2Time: number;
    totalTime: number;
    chunksRetrieved: number;
    chunksFiltered: number;
}

export interface QueryResult extends RAGResponse {
    metrics: QueryMetrics;
}

export async function processQuery(
    videoId: string,
    question: string
): Promise<QueryResult> {
    const startTime = Date.now();
    const metrics: QueryMetrics = {
        embeddingTime: 0,
        vectorSearchTime: 0,
        stage1Time: 0,
        stage2Time: 0,
        totalTime: 0,
        chunksRetrieved: 0,
        chunksFiltered: 0,
    };

    try {
        logger.info(`Processing query for video ${videoId}: "${question}"`);

        // Fetch video metadata for context
        const video = await Video.findOne({ videoId });
        const videoMetadata = video
            ? `Video Title: ${video.title}\nChannel: ${video.channelTitle}\nSubscribers: ${video.subscriberCount?.toLocaleString() || 'Unknown'}\nViews: ${video.viewCount?.toLocaleString() || 'Unknown'}\nPublished: ${video.publishedAt ? new Date(video.publishedAt).toLocaleDateString() : 'Unknown'}`
            : '';

        // Step 1: Generate query embedding
        let stepStart = Date.now();
        const queryEmbedding = await generateSingleEmbedding(question);
        metrics.embeddingTime = Date.now() - stepStart;

        // Step 2: Vector similarity search (retrieve 10 chunks)
        stepStart = Date.now();
        const searchResults = await queryVectors(videoId, queryEmbedding, 10);
        metrics.vectorSearchTime = Date.now() - stepStart;
        metrics.chunksRetrieved = searchResults.length;

        if (searchResults.length === 0) {
            throw new Error('No relevant content found in the video');
        }

        // Step 3: Stage 1 - LLM filtering (10 → 5 chunks)
        stepStart = Date.now();
        const filteredChunks = await filterRelevantChunks(question, searchResults, 5);
        metrics.stage1Time = Date.now() - stepStart;
        metrics.chunksFiltered = filteredChunks.length;

        // Step 4: Stage 2 - LLM generation with metadata context
        stepStart = Date.now();
        const response = await generateAnswer(question, filteredChunks, videoMetadata);
        metrics.stage2Time = Date.now() - stepStart;

        metrics.totalTime = Date.now() - startTime;

        logger.info(`Query completed in ${metrics.totalTime}ms`, {
            embedding: metrics.embeddingTime,
            search: metrics.vectorSearchTime,
            stage1: metrics.stage1Time,
            stage2: metrics.stage2Time,
        });

        return {
            ...response,
            metrics,
        };
    } catch (error) {
        metrics.totalTime = Date.now() - startTime;
        logger.error('Query processing failed', error);

        return {
            answer: error instanceof Error ? error.message : 'An error occurred processing your query.',
            primaryTimestamp: 0,
            formattedTime: '00:00',
            confidence: 0,
            context: 'Error',
            secondaryTimestamps: [],
            metrics,
        };
    }
}
