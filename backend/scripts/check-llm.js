// Verify your Claude key works:  npm run check-llm
require("dotenv").config();
const llm = require("../ai/llm");
(async () => {
  if (!llm.enabled()) return console.log("✗ ANTHROPIC_API_KEY is not set in backend/.env — HireHub is using template text.");
  console.log(`Calling Claude (${llm.MODEL()}) ...`);
  try {
    const t = await llm.complete({ system: "You are a concise career coach.", messages: [{ role: "user", content: "In one sentence: why should a fresher add a RAG project to their resume?" }], maxTokens: 120 });
    console.log("✓ LLM is ACTIVE. Reply:\n  " + t + "\n\nRestart the backend; badges will now read '✦ Claude'.");
  } catch (e) { console.log("✗ LLM call failed:", e.message, "\n  Check the key, billing, and AI_MODEL in backend/.env"); process.exit(1); }
})();
