import { create } from 'zustand';
import type { ChatMessage, SecondaryTimestamp } from '../types';

interface ChatState {
    messages: ChatMessage[];
    sessionId: string | null;
    isLoading: boolean;
    pendingTimestamp: { time: number; formatted: string } | null;

    addUserMessage: (content: string) => void;
    addAssistantMessage: (
        content: string,
        timestamp?: number,
        formattedTime?: string,
        confidence?: number,
        secondaryTimestamps?: SecondaryTimestamp[]
    ) => void;
    setLoading: (loading: boolean) => void;
    setSessionId: (id: string) => void;
    setPendingTimestamp: (timestamp: { time: number; formatted: string } | null) => void;
    clearMessages: () => void;
}

export const useChatStore = create<ChatState>((set) => ({
    messages: [],
    sessionId: null,
    isLoading: false,
    pendingTimestamp: null,

    addUserMessage: (content) =>
        set((state) => ({
            messages: [
                ...state.messages,
                {
                    id: `user_${Date.now()}`,
                    role: 'user',
                    content,
                    createdAt: new Date(),
                },
            ],
        })),

    addAssistantMessage: (content, timestamp, formattedTime, confidence, secondaryTimestamps) =>
        set((state) => ({
            messages: [
                ...state.messages,
                {
                    id: `assistant_${Date.now()}`,
                    role: 'assistant',
                    content,
                    timestamp,
                    formattedTime,
                    confidence,
                    secondaryTimestamps,
                    createdAt: new Date(),
                },
            ],
        })),

    setLoading: (loading) => set({ isLoading: loading }),
    setSessionId: (id) => set({ sessionId: id }),
    setPendingTimestamp: (timestamp) => set({ pendingTimestamp: timestamp }),
    clearMessages: () => set({ messages: [], sessionId: null }),
}));
