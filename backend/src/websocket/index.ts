import { Server, Socket } from 'socket.io';

let ioInstance: Server | null = null;

export function setupWebSocket(io: Server): void {
    ioInstance = io;

    io.on('connection', (socket: Socket) => {
        console.log(`Client connected: ${socket.id}`);

        socket.on('join:video', (videoId: string) => {
            socket.join(`video:${videoId}`);
            console.log(`Socket ${socket.id} joined video:${videoId}`);
        });

        socket.on('leave:video', (videoId: string) => {
            socket.leave(`video:${videoId}`);
            console.log(`Socket ${socket.id} left video:${videoId}`);
        });

        socket.on('disconnect', () => {
            console.log(`Client disconnected: ${socket.id}`);
        });
    });
}

export function emitIngestionProgress(
    videoId: string,
    progress: number,
    stage: string
): void {
    if (ioInstance) {
        ioInstance.to(`video:${videoId}`).emit('ingestion:progress', {
            videoId,
            progress,
            stage,
        });
    }
}

export function emitIngestionComplete(videoId: string, success: boolean): void {
    if (ioInstance) {
        ioInstance.to(`video:${videoId}`).emit('ingestion:complete', {
            videoId,
            success,
        });
    }
}

export function emitIngestionError(videoId: string, error: string): void {
    if (ioInstance) {
        ioInstance.to(`video:${videoId}`).emit('ingestion:error', {
            videoId,
            error,
        });
    }
}
