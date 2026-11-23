"""Vector store: ChromaDB (persistent) holding job embeddings produced by our trained LSA embedder."""
import chromadb
from .config import CHROMA_DIR

class JobStore:
    def __init__(self, embedder):
        self.embedder = embedder
        self.client = chromadb.PersistentClient(path=CHROMA_DIR)
        self.col = self.client.get_or_create_collection("jobs", metadata={"hnsw:space": "cosine"})

    @staticmethod
    def text(j):
        return " ".join([j.get("title", ""), " ".join(j.get("skills", []) or []), j.get("description", "") or "", j.get("requirements", "") or ""])

    def upsert(self, jobs):
        if not jobs: return 0
        vecs = self.embedder.transform([self.text(j) for j in jobs])
        self.col.upsert(
            ids=[str(j["id"]) for j in jobs], embeddings=vecs.tolist(), documents=[self.text(j) for j in jobs],
            metadatas=[{"title": j.get("title", ""), "company": j.get("company", ""), "type": j.get("type", ""),
                        "skills": ", ".join(j.get("skills", []) or [])} for j in jobs])
        return len(jobs)

    def delete(self, job_id):
        self.col.delete(ids=[str(job_id)])

    def count(self):
        return self.col.count()

    def query(self, text, k=10):
        n = self.count()
        if n == 0: return []
        q = self.embedder.transform([text]).tolist()
        r = self.col.query(query_embeddings=q, n_results=min(k, n))
        return [{"id": int(i), "similarity": round(max(0.0, 1 - d), 4), **m}
                for i, d, m in zip(r["ids"][0], r["distances"][0], r["metadatas"][0])]
