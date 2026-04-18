from fastapi import FastAPI, HTTPException, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
from app.schemas import PredictRequest, PredictResponse, Recommendation
from app.model import get_recommendations
import os

app = FastAPI(title="LibraIQ ML Service", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["POST", "GET"],
    allow_headers=["*"],
)

ML_SECRET = os.environ.get("ML_SERVICE_SECRET", "")

def verify_token(authorization: str = Header(...)):
    if not ML_SECRET:
        return  # No secret configured in dev
    expected = f"Bearer {ML_SECRET}"
    if authorization != expected:
        raise HTTPException(status_code=401, detail="Unauthorized")

@app.get("/health")
def health():
    return {"status": "ok", "model_version": "1.0.0"}

@app.post("/predict", response_model=PredictResponse, dependencies=[Depends(verify_token)])
def predict(req: PredictRequest):
    query = req.description or req.genre or ""
    if not query.strip():
        raise HTTPException(status_code=400, detail="Provide genre or description")

    recs = get_recommendations(query, top_n=10)
    return PredictResponse(recommendations=recs, model_version="1.0.0")
