// Thin Claude (Anthropic Messages API) client using plain fetch — no SDK dependency.
// If ANTHROPIC_API_KEY is not set, `enabled()` is false and callers use their local fallbacks.

const MODEL = () => process.env.AI_MODEL || "claude-sonnet-5-5";
const enabled = () => Boolean(process.env.ANTHROPIC_API_KEY);

async function complete({ system, messages, maxTokens = 900, temperature = 0.3 }) {
  if (!enabled()) throw new Error("LLM disabled");
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 30000);
  try {
    const base = (process.env.ANTHROPIC_BASE_URL || "https://api.anthropic.com").replace(/\/$/, "");
    const res = await fetch(`${base}/v1/messages`, {
      method: "POST",
      signal: ctrl.signal,
      headers: {
        "content-type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({ model: MODEL(), max_tokens: maxTokens, temperature, system, messages }),
    });
    if (!res.ok) throw new Error(`Anthropic API ${res.status}: ${(await res.text()).slice(0, 200)}`);
    const data = await res.json();
    return (data.content || []).filter((b) => b.type === "text").map((b) => b.text).join("").trim();
  } finally {
    clearTimeout(timer);
  }
}

/** Ask for JSON and parse it defensively. */
async function completeJSON({ system, prompt, maxTokens = 1000 }) {
  const text = await complete({
    system: `${system}\nRespond with a single valid JSON object only. No markdown fences, no commentary.`,
    messages: [{ role: "user", content: prompt }],
    maxTokens,
    temperature: 0.2,
  });
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end < 0) throw new Error("No JSON in model output");
  return JSON.parse(text.slice(start, end + 1));
}

/** Run the LLM path, fall back to the local one on any failure. Returns {data, source}. */
async function withFallback(llmFn, localFn) {
  if (enabled()) {
    try {
      return { data: await llmFn(), source: "llm" };
    } catch (e) {
      console.warn("[ai] LLM failed, using local fallback:", e.message);
    }
  }
  return { data: await localFn(), source: "local" };
}

module.exports = { enabled, complete, completeJSON, withFallback, MODEL };
