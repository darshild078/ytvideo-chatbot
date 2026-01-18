from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import os
from dotenv import load_dotenv

from .models import (
    TranscriptRequest,
    TranscriptResponse,
    EmbeddingRequest,
    EmbeddingResponse,
    HealthResponse,
)
from .transcript_extractor import extract_transcript
from .embedding_generator import load_model, generate_embeddings, get_embedding_dimension

load_dotenv()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Load ML model at startup."""
    load_model()
    yield


app = FastAPI(
    title="YouTube RAG Python Service",
    description="Transcript extraction and embedding generation",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Check service health and model status."""
    try:
        from .embedding_generator import _model
        return HealthResponse(status="healthy", model_loaded=_model is not None)
    except Exception:
        return HealthResponse(status="healthy", model_loaded=False)


@app.post("/extract-transcript", response_model=TranscriptResponse)
async def extract_transcript_endpoint(request: TranscriptRequest):
    """Extract transcript from a YouTube video."""
    try:
        segments, language = extract_transcript(request.video_id)
        return TranscriptResponse(
            success=True,
            segments=segments,
            language=language,
        )
    except ValueError as e:
        return TranscriptResponse(success=False, error=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/generate-embeddings", response_model=EmbeddingResponse)
async def generate_embeddings_endpoint(request: EmbeddingRequest):
    """Generate embeddings for a list of texts."""
    try:
        if not request.texts:
            return EmbeddingResponse(
                success=False,
                error="No texts provided",
            )
        
        embeddings = generate_embeddings(request.texts)
        return EmbeddingResponse(
            success=True,
            embeddings=embeddings,
            dimensions=get_embedding_dimension(),
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
