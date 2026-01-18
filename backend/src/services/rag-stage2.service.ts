import { getGroqClient, MODELS } from '../config/groq.js';
import { FilteredChunk } from './rag-stage1.service.js';
import { logger } from '../utils/logger.js';

export interface SecondaryTimestamp {
    time: number;
    formatted: string;
    topic: string;
}

export interface RAGResponse {
    answer: string;
    primaryTimestamp: number;
    formattedTime: string;
    confidence: number;
    context: string;
    secondaryTimestamps: SecondaryTimestamp[];
}

export async function generateAnswer(
    question: string,
    filteredChunks: FilteredChunk[],
    videoMetadata: string = ''
): Promise<RAGResponse> {
    const groq = getGroqClient();

    const chunksContext = filteredChunks.map((chunk, i) =>
        `[Segment ${i + 1}] Time: ${formatTime(chunk.startTime)} - ${formatTime(chunk.endTime)}\nRelevance: ${(chunk.relevanceScore * 100).toFixed(0)}%\nContent: ${chunk.text}`
    ).join('\n\n');

    const metadataSection = videoMetadata ? `\nVIDEO METADATA:\n${videoMetadata}\n` : '';

    const prompt = `You are a helpful video assistant. Answer the user's question based ONLY on the provided transcript segments and video metadata. Be precise and reference specific timestamps.${metadataSection}

USER QUESTION: "${question}"

RELEVANT TRANSCRIPT SEGMENTS:
${chunksContext}

Provide a clear, accurate answer with exact timestamps. Return ONLY valid JSON:
{
  "answer": "Your 2-3 sentence answer here. Be specific and helpful.",
  "primary_timestamp": 123.5,
  "confidence": 0.85,
  "context": "Brief description of what's being discussed at this timestamp",
  "secondary_timestamps": [
    {"time": 145.2, "topic": "Related point about..."},
    {"time": 200.0, "topic": "Additional context on..."}
  ]
}

RULES:
- primary_timestamp must be a number (seconds) from one of the segments
- confidence should be 0.0-1.0 based on how well the segments answer the question
- Include 0-3 secondary timestamps only if they're genuinely relevant
- If the answer cannot be found, set confidence to 0.1 and explain in the answer`;

    try {
        const startTime = Date.now();

        const response = await groq.chat.completions.create({
            model: MODELS.STAGE2_GENERATE,
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.3,
            max_tokens: 800,
            response_format: { type: 'json_object' },
        });

        const elapsed = Date.now() - startTime;
        logger.info(`Stage 2 generation completed in ${elapsed}ms`);

        const content = response.choices[0]?.message?.content || '{}';
        const parsed = JSON.parse(content);

        const primaryTimestamp = parsed.primary_timestamp || filteredChunks[0]?.startTime || 0;

        const result: RAGResponse = {
            answer: parsed.answer || 'Unable to generate answer from the provided context.',
            primaryTimestamp,
            formattedTime: formatTime(primaryTimestamp),
            confidence: parsed.confidence || 0.5,
            context: parsed.context || '',
            secondaryTimestamps: (parsed.secondary_timestamps || []).map(
                (ts: { time: number; topic: string }) => ({
                    time: ts.time,
                    formatted: formatTime(ts.time),
                    topic: ts.topic,
                })
            ),
        };

        return result;
    } catch (error) {
        logger.error('Stage 2 generation failed', error);

        // Fallback response
        const fallbackTime = filteredChunks[0]?.startTime || 0;
        return {
            answer: 'I encountered an error processing your question. Please try again.',
            primaryTimestamp: fallbackTime,
            formattedTime: formatTime(fallbackTime),
            confidence: 0,
            context: 'Error occurred during answer generation',
            secondaryTimestamps: [],
        };
    }
}

function formatTime(seconds: number): string {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hrs > 0) {
        return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}
