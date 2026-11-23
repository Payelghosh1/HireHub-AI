# HireHub — AI-powered recruitment platform
*AI-powered full-stack recruitment platform: trained ML models, vector search, RAG and LLM in one product.*

A recruitment platform where **trained ML models, vector search and an LLM** drive the product:
candidates get explainable job matches and resume feedback, recruiters get AI-ranked applicants.

```
 React (Vite)  ──►  Node/Express API  ──►  SQLite (users, jobs, applications)
   :5173              :5001   │  JWT + bcrypt, roles (candidate / recruiter)
                              │
                              ├──►  Python ML service (FastAPI)  :8000
                              │       • resume → role classifier  (TF-IDF + Logistic Regression, trained here)
                              │       • job embeddings (LSA, 96-d) stored in ChromaDB → semantic search
                              │
                              └──►  Claude API (optional) — explanations, chat, interview prep, job posts
```

## What is "real AI" here
| Component | What it is | Where |
|---|---|---|
| **Resume → role classifier** | TF-IDF (1–2 grams) + Logistic Regression, compared against Naive Bayes, Linear SVM and a majority baseline (5-fold CV + held-out test). Returns probabilities and the **evidence terms** behind each prediction. | `ml-service/app/train.py`, `/classify` |
| **Embeddings + vector DB** | TF-IDF → TruncatedSVD (LSA) trained on the corpus; job vectors stored in **ChromaDB**; resume↔job cosine search. Evaluated against a plain TF-IDF baseline. | `ml-service/app/store.py`, `/match`, `/search` |
| **Explainable match score** | 60% skill coverage + 25% embedding similarity + 15% eligibility (CGPA/branch) → shows matched / missing skills. | `backend/ai/nlp.js` |
| **RAG career assistant** | ChromaDB retrieves the most relevant jobs, the LLM answers *only* from them and cites the listings. | `backend/ai/aiRoutes.js` `/chat` |
| **LLM features** (optional `ANTHROPIC_API_KEY`) | Match explanations, interview prep, resume feedback, job-post generator. Prompt-injection-safe prompts; automatic fallback to templates. | `backend/ai/llm.js` |
| **AI applicant ranking** | Recruiters see applicants ranked by fit with reasons. | `/recruiter/applicants` |
| **Model Card page** | Live metrics, model comparison, per-role precision/recall. | `/ai/model` |

## Full-stack features
JWT auth (bcrypt, 7-day tokens, OTP signup), role-based access (candidates apply, recruiters post & see applicants),
persistent SQLite database, 70 seeded jobs, job search/pagination, real dashboards, duplicate-application protection,
rate-limited AI endpoints, upload limits, Docker setup, unit + integration tests.

## Turn on the Claude LLM (30 seconds)
Everything above works without a key (ML models + ChromaDB + template text). To make the **chatbot answers, interview prep, resume feedback, match explanations and job-post generator** written by Claude:
1. Create an API key at console.anthropic.com.
2. Put it in `backend/.env`:  `ANTHROPIC_API_KEY=sk-ant-...`  (optional: `AI_MODEL=claude-sonnet-5-5`)
3. Run `cd backend && npm run check-llm` — it prints **✓ LLM is ACTIVE** and a sample reply.
4. Restart the backend. Badges in the app change from “⚙ Local NLP” to “✦ Claude”, and `/api/ai/status` shows `llm: true`.

If the API ever fails, every feature automatically falls back to the local version.

## Run it
**One command (Python 3.10+, Node 18+):**
```bash
./run-all.sh          # ML :8000, API :5001, web :5173  → open http://localhost:5173
```
**Or with Docker:** `docker compose up --build`  *(Dockerfiles included; not run in the authoring sandbox — see Honest notes.)*

**Windows:** `run-all.sh` needs Git Bash/WSL — otherwise use the manual steps below in three terminals (use `python -m venv .venv` then `.venv\Scripts\activate`).

**Manually**
```bash
cd ml-service && pip install -r requirements.txt && python -m app.train && uvicorn app.main:app --port 8000
cd backend    && cp .env.example .env && npm install && npm start
cd frontend   && npm install && npm run dev
```
Optional: put `ANTHROPIC_API_KEY=...` in `backend/.env` to enable Claude. Set a long random `JWT_SECRET`.

