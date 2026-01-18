# YouTube RAG Chatbot

A production-ready YouTube video chatbot with timestamp-based playback navigation using a two-stage RAG pipeline.

## Features

- 🎬 YouTube video embedding with IFrame API playback control
- 💬 Real-time chat interface for asking questions about video content
- 🤖 Two-stage RAG pipeline (Llama 3.1 8B → Llama 3.3 70B) for token-optimized retrieval
- ⏱️ Timestamp-based video navigation with confirmation dialogs
- 📝 Transcript viewer with auto-scroll and highlighting
- 🔄 Background job processing with progress tracking
- 🔍 Vector similarity search using embeddings

## Tech Stack

### Frontend
- React 18 + TypeScript
- Vite
- Tailwind CSS
- Socket.io-client
- Zustand

### Backend
- Node.js + Express + TypeScript
- MongoDB (Mongoose)
- Pinecone Vector DB
- Bull (Redis job queue)
- Socket.io
- Groq SDK

### Python Microservice
- FastAPI
- youtube-transcript-api
- sentence-transformers (all-MiniLM-L6-v2)

## Prerequisites

- Node.js 20+
- Python 3.10+
- Redis (local or Upstash)
- MongoDB Atlas account (free tier)
- Pinecone account (free tier)
- Groq API key (free, no credit card)

## Setup

### 1. Clone and Install Dependencies

```bash
# Frontend
cd frontend
npm install

# Backend
cd ../backend
npm install

# Python service
cd ../python-service
python -m venv venv
.\venv\Scripts\activate  # Windows
# source venv/bin/activate  # Linux/Mac
pip install -r requirements.txt
```

### 2. Configure Environment Variables

Copy `.env.example` to `.env` in each directory and fill in your credentials:

**Backend (.env)**
- `MONGODB_URI` - MongoDB connection string
- `PINECONE_API_KEY` - Pinecone API key
- `GROQ_API_KEY` - Groq API key (starts with gsk_)
- `REDIS_HOST`, `REDIS_PORT` - Redis connection

**Frontend (.env)**
- `VITE_API_URL=http://localhost:5000/api`
- `VITE_WS_URL=http://localhost:5000`

### 3. External Service Setup

#### MongoDB Atlas
1. Sign up at https://www.mongodb.com/cloud/atlas/register
2. Create free M0 cluster
3. Database Access → Add user
4. Network Access → Add 0.0.0.0/0
5. Connect → Get connection string

#### Pinecone
1. Sign up at https://app.pinecone.io/
2. Create free Starter project
3. Create index: name=`youtube-transcripts`, dimensions=`384`, metric=`cosine`
4. Copy API key

#### Groq (FREE, no credit card)
1. Sign up at https://console.groq.com/
2. API Keys → Create new key

### 4. Run the Application

```bash
# Terminal 1: Redis (if local)
redis-server

# Terminal 2: Python service
cd python-service
.\venv\Scripts\activate
uvicorn app.main:app --reload --port 8000

# Terminal 3: Backend
cd backend
npm run dev

# Terminal 4: Frontend
cd frontend
npm run dev
```

The app will be available at http://localhost:5173

## Project Structure

```
youtube-rag-chatbot/
├── frontend/                 # React Frontend
│   ├── src/
│   │   ├── components/      # UI components
│   │   ├── services/        # API & WebSocket clients
│   │   ├── stores/          # Zustand state management
│   │   └── types/           # TypeScript interfaces
│   └── ...
├── backend/                  # Node.js Backend
│   ├── src/
│   │   ├── config/          # Database & API configs
│   │   ├── models/          # Mongoose schemas
│   │   ├── services/        # RAG pipeline & business logic
│   │   ├── controllers/     # HTTP request handlers
│   │   ├── routes/          # Express routes
│   │   ├── queues/          # Bull job queue
│   │   └── websocket/       # Socket.io server
│   └── ...
└── python-service/           # Python Microservice
    ├── app/
    │   ├── main.py          # FastAPI app
    │   ├── transcript_extractor.py
    │   └── embedding_generator.py
    └── ...
```

## API Endpoints

### Video API
- `POST /api/video/analyze` - Submit YouTube URL for processing
- `GET /api/video/:videoId/status` - Check ingestion status
- `GET /api/video/:videoId/transcript` - Get full transcript

### Chat API
- `POST /api/chat/query` - Ask a question about a video
- `GET /api/chat/history/:videoId/:sessionId` - Get chat history

### Python Service
- `GET /health` - Health check
- `POST /extract-transcript` - Extract YouTube transcript
- `POST /generate-embeddings` - Generate text embeddings

## License

MIT
