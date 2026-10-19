#!/usr/bin/env python3
"""MeloTTS worker (runs inside .venv-tts, called by build_audio.py).

    python scripts/melo_worker.py jobs.json

jobs.json: {"speed": 0.9, "jobs": [{"text": "...", "out": "/abs/path.m4a"}, ...]}
Loads the Korean model once, synthesizes each text to a WAV, and encodes it to AAC (m4a) with macOS afconvert.
Prints "OK <out>" / "FAIL <out> <error>" per job so the caller can report and retry.
"""
import json, subprocess, sys, tempfile, time
from pathlib import Path

import warnings
warnings.filterwarnings("ignore")

from melo.api import TTS  # noqa: E402

cfg = json.loads(Path(sys.argv[1]).read_text(encoding="utf-8"))
model = TTS(language="KR", device="cpu")
sid = model.hps.data.spk2id["KR"]
jobs = cfg["jobs"]
t0 = time.time()
with tempfile.TemporaryDirectory() as td:
    wav = str(Path(td) / "x.wav")
    for n, j in enumerate(jobs, 1):
        try:
            model.tts_to_file(j["text"], sid, wav, speed=cfg.get("speed", 0.9), quiet=True)
            subprocess.run(["afconvert", "-f", "m4af", "-d", "aac", "-b", "64000", "-c", "1", wav, j["out"]], check=True, capture_output=True)
            print("OK", j["out"], flush=True)
        except Exception as e:  # noqa: BLE001
            Path(j["out"]).unlink(missing_ok=True)
            print("FAIL", j["out"], repr(e)[:120], flush=True)
        if n % 50 == 0:
            print(f"# {n}/{len(jobs)} in {time.time() - t0:.0f}s", flush=True)