**Demo logins** (created on first start): candidate `payel@demo.com` · recruiter `recruiter@demo.com` · password `demo1234`. The recruiter already has a *Machine Learning Engineer* job with 8 sample applicants to rank. Set `SEED_DEMO=false` to disable.

**Try the flow:** register a *recruiter* → Post Job (use “Generate with AI”) → log out → register a *candidate* (OTP is shown on screen in dev) →
upload a CV in onboarding → Jobs are ranked for you → open a job → *Analyse my fit* → Apply → log back in as the recruiter → *AI-ranked Applicants*.

## Tests
```bash
cd backend && npm test              # NLP unit tests + LLM-path tests (against a local stand-in for Anthropic's API)
node test/api.test.js               # integration: auth, roles, ML, RAG, apply, ranking (needs services running)
cd ml-service && python -m app.train   # prints model comparison + retrieval metrics
```

## Honest notes (read before putting numbers on a CV)
- **Training data is synthetic** (`ml-service/app/synth.py`) because the real Kaggle dataset could not be downloaded in the build environment. The ~99% classifier accuracy is therefore a *pipeline sanity check*, not real-world accuracy (resume project sentences leak the role). **Retrain on real data:** download Kaggle's *Resume Dataset* (`UpdatedResumeDataSet.csv`) and run `python -m app.train --csv UpdatedResumeDataSet.csv` — the Model Card page then shows your real numbers. Report those.
- Embeddings are **LSA trained locally**, not a pretrained transformer (model downloads were blocked). To upgrade, swap the embedder in `train.py` for `sentence-transformers` (e.g. `all-MiniLM-L6-v2`); the Chroma store and API stay unchanged.
- Database is **SQLite** (`sql.js`, pure JavaScript, saved to `backend/data/hirehub.db`) because MongoDB/Postgres servers were unavailable. All SQL is isolated in `backend/db.js` for an easy swap.
- OTP delivery is simulated (shown on screen). Plug in an email/SMS provider for production.
- Docker files were written but **not executed** in the sandbox. Everything else was run and tested.
- **The Claude LLM was never run with a real key** (none available when this was built). The LLM code path is tested against a local stand-in server (request format, JSON parsing, RAG context sent to the model, fallback on error) — but answer *quality* from the real model is unverified until you run `npm run check-llm` with your own key.

## Resume bullets (adjust the numbers to your real-data run)
- Built **HireHub**, a full-stack recruitment platform (React, Node/Express, FastAPI, SQLite, ChromaDB) with JWT/role-based auth and Docker deployment.
- Trained and evaluated a resume→role classifier (TF-IDF + Logistic Regression vs. NB/SVM baselines, 5-fold CV) and exposed it with per-prediction explanations via a FastAPI microservice.
- Implemented embedding-based job retrieval in ChromaDB (+X% top-1 hit rate over a TF-IDF baseline) powering an explainable match score and a RAG career assistant with LLM fallback.

## Troubleshooting
- **"Cannot reach the HireHub API…" / "Could not analyse the resume. Is the backend running?"** — the backend isn't running or the port is wrong. Start it (`cd backend && npm start`) and check `curl http://localhost:5001/api/health`.
- **macOS:** port 5000 is used by *AirPlay Receiver*, so this project uses **5001**. If 5001 is also busy, set `PORT=` in `backend/.env` and `VITE_API_URL=http://localhost:<port>/api` when starting the frontend.
- **Backend exits immediately:** you need Node.js ≥ 18 (`node -v`).
- **AI shows "Local NLP" / no role prediction:** the ML service isn't running (`cd ml-service && python -m uvicorn app.main:app --port 8000`); the first start trains the model (~1 min).

**Not sure what's wrong? Run `node doctor.js`** (from the project folder) — it checks Node, Python, installed packages and which services are running, and prints the exact command to fix each problem.

## Standalone resume checker (no install)

`standalone/resume-check.html` is a single file: double-click it to open in any browser, upload a PDF/DOCX/TXT resume and see predicted roles, skills, matching jobs and skills to learn. It runs the exported trained model fully in the browser (no backend needed). It is a lighter version of the full app (no accounts, ChromaDB or chat). `template.html` + `build.py` regenerate it.
