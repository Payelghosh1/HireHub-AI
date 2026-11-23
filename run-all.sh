#!/usr/bin/env bash
# Starts ML service (:8000), API (:5000) and frontend (:5173). Needs Python 3.10+, Node 18+.
set -e
cd "$(dirname "$0")"
if [ ! -d .venv ]; then python3 -m venv .venv && .venv/bin/pip install -q -r ml-service/requirements.txt; fi
[ -d backend/node_modules ] || (cd backend && npm install)
[ -d frontend/node_modules ] || (cd frontend && npm install)
[ -f backend/.env ] || cp backend/.env.example backend/.env
trap 'kill 0' EXIT
(cd ml-service && ../.venv/bin/python -m uvicorn app.main:app --port 8000) &
(cd backend && node server.js) &
(cd frontend && npm run dev -- --port 5173) &
wait
