import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { connectDatabase } from './config/database.js';
import { initializePinecone } from './config/pinecone.js';
import videoRoutes from './routes/video.routes.js';
import chatRoutes from './routes/chat.routes.js';
import { errorHandler } from './middleware/errorHandler.js';
import { setupWebSocket } from './websocket/index.js';
import './queues/ingestion.queue.js'; // Import to register queue processor

const app = express();
const httpServer = createServer(app);

const io = new Server(httpServer, {
    cors: {
        origin: process.env.FRONTEND_URL || 'http://localhost:5173',
        methods: ['GET', 'POST'],
    },
});

app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
}));
app.use(express.json());

app.get('/health', (_req, res) => {
    res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

app.use('/api/video', videoRoutes);
app.use('/api/chat', chatRoutes);

app.use(errorHandler);

setupWebSocket(io);

const PORT = process.env.PORT || 5000;

async function startServer() {
    try {
        await connectDatabase();
        await initializePinecone();

        httpServer.listen(PORT, () => {
            console.log(`🚀 Server running on http://localhost:${PORT}`);
            console.log(`📡 WebSocket ready`);
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}

startServer();

export { io };
