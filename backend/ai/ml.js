// Client for the Python ML service (resume classifier + ChromaDB embedding search).
// Every call returns null on failure so the app degrades to the local NLP engine.
const URL_ = () => process.env.ML_URL || "http://localhost:8000";
let up = null, checkedAt = 0;

async function call(path, { method = "GET", body, timeout = 4000 } = {}) {
  const ctrl = new AbortController(); const t = setTimeout(() => ctrl.abort(), timeout);
  try {
    const res = await fetch(URL_() + path, { method, signal: ctrl.signal, headers: { "content-type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
    if (!res.ok) throw new Error(String(res.status));
    up = true; checkedAt = Date.now();
    return await res.json();
  } catch (e) {
    if (up !== false) console.warn("[ml] service unavailable, using local NLP:", e.message);
    up = false; checkedAt = Date.now();
    return null;
  } finally { clearTimeout(t); }
}

const health = () => call("/health", { timeout: 2000 });
const metrics = () => call("/metrics");
const classify = (text, top_k = 3) => call("/classify", { method: "POST", body: { text: String(text).slice(0, 20000), top_k } });
const upsertJobs = (jobs) => call("/jobs/upsert", { method: "POST", body: { jobs }, timeout: 20000 });
const removeJob = (id) => call(`/jobs/${id}`, { method: "DELETE" });
const match = (text) => call("/match", { method: "POST", body: { text: String(text).slice(0, 20000) } });
const search = (query, k = 5) => call("/search", { method: "POST", body: { query: String(query).slice(0, 2000), k } });

/** Push the whole catalogue to the vector store (idempotent). Retries so start order doesn't matter. */
async function syncJobs(getJobs, tries = 10) {
  for (let i = 0; i < tries; i++) {
    const r = await upsertJobs(getJobs());
    if (r) return console.log(`[ml] indexed ${r.total} jobs in ChromaDB`);
    await new Promise((r2) => setTimeout(r2, 3000));
  }
}
module.exports = { health, metrics, classify, upsertJobs, removeJob, match, search, syncJobs };
