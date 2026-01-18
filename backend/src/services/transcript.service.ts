import axios from 'axios';
import { Transcript, ITranscriptSegment } from '../models/Transcript.model.js';
import { logger } from '../utils/logger.js';

const PYTHON_SERVICE_URL = process.env.PYTHON_SERVICE_URL || 'http://localhost:8000';

export interface TranscriptSegment {
    text: string;
    start: number;
    duration: number;
}

export async function extractTranscript(videoId: string): Promise<TranscriptSegment[]> {
    try {
        logger.info(`Extracting transcript for video: ${videoId}`);

        const response = await axios.post(`${PYTHON_SERVICE_URL}/extract-transcript`, {
            video_id: videoId,
        });

        if (!response.data.success) {
            throw new Error(response.data.error || 'Failed to extract transcript');
        }

        const segments: TranscriptSegment[] = response.data.segments;
        logger.info(`Extracted ${segments.length} transcript segments`);

        // Save to MongoDB
        await Transcript.findOneAndUpdate(
            { videoId },
            {
                videoId,
                segments: segments.map((s) => ({
                    text: s.text,
                    start: s.start,
                    duration: s.duration,
                })),
                language: response.data.language || 'en',
            },
            { upsert: true, new: true }
        );

        return segments;
    } catch (error) {
        if (axios.isAxiosError(error)) {
            throw new Error(`Transcript extraction failed: ${error.message}`);
        }
        throw error;
    }
}

export async function getTranscriptFromDB(videoId: string): Promise<ITranscriptSegment[] | null> {
    const transcript = await Transcript.findOne({ videoId });
    return transcript?.segments || null;
}
