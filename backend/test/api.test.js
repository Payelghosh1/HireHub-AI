// Integration test. Start ml-service and backend first, then: node test/api.test.js
const assert = require("assert");
const fs = require("fs"), os = require("os"), path = require("path");
const B = process.env.API || "http://localhost:5001/api";
const j = async (m, p, body, token, form) => {
  const r = await fetch(B + p, { method: m, headers: { ...(form ? {} : { "content-type": "application/json" }), ...(token ? { authorization: "Bearer " + token } : {}) }, body: form || (body ? JSON.stringify(body) : undefined) });
  return { status: r.status, data: await r.json().catch(() => ({})) };
};
const signup = async (name, role) => {
  const contact = `${name}${Date.now()}@test.com`;
  const { data: o } = await j("POST", "/auth/send-otp", { contact });
  const { data } = await j("POST", "/auth/register", { name, contact, password: "secret1", role, otp: o.devOtp });
  return { token: data.token, contact };
};
(async () => {
  const cand = await signup("Asha", "candidate"), rec = await signup("Boss", "recruiter");
  assert.strictEqual((await j("POST", "/jobs", { title: "x" }, cand.token)).status, 403, "candidate must not post jobs");
  assert.strictEqual((await j("GET", "/ai/rank-applicants?jobId=1", null, cand.token)).status, 403);
  assert.strictEqual((await j("POST", "/auth/login", { contact: cand.contact, password: "nope" })).status, 401);

  const posted = await j("POST", "/jobs", { title: "LLM Engineer", company: "Acme", location: "Remote", skills: "Python, LLM, RAG, LangChain", description: "Build RAG assistants", cgpa: "6" }, rec.token);
  assert.strictEqual(posted.status, 201); const jobId = posted.data.job.id;

  const resume = "Skills: Python, LLM, RAG, LangChain, FastAPI, Prompt Engineering\nProjects:\n- Built RAG assistant over documents with LangChain.\nEducation: B.Tech CSE CGPA 8.4";
  const f = new FormData(); f.append("cv", new Blob([resume]), "cv.txt");
  const parsed = await j("POST", "/ai/parse-resume", null, null, f);
  assert.strictEqual(parsed.status, 200);
  assert(parsed.data.roleModel, "ML classifier should respond");
  assert(["AI Engineer", "Machine Learning Engineer"].includes(parsed.data.roleModel.top_role), "got " + parsed.data.roleModel.top_role);

  const form = new FormData();
  Object.entries({ jobId, name: "Asha", college: "X", degree: "B.Tech", subject: "CSE", cgpa: "8.4", graduationYear: "2026", skills: "Python, LLM, RAG, LangChain", projects: "RAG assistant", experience: "" }).forEach(([k, v]) => form.append(k, v));
  form.append("cv", new Blob([resume]), "cv.txt");
  const app1 = await j("POST", "/applications", null, cand.token, form);
  assert.strictEqual(app1.status, 200, JSON.stringify(app1.data)); assert(app1.data.score >= 70, "score " + app1.data.score);
  const form2 = new FormData(); Object.entries({ jobId, name: "Asha" }).forEach(([k, v]) => form2.append(k, v));
  assert.strictEqual((await j("POST", "/applications", null, cand.token, form2)).status, 409, "duplicate apply blocked");

  const ranked = await j("GET", `/ai/rank-applicants?jobId=${jobId}`, null, rec.token);
  assert.strictEqual(ranked.data.applicants.length, 1); assert(ranked.data.applicants[0].score >= 70);
  const stats = await j("GET", "/stats", null, cand.token); assert.strictEqual(stats.data.applications, 1);
  const chat = await j("POST", "/ai/chat", { message: "any LLM or RAG jobs for me?", profile: { skills: "Python, LLM" } });
  assert.strictEqual(chat.data.retrieval, "chroma"); assert(chat.data.sources.length);
  const all = await j("POST", "/ai/match-all", { profile: { skills: "Python, LLM, RAG" } });
  assert.strictEqual(all.data.semanticSource, "embeddings");
  console.log("API integration tests passed ✓", { score: app1.data.score, role: parsed.data.roleModel.top_role, retrieval: chat.data.retrieval });
})().catch((e) => { console.error("FAILED:", e.message); process.exit(1); });
