import joblib
import numpy as np
from sklearn.metrics.pairwise import cosine_similarity
from app.schemas import Recommendation
from typing import List
import os

_model = None

def load_model():
    global _model
    if _model is None:
        model_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "model.joblib")
        _model = joblib.load(model_path)
    return _model

def get_recommendations(query: str, top_n: int = 10) -> List[Recommendation]:
    model = load_model()
    vectorizer = model["vectorizer"]
    tfidf_matrix = model["tfidf_matrix"]
    catalogue = model["catalogue"]

    query_vec = vectorizer.transform([query])
    scores = cosine_similarity(query_vec, tfidf_matrix).flatten()
    top_indices = np.argsort(scores)[::-1][:top_n]

    results = []
    for idx in top_indices:
        book = catalogue[idx]
        confidence = float(scores[idx])
        if confidence < 0.01:
            continue
        results.append(Recommendation(
            isbn=book["isbn"],
            title=book["title"],
            authors=book["authors"],
            confidence=round(confidence, 4),
        ))

    return results
