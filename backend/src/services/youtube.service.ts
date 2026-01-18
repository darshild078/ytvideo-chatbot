import axios from 'axios';
import { logger } from '../utils/logger.js';

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
const YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3';

export interface YouTubeVideoMetadata {
    videoId: string;
    title: string;
    description: string;
    channelId: string;
    channelName: string;
    subscriberCount: number;
    viewCount: number;
    likeCount: number;
    publishedAt: Date;
    duration: string;
    thumbnailUrl: string;
}

export async function fetchVideoMetadata(videoId: string): Promise<YouTubeVideoMetadata> {
    if (!YOUTUBE_API_KEY) {
        throw new Error('YOUTUBE_API_KEY is not set in environment variables');
    }

    try {
        logger.info(`Fetching metadata for video: ${videoId}`);

        // Fetch video details
        const videoResponse = await axios.get(`${YOUTUBE_API_BASE}/videos`, {
            params: {
                part: 'snippet,statistics,contentDetails',
                id: videoId,
                key: YOUTUBE_API_KEY,
            },
        });

        if (!videoResponse.data.items || videoResponse.data.items.length === 0) {
            throw new Error('Video not found or is private');
        }

        const videoData = videoResponse.data.items[0];
        const channelId = videoData.snippet.channelId;

        // Fetch channel details for subscriber count
        const channelResponse = await axios.get(`${YOUTUBE_API_BASE}/channels`, {
            params: {
                part: 'statistics',
                id: channelId,
                key: YOUTUBE_API_KEY,
            },
        });

        const channelStats = channelResponse.data.items[0]?.statistics || {};

        const metadata: YouTubeVideoMetadata = {
            videoId,
            title: videoData.snippet.title,
            description: videoData.snippet.description,
            channelId: channelId,
            channelName: videoData.snippet.channelTitle,
            subscriberCount: parseInt(channelStats.subscriberCount || '0', 10),
            viewCount: parseInt(videoData.statistics.viewCount || '0', 10),
            likeCount: parseInt(videoData.statistics.likeCount || '0', 10),
            publishedAt: new Date(videoData.snippet.publishedAt),
            duration: videoData.contentDetails.duration,
            thumbnailUrl: videoData.snippet.thumbnails.high?.url || videoData.snippet.thumbnails.default?.url,
        };

        logger.info(`Fetched metadata for video: ${videoData.snippet.title} by ${metadata.channelName}`);
        return metadata;
    } catch (error) {
        if (axios.isAxiosError(error)) {
            const status = error.response?.status;
            if (status === 403) {
                throw new Error('YouTube API quota exceeded or invalid API key');
            } else if (status === 404) {
                throw new Error('Video not found');
            }
            throw new Error(`YouTube API error: ${error.message}`);
        }
        throw error;
    }
}
