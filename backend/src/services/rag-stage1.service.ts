import { getGroqClient, MODELS } from '../config/groq.js';
import { VectorSearchResult } from './vectordb.service.js';
import { logger } from '../utils/logger.js';

export interface FilteredChunk {
    chunkId: number;
    text: string;
    startTime: number;
    endTime: number;
    relevanceScore: number;
    reason: string;
}

export async function filterRelevantChunks(
    question: string,
    chunks: VectorSearchResult[],
    topK: number = 5
): Promise<FilteredChunk[]> {
    const groq = getGroqClient();

    const chunksContext = chunks.map((chunk, i) =>
        `[${i + 1}] ChunkID: ${chunk.chunkId}, Start: ${formatTime(chunk.startTime)}, End: ${formatTime(chunk.endTime)}, Score: ${chunk.score.toFixed(3)}\nText: ${chunk.text}`
    ).join('\n\n');

    const prompt = `You are a retrieval assistant for a video Q&A system. Your task is to select the ${topK} MOST RELEVANT transcript chunks to answer the user's question.

USER QUESTION: "${question}"

TRANSCRIPT CHUNKS (${chunks.length} total):
${chunksContext}

Analyze each chunk and select the ${topK} most relevant ones. Consider:
1. Direct relevance to the question
2. Context that helps answer the question
3. Timestamp accuracy for video navigation

Return ONLY valid JSON in this exact format:
{
  "relevant_chunks": [
    {"chunk_index": 1, "relevance_score": 0.95, "reason": "Directly addresses..."},
    {"chunk_index": 5, "relevance_score": 0.88, "reason": "Provides context for..."}
  ]
}

Return exactly ${topK} chunks, sorted by relevance (highest first).`;

    try {
        const startTime = Date.now();

        const response = await groq.chat.completions.create({
            model: MODELS.STAGE1_FILTER,
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.1,
            max_tokens: 1000,
            response_format: { type: 'json_object' },
        });

        const elapsed = Date.now() - startTime;
        logger.info(`Stage 1 filtering completed in ${elapsed}ms`);

        const content = response.choices[0]?.message?.content || '{}';
        const parsed = JSON.parse(content);

        if (!parsed.relevant_chunks || !Array.isArray(parsed.relevant_chunks)) {
            throw new Error('Invalid response format from Stage 1');
        }

        const filteredChunks: FilteredChunk[] = parsed.relevant_chunks
            .slice(0, topK)
            .map((item: { chunk_index: number; relevance_score: number; reason: string }) => {
                const chunkIndex = item.chunk_index - 1; // Convert to 0-indexed
                const originalChunk = chunks[chunkIndex];

                if (!originalChunk) {
                    return null;
                }

                return {
                    chunkId: originalChunk.chunkId,
                    text: originalChunk.text,
                    startTime: originalChunk.startTime,
                    endTime: originalChunk.endTime,
                    relevanceScore: item.relevance_score,
                    reason: item.reason,
                };
            })
            .filter((chunk: FilteredChunk | null): chunk is FilteredChunk => chunk !== null);

        logger.info(`Filtered to ${filteredChunks.length} relevant chunks`);
        return filteredChunks;
    } catch (error) {
        logger.error('Stage 1 filtering failed', error);
        // Fallback: return top chunks by vector similarity
        return chunks.slice(0, topK).map((chunk) => ({
            chunkId: chunk.chunkId,
            text: chunk.text,
            startTime: chunk.startTime,
            endTime: chunk.endTime,
            relevanceScore: chunk.score,
            reason: 'Fallback: Top by vector similarity',
        }));
    }
}

function formatTime(seconds: number): string {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hrs > 0) {
        return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}
