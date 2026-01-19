export interface TranscriptSegment {
    text: string;
    start: number;
    duration: number;
}

export interface SecondaryTimestamp {
    time: number;
    formatted: string;
    topic: string;
}

export interface ChatMessage {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp?: number;
    formattedTime?: string;
    confidence?: number;
    secondaryTimestamps?: SecondaryTimestamp[];
    createdAt: Date;
}

export interface QueryMetrics {
    embeddingTime: number;
    vectorSearchTime: number;
    stage1Time: number;
    stage2Time: number;
    totalTime: number;
    chunksRetrieved: number;
    chunksFiltered: number;
}

export interface VideoStatus {
    status: 'not_found' | 'queued' | 'processing' | 'completed' | 'failed' | 'already_indexed';
    progress: number;
    chunkCount?: number;
    title?: string;
    message?: string;
}

export interface QueryResponse {
    success: boolean;
    sessionId: string;
    answer: string;
    primaryTimestamp: number;
    formattedTime: string;
    confidence: number;
    context: string;
    secondaryTimestamps: SecondaryTimestamp[];
    metrics: QueryMetrics;
}

export interface AnalyzeResponse {
    success: boolean;
    videoId: string;
    jobId?: string;
    status: string;
    message: string;
    chunkCount?: number;
}

export interface IngestionProgress {
    videoId: string;
    progress: number;
    stage: string;
}
