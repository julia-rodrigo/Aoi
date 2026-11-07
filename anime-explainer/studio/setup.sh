#!/usr/bin/env bash
# One-time setup: Python venv + packages, Node packages + Chromium, and a check for ffmpeg (with the rubberband filter).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"
need() { command -v "$1" >/dev/null 2>&1 || { echo "Missing: $1. $2"; exit 1; }; }
need python3 "Install Python 3.10 or newer (python.org or 'brew install python')."
need node "Install Node.js 20 or newer (nodejs.org or 'brew install node')."
need ffmpeg "Install ffmpeg ('brew install ffmpeg' on a Mac, 'sudo apt install ffmpeg' on Linux)."
if ! ffmpeg -hide_banner -filters 2>/dev/null | grep -q rubberband; then
  echo "Note: your ffmpeg has no rubberband filter. Everything works except fitting a second VOICED language to the first."
fi
[ -d .venv ] || python3 -m venv .venv
.venv/bin/pip install --quiet --upgrade pip
.venv/bin/pip install --quiet -r requirements.txt
npm install --silent
npx --yes playwright install chromium
[ -f .env ] || cp .env.example .env
echo
echo "Setup done. Put your keys in $ROOT/.env, then try the demo:"
echo "  ./studio cues hello-aoi && ./studio preview hello-aoi"
