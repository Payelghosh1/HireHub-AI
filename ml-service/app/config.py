import os
from pathlib import Path
ROOT = Path(__file__).resolve().parent.parent
ARTIFACTS = Path(os.getenv("ML_ARTIFACTS", ROOT / "artifacts")); ARTIFACTS.mkdir(exist_ok=True, parents=True)
CHROMA_DIR = os.getenv("CHROMA_DIR", str(ROOT / "chroma_db"))
JOBS_SEED = ROOT / "data" / "jobs.json"
TOKEN_PATTERN = r"[A-Za-z0-9+#./]{2,}"
