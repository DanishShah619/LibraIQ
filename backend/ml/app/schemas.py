from pydantic import BaseModel
from typing import Optional, List

class PredictRequest(BaseModel):
    genre: Optional[str] = None
    description: Optional[str] = None

class Recommendation(BaseModel):
    isbn: str
    title: str
    authors: str
    confidence: float

class PredictResponse(BaseModel):
    recommendations: List[Recommendation]
    model_version: str
