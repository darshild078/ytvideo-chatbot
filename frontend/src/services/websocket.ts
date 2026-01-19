import { io, Socket } from 'socket.io-client';
import type { IngestionProgress } from '../types';

const WS_URL = import.meta.env.VITE_WS_URL || 'http://localhost:5000';

let socket: Socket | null = null;

export function connectWebSocket(): Socket {
    if (socket?.connected) {
        return socket;
    }

    socket = io(WS_URL, {
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
    });

    socket.on('connect', () => {
        console.log('WebSocket connected');
    });

    socket.on('disconnect', () => {
        console.log('WebSocket disconnected');
    });

    socket.on('connect_error', (error) => {
        console.error('WebSocket connection error:', error);
    });

    return socket;
}

export function joinVideoRoom(videoId: string): void {
    if (socket?.connected) {
        socket.emit('join:video', videoId);
    }
}

export function leaveVideoRoom(videoId: string): void {
    if (socket?.connected) {
        socket.emit('leave:video', videoId);
    }
}

export function onIngestionProgress(callback: (data: IngestionProgress) => void): void {
    socket?.on('ingestion:progress', callback);
}

export function onIngestionComplete(callback: (data: { videoId: string; success: boolean }) => void): void {
    socket?.on('ingestion:complete', callback);
}

export function onIngestionError(callback: (data: { videoId: string; error: string }) => void): void {
    socket?.on('ingestion:error', callback);
}

export function removeAllListeners(): void {
    socket?.off('ingestion:progress');
    socket?.off('ingestion:complete');
    socket?.off('ingestion:error');
}

export function disconnectWebSocket(): void {
    if (socket) {
        socket.disconnect();
        socket = null;
    }
}

export function getSocket(): Socket | null {
    return socket;
}
