import { TranscriptSegment } from './transcript.service.js';
import { logger } from '../utils/logger.js';

export interface TranscriptChunk {
    chunkId: number;
    text: string;
    startTime: number;
    endTime: number;
    tokens: number;
}

function estimateTokens(text: string): number {
    return Math.ceil(text.split(/\s+/).length * 1.3);
}

export function chunkTranscriptWithTimestamps(
    segments: TranscriptSegment[],
    targetChunkSize: number = 300,
    overlapSize: number = 50
): TranscriptChunk[] {
    const chunks: TranscriptChunk[] = [];
    let currentChunk: string[] = [];
    let currentTokens = 0;
    let chunkStartTime = 0;
    let chunkEndTime = 0;
    let chunkId = 0;

    for (let i = 0; i < segments.length; i++) {
        const segment = segments[i];
        const segmentTokens = estimateTokens(segment.text);

        if (currentChunk.length === 0) {
            chunkStartTime = segment.start;
        }

        currentChunk.push(segment.text);
        currentTokens += segmentTokens;
        chunkEndTime = segment.start + segment.duration;

        if (currentTokens >= targetChunkSize) {
            chunks.push({
                chunkId,
                text: currentChunk.join(' '),
                startTime: chunkStartTime,
                endTime: chunkEndTime,
                tokens: currentTokens,
            });
            chunkId++;

            // Calculate overlap: keep last few segments
            const overlapTokens = 0;
            const overlapSegments: string[] = [];
            let overlapStartTime = chunkEndTime;

            for (let j = currentChunk.length - 1; j >= 0 && overlapTokens < overlapSize; j--) {
                const text = currentChunk[j];
                const tokens = estimateTokens(text);
                if (overlapTokens + tokens <= overlapSize) {
                    overlapSegments.unshift(text);
                }
            }

            // Find the start time for overlap
            for (let k = i; k >= 0 && overlapSegments.length > 0; k--) {
                if (segments[k].text === overlapSegments[0]) {
                    overlapStartTime = segments[k].start;
                    break;
                }
            }

            currentChunk = overlapSegments;
            currentTokens = overlapSegments.reduce((sum, t) => sum + estimateTokens(t), 0);
            chunkStartTime = overlapStartTime;
        }
    }

    // Add remaining content as final chunk
    if (currentChunk.length > 0) {
        chunks.push({
            chunkId,
            text: currentChunk.join(' '),
            startTime: chunkStartTime,
            endTime: chunkEndTime,
            tokens: currentTokens,
        });
    }

    logger.info(`Created ${chunks.length} chunks from ${segments.length} segments`);
    return chunks;
}

export function formatChunkForContext(chunk: TranscriptChunk): string {
    const startFormatted = formatSeconds(chunk.startTime);
    const endFormatted = formatSeconds(chunk.endTime);
    return `[${startFormatted} - ${endFormatted}]: ${chunk.text}`;
}

function formatSeconds(seconds: number): string {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hrs > 0) {
        return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}
