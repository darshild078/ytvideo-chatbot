import { create } from 'zustand';
import type { TranscriptSegment } from '../types';

interface VideoState {
    videoId: string | null;
    isIndexed: boolean;
    isLoading: boolean;
    progress: number;
    progressStage: string;
    transcript: TranscriptSegment[];
    currentTime: number;
    error: string | null;

    setVideoId: (id: string | null) => void;
    setIndexed: (indexed: boolean) => void;
    setLoading: (loading: boolean) => void;
    setProgress: (progress: number, stage: string) => void;
    setTranscript: (transcript: TranscriptSegment[]) => void;
    setCurrentTime: (time: number) => void;
    setError: (error: string | null) => void;
    reset: () => void;
}

export const useVideoStore = create<VideoState>((set) => ({
    videoId: null,
    isIndexed: false,
    isLoading: false,
    progress: 0,
    progressStage: '',
    transcript: [],
    currentTime: 0,
    error: null,

    setVideoId: (id) => set({ videoId: id, error: null }),
    setIndexed: (indexed) => set({ isIndexed: indexed }),
    setLoading: (loading) => set({ isLoading: loading }),
    setProgress: (progress, stage) => set({ progress, progressStage: stage }),
    setTranscript: (transcript) => set({ transcript }),
    setCurrentTime: (time) => set({ currentTime: time }),
    setError: (error) => set({ error, isLoading: false }),
    reset: () => set({
        videoId: null,
        isIndexed: false,
        isLoading: false,
        progress: 0,
        progressStage: '',
        transcript: [],
        currentTime: 0,
        error: null,
    }),
}));
