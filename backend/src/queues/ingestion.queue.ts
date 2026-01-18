import Bull from 'bull';
import { createQueue } from '../config/redis.js';
import { extractTranscript } from '../services/transcript.service.js';
import { chunkTranscriptWithTimestamps } from '../services/chunking.service.js';
import { generateEmbeddings } from '../services/embedding.service.js';
import { upsertVectors } from '../services/vectordb.service.js';
import { fetchVideoMetadata } from '../services/youtube.service.js';
import { Video } from '../models/Video.model.js';
import { emitIngestionProgress, emitIngestionComplete, emitIngestionError } from '../websocket/index.js';
import { logger } from '../utils/logger.js';

export interface IngestionJobData {
    videoId: string;
    url: string;
}

export interface IngestionJobResult {
    success: boolean;
    videoId: string;
    chunkCount: number;
    error?: string;
}

const ingestionQueue = createQueue<IngestionJobData>('video-ingestion');

const MAX_SEGMENTS = 15000; // Limit for 8GB RAM systems (~10 hours max)

async function processIngestion(job: Bull.Job<IngestionJobData>): Promise<IngestionJobResult> {
    const { videoId } = job.data;

    try {
        logger.info(`Starting ingestion for video: ${videoId}`);

        // Stage 0: Fetch video metadata (0-10%)
        emitIngestionProgress(videoId, 2, 'Fetching video metadata...');
        const metadata = await fetchVideoMetadata(videoId);
        emitIngestionProgress(videoId, 10, `Fetched metadata for: ${metadata.title}`);

        // Stage 1: Extract transcript (10-25%)
        emitIngestionProgress(videoId, 12, 'Extracting transcript...');
        const segments = await extractTranscript(videoId);

        // Check if video is too long
        if (segments.length > MAX_SEGMENTS) {
            const estimatedHours = Math.floor(segments.length / 1500); // rough estimate
            throw new Error(
                `Video is too long (${segments.length.toLocaleString()} transcript segments, ~${estimatedHours}+ hours). ` +
                `Maximum supported is ${MAX_SEGMENTS.toLocaleString()} segments (~6-7 hours). ` +
                `Please try a shorter video to avoid memory issues.`
            );
        }

        emitIngestionProgress(videoId, 25, `Extracted ${segments.length} segments`);

        // Stage 2: Chunk transcript (20-30%)
        emitIngestionProgress(videoId, 25, 'Creating chunks...');
        const chunks = chunkTranscriptWithTimestamps(segments);
        logger.info(`Created ${chunks.length} chunks from ${segments.length} segments`);
        emitIngestionProgress(videoId, 30, `Created ${chunks.length} chunks`);

        // Free up segments memory
        segments.length = 0;

        // Stage 3-4: Process in batches to avoid memory issues (30-100%)
        // For very large videos, process embeddings AND upsert in smaller batches
        const PROCESS_BATCH_SIZE = 50; // Reduced to 50 to stay under Pinecone's 2MB limit
        let totalProcessed = 0;

        for (let i = 0; i < chunks.length; i += PROCESS_BATCH_SIZE) {
            const batchChunks = chunks.slice(i, i + PROCESS_BATCH_SIZE);
            const batchSize = batchChunks.length;

            // Generate embeddings for this batch
            emitIngestionProgress(
                videoId,
                30 + Math.floor((i / chunks.length) * 35),
                `Generating embeddings ${i + 1}-${i + batchSize} of ${chunks.length}...`
            );

            const batchTexts = batchChunks.map(c => c.text);
            const batchEmbeddings = await generateEmbeddings(batchTexts);

            // Immediately upsert this batch to Pinecone, then free memory
            emitIngestionProgress(
                videoId,
                65 + Math.floor((i / chunks.length) * 30),
                `Indexing batch ${Math.floor(i / PROCESS_BATCH_SIZE) + 1}...`
            );

            await upsertVectors(videoId, batchChunks, batchEmbeddings);

            totalProcessed += batchSize;

            // Clear this batch from memory
            batchTexts.length = 0;
            batchEmbeddings.length = 0;
            batchChunks.length = 0;

            // Force garbage collection if available
            if (global.gc) {
                global.gc();
            }

            logger.info(`Processed ${totalProcessed}/${chunks.length} chunks`);
        }

        emitIngestionProgress(videoId, 95, 'Finalizing...');

        // Stage 5: Update MongoDB with metadata and indexing status (95-100%)
        await Video.findOneAndUpdate(
            { videoId },
            {
                title: metadata.title,
                description: metadata.description,
                channelId: metadata.channelId,
                channelTitle: metadata.channelName,
                subscriberCount: metadata.subscriberCount,
                viewCount: metadata.viewCount,
                likeCount: metadata.likeCount,
                publishedAt: metadata.publishedAt,
                duration: metadata.duration,
                thumbnailUrl: metadata.thumbnailUrl,
                indexed: true,
                chunkCount: chunks.length,
            },
            { upsert: true }
        );

        emitIngestionProgress(videoId, 100, 'Complete!');
        emitIngestionComplete(videoId, true);

        logger.info(`Ingestion complete for video: ${videoId} (${chunks.length} chunks)`);

        return {
            success: true,
            videoId,
            chunkCount: chunks.length,
        };
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logger.error(`Ingestion failed for video: ${videoId}`, error);

        emitIngestionError(videoId, errorMessage);

        // Mark video as failed
        await Video.findOneAndUpdate(
            { videoId },
            { indexed: false },
            { upsert: true }
        );

        return {
            success: false,
            videoId,
            chunkCount: 0,
            error: errorMessage,
        };
    }
}

ingestionQueue.process(async (job) => {
    return processIngestion(job);
});

ingestionQueue.on('completed', (job, result: IngestionJobResult) => {
    logger.info(`Job ${job.id} completed`, result);
});

ingestionQueue.on('failed', (job, error) => {
    logger.error(`Job ${job.id} failed`, error);
});

export async function addIngestionJob(videoId: string, url: string): Promise<string> {
    const job = await ingestionQueue.add(
        { videoId, url },
        {
            jobId: `ingestion_${videoId}`,
            attempts: 2,
            backoff: { type: 'exponential', delay: 5000 },
            timeout: 1800000, // 30 minute timeout for very large videos
        }
    );

    logger.info(`Added ingestion job for video: ${videoId}, jobId: ${job.id}`);
    return String(job.id);
}

export async function getIngestionJobStatus(videoId: string): Promise<{
    status: 'waiting' | 'active' | 'completed' | 'failed' | 'not_found';
    progress?: number;
}> {
    const job = await ingestionQueue.getJob(`ingestion_${videoId}`);

    if (!job) {
        return { status: 'not_found' };
    }

    const state = await job.getState();
    const progress = job.progress();

    return {
        status: state as 'waiting' | 'active' | 'completed' | 'failed',
        progress: typeof progress === 'number' ? progress : 0,
    };
}

export { ingestionQueue };
