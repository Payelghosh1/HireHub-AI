#!/usr/bin/env bash
# Start the ML service on :8000 (trains on first run).
cd "$(dirname "$0")"
exec python -m uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}
