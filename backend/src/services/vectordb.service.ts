import { getPineconeIndex } from '../config/pinecone.js';
import { TranscriptChunk } from './chunking.service.js';
import { logger } from '../utils/logger.js';
import { RecordMetadata } from '@pinecone-database/pinecone';

export interface VectorMetadata extends RecordMetadata {
    videoId: string;
    chunkId: number;
    text: string;
    startTime: number;
    endTime: number;
    tokens: number;
}

export interface VectorSearchResult {
    chunkId: number;
    text: string;
    startTime: number;
    endTime: number;
    score: number;
}

export async function upsertVectors(
    videoId: string,
    chunks: TranscriptChunk[],
    embeddings: number[][]
): Promise<void> {
    const index = getPineconeIndex();

    const vectors = chunks.map((chunk, i) => ({
        id: `${videoId}_chunk_${chunk.chunkId}`,
        values: embeddings[i],
        metadata: {
            videoId: videoId,
            chunkId: chunk.chunkId,
            text: chunk.text,
            startTime: chunk.startTime,
            endTime: chunk.endTime,
            tokens: chunk.tokens,
        } as VectorMetadata,
    }));

    // Batch upsert in chunks of 50 (reduced from 100 to stay under 2MB limit)
    const batchSize = 50;
    for (let i = 0; i < vectors.length; i += batchSize) {
        const batch = vectors.slice(i, i + batchSize);
        await index.upsert(batch);
        logger.info(`Upserted batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(vectors.length / batchSize)}`);
    }

    logger.info(`Upserted ${vectors.length} vectors for video ${videoId}`);
}

export async function queryVectors(
    videoId: string,
    queryEmbedding: number[],
    topK: number = 10  // Reduced to 10 to fit Groq's 6000 token limit (30 chunks ≈ 49K tokens)
): Promise<VectorSearchResult[]> {
    const index = getPineconeIndex();

    // Query without filter to get all results, then filter in code
    // This avoids Pinecone serverless metadata filtering issues
    const results = await index.query({
        vector: queryEmbedding,
        topK: 100, // Get more results to filter
        includeMetadata: true,
    });

    // Filter results by videoId in code
    const filteredMatches = (results.matches || []).filter((match) => {
        const metadata = match.metadata as VectorMetadata;
        const matchesVideo = metadata.videoId === videoId;

        // Debug logging - remove after fixing
        if (!matchesVideo && results.matches && results.matches.length > 0) {
            logger.info(`Filtering out vector: metadata.videoId="${metadata.videoId}" !== queryVideoId="${videoId}"`);
        }

        return matchesVideo;
    });

    // Take only topK after filtering
    const topMatches = filteredMatches.slice(0, topK);

    const searchResults: VectorSearchResult[] = topMatches.map((match) => {
        const metadata = match.metadata as VectorMetadata;
        return {
            chunkId: Number(metadata.chunkId),
            text: String(metadata.text),
            startTime: Number(metadata.startTime),
            endTime: Number(metadata.endTime),
            score: match.score || 0,
        };
    });

    logger.info(`Found ${searchResults.length} matches for query (filtered from ${results.matches?.length || 0} total)`);
    return searchResults;
}

export async function deleteVideoVectors(videoId: string): Promise<void> {
    const index = getPineconeIndex();

    try {
        // Delete all vectors matching this videoId using metadata filter
        await index.deleteMany({
            filter: {
                videoId: { $eq: videoId }
            }
        });
        logger.info(`Successfully deleted vectors for video ${videoId}`);
    } catch (error) {
        logger.error(`Failed to delete vectors for ${videoId}:`, error);
        throw error;
    }
}
