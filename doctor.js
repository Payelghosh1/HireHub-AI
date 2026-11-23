#!/usr/bin/env node
// HireHub doctor — checks your machine and tells you exactly what to fix.  Run:  node doctor.js
const { execSync } = require("child_process");
const fs = require("fs"), path = require("path"), http = require("http");
const ok = (m) => console.log("  ✓ " + m), bad = (m, fix) => { problems++; console.log("  ✗ " + m + (fix ? "\n      → " + fix : "")); }, warn = (m) => console.log("  ! " + m);
let problems = 0;
const get = (url) => new Promise((res) => { const r = http.get(url, { timeout: 2500 }, (resp) => { let b = ""; resp.on("data", (c) => (b += c)); resp.on("end", () => res({ status: resp.statusCode, body: b })); }); r.on("error", () => res(null)); r.on("timeout", () => { r.destroy(); res(null); }); });
const sh = (c) => { try { return execSync(c, { stdio: ["ignore", "pipe", "ignore"] }).toString().trim(); } catch { return ""; } };

(async () => {
  console.log("\nHireHub doctor\n");
  console.log("1. Tools");
  const [maj, min] = process.versions.node.split(".").map(Number);
  if (maj < 18) bad(`Node ${process.versions.node} is too old`, "Install Node 20.19+ or 22 LTS from https://nodejs.org");
  else if (maj === 20 && min < 19 || maj === 21 || (maj === 22 && min < 12)) { ok(`Node ${process.versions.node} (backend OK)`); warn("The frontend (Vite 8) needs Node 20.19+ or 22.12+ — upgrade from https://nodejs.org if `npm run dev` fails."); }
  else ok(`Node ${process.versions.node}`);
  const py = sh("python3 --version") || sh("python --version");
  const pm = py.match(/(\d+)\.(\d+)/);
  if (!py) bad("Python not found", "Install Python 3.10+ from https://python.org");
  else if (+pm[1] < 3 || +pm[2] < 10) bad(`${py} is too old`, "Install Python 3.10 or newer");
  else ok(py);

  console.log("\n2. Installed dependencies");
  const root = __dirname;
  fs.existsSync(path.join(root, "backend/node_modules")) ? ok("backend packages") : bad("backend packages missing", "cd backend && npm install");
  fs.existsSync(path.join(root, "frontend/node_modules")) ? ok("frontend packages") : bad("frontend packages missing", "cd frontend && npm install");
  fs.existsSync(path.join(root, ".venv")) ? ok("Python virtual env (.venv)") : warn("No .venv yet — `./run-all.sh` creates it, or: python3 -m venv .venv && .venv/bin/pip install -r ml-service/requirements.txt");
  fs.existsSync(path.join(root, "backend/.env")) ? ok("backend/.env") : bad("backend/.env missing", "cd backend && cp .env.example .env");

  console.log("\n3. Running services");
  const api = await get("http://localhost:5001/api/health");
  if (api && api.status === 200 && /"api":"ok"/.test(api.body)) {
    ok("Backend API is running on :5001");
    try { const h = JSON.parse(api.body); h.ml && h.ml !== "offline" ? ok(`ML service connected (${h.ml.jobs_indexed} jobs indexed)`) : bad("Backend is up but the ML service is OFFLINE", "Start it: cd ml-service && python -m uvicorn app.main:app --port 8000   (first start trains the model, ~1 min)"); } catch {}
  } else {
    const who = sh("lsof -nP -iTCP:5001 -sTCP:LISTEN | tail -n +2");
    if (api) bad(`Something else answers on port 5001 (HTTP ${api.status})`, `Stop it (${who.split(/\s+/)[0] || "lsof -i :5001"}) or set PORT in backend/.env`);
    else bad("Backend is NOT running on :5001", "Start it:  cd backend && npm start    (read the error it prints)");
  }
  const old = await get("http://localhost:5000/api/health");
  if (!api && old && old.status === 403) warn("Port 5000 is used by macOS AirPlay Receiver — that's why older versions failed. This version uses 5001.");
  const ml = await get("http://localhost:8000/health");
  ml && ml.status === 200 ? ok("ML service is running on :8000") : warn("ML service not running on :8000 (the app still works with local NLP, but no trained-model features)");
  const web = await get("http://localhost:5173/");
  web && web.status === 200 ? ok("Frontend is running on :5173") : warn("Frontend not running — cd frontend && npm run dev");

  console.log(problems ? `\n${problems} problem(s) found — fix the → lines above, then run  node doctor.js  again.\n` : "\nAll good. Open http://localhost:5173\n");
})();
