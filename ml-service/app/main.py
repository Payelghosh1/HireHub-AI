"""HireHub ML service (FastAPI): resume classifier, embedding search over ChromaDB, model card."""
import json, subprocess, sys
import joblib, numpy as np
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from .config import ARTIFACTS, ROOT
from .store import JobStore

def ensure_trained():
    if not (ARTIFACTS / "classifier.joblib").exists():
        print("[ml] no trained model found - training now (~1 min)...")
        subprocess.check_call([sys.executable, "-m", "app.train"], cwd=ROOT)

ensure_trained()
clf = joblib.load(ARTIFACTS / "classifier.joblib")
embedder = joblib.load(ARTIFACTS / "embedder.joblib")
metrics = json.load(open(ARTIFACTS / "metrics.json"))
store = JobStore(embedder)
tfidf, lr = clf.steps[0][1], clf.steps[1][1]
FEATURES = np.array(tfidf.get_feature_names_out())

app = FastAPI(title="HireHub ML Service", version="1.0")

class Text(BaseModel):
    text: str = Field(min_length=1, max_length=20000)
    top_k: int = Field(3, ge=1, le=10)

class Search(BaseModel):
    query: str = Field(min_length=1, max_length=2000)
    k: int = Field(5, ge=1, le=50)

class Jobs(BaseModel):
    jobs: list[dict]

@app.get("/health")
def health():
    return {"status": "ok", "classifier": metrics["chosen_model"], "accuracy": metrics["accuracy"], "jobs_indexed": store.count(), "embedder": "TF-IDF + TruncatedSVD (LSA, 96-d)", "vector_store": "ChromaDB"}

@app.get("/metrics")
def get_metrics():
    return metrics

@app.post("/classify")
def classify(body: Text):
    proba = clf.predict_proba([body.text])[0]
    order = np.argsort(-proba)[: body.top_k]
    top = lr.classes_[order[0]]
    # Explainability: which terms pushed the model toward the top class (coef x tf-idf weight)
    x = tfidf.transform([body.text]); row = x.tocoo()
    contrib = {FEATURES[c]: float(v * lr.coef_[order[0], c]) for c, v in zip(row.col, row.data)}
    terms = [t for t, v in sorted(contrib.items(), key=lambda kv: -kv[1]) if v > 0][:6]
    return {"predictions": [{"role": str(lr.classes_[i]), "probability": round(float(proba[i]), 4)} for i in order],
            "top_role": str(top), "evidence_terms": terms}

@app.post("/jobs/upsert")
def upsert(body: Jobs):
    return {"indexed": store.upsert(body.jobs), "total": store.count()}

@app.delete("/jobs/{job_id}")
def delete(job_id: int):
    store.delete(job_id); return {"total": store.count()}

@app.post("/match")
def match(body: Text):
    """Rank indexed jobs by embedding similarity to a resume/profile text."""
    return {"matches": store.query(body.text, k=100)[: 100]}

@app.post("/search")
def search(body: Search):
    """Retrieval step for RAG: nearest jobs to a natural-language query."""
    return {"results": store.query(body.query, k=body.k)}
