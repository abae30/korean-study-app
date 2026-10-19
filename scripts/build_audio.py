#!/usr/bin/env python3
"""Pre-generate Korean audio.  `npm run build-audio`

Writes public/audio/<hash>.<ext> and public/audio/manifest.json:
    id -> {"variants": [{file, hash, engine, voice, gender}, ...]}
Words, sentences and narration are generated in every voice of the engine (the app picks one per play);
dialogue lines use the single voice matching the speaker's gender.
Only variants that are new, or whose text / voice / rate / engine changed, are generated.

Engines (scripts/audio-config.json):
  edge  edge-tts neural voices (mp3)        best quality, needs internet + Microsoft's service to be reachable
  melo  MeloTTS neural Korean (m4a/AAC)     offline, one female voice; needs .venv-tts (see README)
  say   macOS built-in voices (m4a/AAC)     offline fallback
  auto  try edge, then melo, then say       (default)

Flags:  --engine edge|melo|say|auto   --prune (delete unreferenced files)
        --samples (write voice comparison clips to voice-samples/)   --force (regenerate everything)
"""
import argparse, asyncio, hashlib, json, re, subprocess, sys, tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
LESSONS = ROOT / "src" / "data" / "lessons"
OUT = ROOT / "public" / "audio"
CFG = json.loads((ROOT / "scripts" / "audio-config.json").read_text(encoding="utf-8"))

try:
    import edge_tts
except ImportError:
    edge_tts = None


_DIG = " 일이삼사오육칠팔구"
_NAT_ONES = ["", "한", "두", "세", "네", "다섯", "여섯", "일곱", "여덟", "아홉"]
_NAT_TENS = ["", "열", "스물", "서른", "마흔", "쉰", "예순", "일흔", "여든", "아흔"]


def _sino(n: int) -> str:
    def below(m):
        out = ""
        for unit, div in (("천", 1000), ("백", 100), ("십", 10)):
            d = m // div % 10
            if d:
                out += ("" if d == 1 else _DIG[d]) + unit
        return out + (_DIG[m % 10] if m % 10 else "")

    high, low = divmod(n, 10000)
    return (("" if high == 1 else below(high)) + "만" if high else "") + (below(low) if low else "")


