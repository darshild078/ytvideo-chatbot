from pydantic import BaseModel
from typing import List, Optional


class TranscriptRequest(BaseModel):
    video_id: str


class TranscriptSegment(BaseModel):
    text: str
    start: float
    duration: float


class TranscriptResponse(BaseModel):
    success: bool
    segments: List[TranscriptSegment] = []
    error: Optional[str] = None
    language: str = "en"


class EmbeddingRequest(BaseModel):
    texts: List[str]


class EmbeddingResponse(BaseModel):
    success: bool
    embeddings: List[List[float]] = []
    error: Optional[str] = None
    dimensions: int = 384


class HealthResponse(BaseModel):
    status: str
    model_loaded: bool
