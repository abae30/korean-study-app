#!/bin/sh
# Uses the project venv if present, else system python3.
cd "$(dirname "$0")/.." || exit 1
if [ -x .venv/bin/python3 ]; then PY=.venv/bin/python3; else PY=python3; fi
exec "$PY" scripts/build_audio.py "$@"
