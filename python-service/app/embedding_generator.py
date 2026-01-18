from sentence_transformers import SentenceTransformer
from typing import List
import numpy as np

# Global model instance (loaded once at startup)
_model: SentenceTransformer = None


def load_model() -> SentenceTransformer:
    """Load the embedding model into memory."""
    global _model
    if _model is None:
        print("Loading sentence-transformers model...")
        _model = SentenceTransformer('all-MiniLM-L6-v2')
        print("Model loaded successfully!")
    return _model


def get_model() -> SentenceTransformer:
    """Get the loaded model instance."""
    if _model is None:
        raise RuntimeError("Model not loaded. Call load_model() first.")
    return _model


def generate_embeddings(texts: List[str], batch_size: int = 32) -> List[List[float]]:
    """Generate embeddings for a list of texts."""
    model = get_model()
    
    # Generate embeddings in batches
    embeddings = model.encode(
        texts,
        batch_size=batch_size,
        show_progress_bar=len(texts) > 10,
        convert_to_numpy=True
    )
    
    # Convert numpy arrays to lists
    if isinstance(embeddings, np.ndarray):
        return embeddings.tolist()
    return [emb.tolist() for emb in embeddings]


def get_embedding_dimension() -> int:
    """Return the embedding dimension for the loaded model."""
    return 384  # all-MiniLM-L6-v2 dimensionality