def _native(n: int) -> str:
    if n == 20:
        return "스무"
    return _NAT_TENS[n // 10] + _NAT_ONES[n % 10]


_SINO_UNITS = "학년|층|과|원|월|분|년"
_NATIVE_UNITS = "시간|마리|명|개|권|달|시"


def read_numbers(text: str) -> str:
    """'3층' -> '삼 층', '5명' -> '다섯 명', '10시 24분' -> '열 시 이십사 분': the way the book says them aloud."""
    def sino(m):
        n = int(m.group(1))
        return f"{_sino(n)}{'' if m.group(2) in ('학년', '월') else ' '}{m.group(2)}" if 0 < n < 10**8 else m.group(0)

    def nat(m):
        n = int(m.group(1))
        return f"{_native(n) if n < 100 else _sino(n)} {m.group(2)}" if 0 < n < 10**8 else m.group(0)

    text = re.sub(rf"(\d+)(?=(?:{_NATIVE_UNITS}))({_NATIVE_UNITS})", nat, text)
    return re.sub(rf"(\d+)({_SINO_UNITS})", sino, text)


def spoken(text: str) -> str:
    """Make written forms TTS-friendly: '은/는' -> '은, 는'; digits with counters are spelled out."""
    return read_numbers(text.replace("/", ", ").replace("[", "").replace("]", ""))


def short(s: str) -> str:
    return hashlib.sha1(s.encode("utf-8")).hexdigest()[:12]


def role_for(speaker):
    return CFG["speakerGender"].get(speaker, CFG["defaultGender"])


def collect():
    """{id: (text, who)} for every audio item. who=None → all voices; who='male'/'female' → that gender only.
    Paragraphs: narration = one take; dialogue = per-line takes `pid#i`."""
    items = {}
    for f in sorted(LESSONS.glob("lesson-*.json")):
        lesson = json.loads(f.read_text(encoding="utf-8"))
        for v in lesson["vocab"]:
            items[v["id"]] = (spoken(v["ko"]), None)
        for s in lesson["sentences"]:
            items[s["id"]] = (spoken(s["ko"]), None)
        for p in lesson["paragraphs"]:
            for i, ln in enumerate(p["lines"]):
                items[f'{p["id"]}#{i}'] = (spoken(ln["ko"]), role_for(ln.get("speaker")) if ln.get("speaker") else None)
            if p["kind"] == "narration":
                items[p["id"]] = (" ".join(spoken(ln["ko"]) for ln in p["lines"]), None)
    return items


# ───────────── engines ─────────────
class Edge:
    name, ext = "edge", ".mp3"

    voices = CFG["edge"]["voices"]

    def sig(self):
        return f'{CFG["edge"]["rate"]}|{CFG["edge"]["pitch"]}'

    async def synth(self, text, voice, path):
        await edge_tts.Communicate(text, voice, rate=CFG["edge"]["rate"], pitch=CFG["edge"]["pitch"]).save(str(path))


class Say:
    name, ext = "say", ".m4a"

    voices = CFG["say"]["voices"]

    def sig(self):
        return str(CFG["say"]["wordsPerMinute"])

    async def synth(self, text, voice, path):
        with tempfile.TemporaryDirectory() as td:
            aiff = Path(td) / "x.aiff"
            for cmd in (
                ["say", "-v", voice, "-r", str(CFG["say"]["wordsPerMinute"]), "-o", str(aiff), "--", text],
                ["afconvert", "-f", "m4af", "-d", "aac", "-b", "64000", "-c", "1", str(aiff), str(path)],
            ):
                p = await asyncio.create_subprocess_exec(*cmd, stdout=asyncio.subprocess.DEVNULL, stderr=asyncio.subprocess.PIPE)
                _, err = await p.communicate()
                if p.returncode:
                    raise RuntimeError(err.decode()[:200])


class Melo:
    name, ext = "melo", ".m4a"

    voices = CFG["melo"]["voices"]
    python = ROOT / ".venv-tts" / "bin" / "python"

    def sig(self):
        return str(CFG["melo"]["speed"])

    @classmethod
    def available(cls) -> bool:
        return cls.python.exists()

    async def synth_all(self, todo):
        """Batch: one worker process loads the model once. todo = [(entry, text)]. Returns the set of failed files."""
        failed = set()
        with tempfile.TemporaryDirectory() as td:
            jobs = Path(td) / "jobs.json"
            jobs.write_text(json.dumps({"speed": CFG["melo"]["speed"], "jobs": [{"text": t, "out": str(OUT / e["file"])} for e, t in todo]}, ensure_ascii=False), encoding="utf-8")
            p = await asyncio.create_subprocess_exec(str(self.python), str(ROOT / "scripts" / "melo_worker.py"), str(jobs), stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.DEVNULL)
            async for raw in p.stdout:
                line = raw.decode().rstrip()
                if line.startswith("FAIL"):
                    failed.add(Path(line.split()[1]).name)
                    print("  " + line[:160], file=sys.stderr)
                elif line.startswith("#"):
                    print("  " + line)
            await p.wait()
        for e, _t in todo:
            f = OUT / e["file"]
            if not f.exists() or f.stat().st_size < 500:
                failed.add(e["file"])
        return failed


async def probe_edge() -> bool:
    if edge_tts is None:
        return False
    try:
        with tempfile.TemporaryDirectory() as td:
            await Edge().synth("안녕하세요", Edge.voices[0]["name"], Path(td) / "p.mp3")
        return True
    except Exception as e:
        print(f"  edge-tts unavailable ({type(e).__name__}: {str(e)[:60]})")
        return False


async def pick_engine(want):
    if want == "edge":
        if not await probe_edge():
            sys.exit("edge-tts is not reachable right now. Try again later, or use --engine say.")
        return Edge()
    if want == "melo":
        if not Melo.available():
            sys.exit("MeloTTS is not set up: .venv-tts is missing (see the README, Audio section).")
        return Melo()
    if want == "say":
        return Say()
    if await probe_edge():
        return Edge()
    if Melo.available():
        print("  edge-tts unavailable → using the local MeloTTS neural voice.")
        return Melo()
    if sys.platform != "darwin":
        sys.exit("edge-tts unavailable and the macOS fallback only works on a Mac.")
    print("  → falling back to macOS voices. Re-run `npm run build-audio` later to upgrade to edge-tts.")
    return Say()


async def synth_retry(eng, text, voice, path, sem):
    async with sem:
        err = None
        for attempt in range(3):
            try:
                await eng.synth(text, voice, path)
                if path.exists() and path.stat().st_size > 500:
                    return True
                path.unlink(missing_ok=True)
            except Exception as e:
                err = e
            await asyncio.sleep(1.0 * (attempt + 1))
        print(f"  FAILED {path.name}: {err!r}", file=sys.stderr)
        return False


async def samples():
    d = ROOT / "voice-samples"
    d.mkdir(exist_ok=True)
    line = "안녕하세요? 저는 민수예요. 대학생이에요. 한국어를 공부해요."
    eng = Say()
    for v in ["Yuna", "Reed", "Eddy", "Flo", "Sandy", "Shelley", "Rocko"]:
        p = d / f"say-{v}.m4a"
        await eng.synth(line, v, p)
        print("wrote", p.relative_to(ROOT))
    if await probe_edge():
        for v in ["ko-KR-SunHiNeural", "ko-KR-InJoonNeural", "ko-KR-HyunsuMultilingualNeural"]:
            p = d / f"edge-{v}.mp3"
            await Edge().synth(line, v, p)
            print("wrote", p.relative_to(ROOT))
    else:
        print("(edge-tts samples skipped: service unreachable)")


async def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--engine", default=CFG["engine"], choices=["auto", "edge", "melo", "say"])
    ap.add_argument("--prune", action="store_true")
    ap.add_argument("--samples", action="store_true")
    ap.add_argument("--force", action="store_true")
    args = ap.parse_args()

    if args.samples:
        return await samples()

    eng = await pick_engine(args.engine)
    print(f"engine: {eng.name}")
    OUT.mkdir(parents=True, exist_ok=True)
    mpath = OUT / "manifest.json"
    manifest = json.loads(mpath.read_text(encoding="utf-8")) if mpath.exists() else {}
    items = collect()

    def voices_for(who):
        if who is None:
            return eng.voices
        match = [v for v in eng.voices if v["gender"] == who]
        return match[:1] or eng.voices[:1]

    todo, ok, plan = [], 0, {}
    for id_, (text, who) in items.items():
        plan[id_] = []
        have = {v["voice"]: v for v in manifest.get(id_, {}).get("variants", []) if v.get("engine") == eng.name}
        for voice in voices_for(who):
            h = short(f"{eng.name}|{voice['name']}|{eng.sig()}|{text}")
            fname = short(f"{id_}|{eng.name}|{voice['name']}") + eng.ext
            entry = {"file": fname, "hash": h, "engine": eng.name, "voice": voice["name"], "gender": voice["gender"]}
            plan[id_].append(entry)
            cur = have.get(voice["name"])
            if not args.force and cur and cur["hash"] == h and (OUT / cur["file"]).exists():
                ok += 1
            else:
                todo.append((entry, text))

    print(f"{len(items)} items, {ok + len(todo)} clips: {ok} up to date, {len(todo)} to generate")
    if eng.name == "melo":
        failed_files = await eng.synth_all(todo) if todo else set()
    else:
        sem = asyncio.Semaphore(3 if eng.name == "edge" else 4)
        results = await asyncio.gather(*(synth_retry(eng, t, e["voice"], OUT / e["file"], sem) for e, t in todo))
        failed_files = {e["file"] for (e, _t), good in zip(todo, results) if not good}

    new_manifest = {}
    for id_, entries in plan.items():
        good = [e for e in entries if e["file"] not in failed_files]
        if good:
            new_manifest[id_] = {"variants": good}
    manifest = new_manifest
    mpath.write_text(json.dumps(manifest, ensure_ascii=False, indent=0, sort_keys=True), encoding="utf-8")

    if args.prune:
        used = {v["file"] for m in manifest.values() for v in m["variants"]} | {"manifest.json"}
        stale = [f for f in OUT.iterdir() if f.name not in used]
        for f in stale:
            f.unlink()
        print(f"pruned {len(stale)} unreferenced file(s)")

    failed = len(failed_files)
    print(f"done. manifest has {len(manifest)} items" + (f"; {failed} clips FAILED, re-run to retry" if failed else ""))
    sys.exit(1 if failed else 0)


asyncio.run(main())
