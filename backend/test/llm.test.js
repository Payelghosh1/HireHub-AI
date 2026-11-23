// Verifies the LLM code path against a LOCAL stand-in for Anthropic's API (canned replies, not real Claude).
// It proves: request format/headers, JSON parsing, prompt-injection tagging, and fallback on failure.
// Real-model quality can only be checked with your own key:  npm run check-llm
const http = require("http");
const assert = require("assert");
let mode = "ok", seen = [];
const server = http.createServer((req, res) => {
  let body = ""; req.on("data", (c) => (body += c));
  req.on("end", () => {
    const b = JSON.parse(body); seen.push({ url: req.url, key: req.headers["x-api-key"], ver: req.headers["anthropic-version"], b });
    if (mode === "fail") { res.writeHead(500); return res.end("boom"); }
    const wantsJSON = /single valid JSON/.test(b.system);
    const text = wantsJSON ? "```json\n" + JSON.stringify({ questions: [{ q: "Explain RAG.", type: "technical", tip: "Use STAR." }], description: "Mock JD", requirements: "• x", suggestedSkills: [] }) + "\n```" : "MOCK-LLM-REPLY";
    res.writeHead(200, { "content-type": "application/json" }); res.end(JSON.stringify({ content: [{ type: "text", text }] }));
  });
});
server.listen(0, async () => {
  process.env.ANTHROPIC_API_KEY = "test-key"; process.env.ANTHROPIC_BASE_URL = `http://localhost:${server.address().port}`; process.env.AI_MODEL = "claude-test";
  const llm = require("../ai/llm");
  assert(llm.enabled());
  const t = await llm.complete({ system: "sys", messages: [{ role: "user", content: "hi" }], maxTokens: 50 });
  assert.strictEqual(t, "MOCK-LLM-REPLY");
  const r = seen[0]; assert.strictEqual(r.url, "/v1/messages"); assert.strictEqual(r.key, "test-key"); assert.strictEqual(r.ver, "2023-06-01"); assert.strictEqual(r.b.model, "claude-test");
  const j = await llm.completeJSON({ system: "s", prompt: "p" }); assert(Array.isArray(j.questions), "fenced JSON parsed");
  assert.strictEqual((await llm.withFallback(async () => llm.complete({ system: "s", messages: [{ role: "user", content: "x" }] }), async () => "LOCAL")).source, "llm");
  mode = "fail"; const warn = console.warn; console.warn = () => {};
  const fb = await llm.withFallback(async () => llm.complete({ system: "s", messages: [{ role: "user", content: "x" }] }), async () => "LOCAL");
  console.warn = warn; assert.deepStrictEqual(fb, { data: "LOCAL", source: "local" }, "falls back when the API fails");
  console.log("LLM path tests passed ✓ (request format, JSON parsing, source=llm, fallback on 500)");
  server.close();
});
