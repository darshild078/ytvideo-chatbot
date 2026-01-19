import axios from 'axios';
import type { AnalyzeResponse, QueryResponse, VideoStatus, TranscriptSegment } from '../types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
    baseURL: API_URL,
    timeout: 60000,
    headers: {
        'Content-Type': 'application/json',
    },
});

api.interceptors.response.use(
    (response) => response,
    (error) => {
        const message = error.response?.data?.error || error.message || 'An error occurred';
        return Promise.reject(new Error(message));
    }
);

export async function analyzeVideo(url: string): Promise<AnalyzeResponse> {
    const response = await api.post<AnalyzeResponse>('/video/analyze', { url });
    return response.data;
}

export async function getVideoStatus(videoId: string): Promise<VideoStatus> {
    const response = await api.get<{ success: boolean } & VideoStatus>(`/video/${videoId}/status`);
    return response.data;
}

export async function getTranscript(videoId: string): Promise<TranscriptSegment[]> {
    const response = await api.get<{ success: boolean; transcript: TranscriptSegment[] }>(
        `/video/${videoId}/transcript`
    );
    return response.data.transcript;
}

export async function sendQuery(
    videoId: string,
    question: string,
    sessionId?: string
): Promise<QueryResponse> {
    const response = await api.post<QueryResponse>('/chat/query', {
        videoId,
        question,
        sessionId,
    });
    return response.data;
}

export async function getChatHistory(
    videoId: string,
    sessionId: string
): Promise<{ messages: Array<{ role: string; content: string; timestamp?: number }> }> {
    const response = await api.get(`/chat/history/${videoId}/${sessionId}`);
    return response.data;
}

export default api;
