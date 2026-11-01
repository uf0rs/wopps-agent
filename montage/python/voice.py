#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
WOPPS Montage :: voice synthesizer

Reads a JSON job file:
  {"out": ".../vo", "voice": "ru-RU-DmitryNeural", "rate": "+8%",
   "lines": [{"id": "s01-l01", "text": "...", "sha": "..."}], "force": false}

Writes one mp3 per line and a manifest with the hashes it produced.
Uses edge-tts (free Microsoft neural voices, no key) with bounded concurrency.
"""
import asyncio, hashlib, json, os, sys

try:
    import edge_tts
except ImportError:
    print(json.dumps({"ok": False, "error": "edge-tts is not installed. Run: python -m pip install edge-tts"}))
    sys.exit(2)

CONCURRENCY = 5


def key(line, voice, rate):
    return hashlib.sha1(f"{voice}|{rate}|{line['text']}".encode("utf-8")).hexdigest()[:16]


async def one(line, out_dir, voice, rate, semaphore):
    target = os.path.join(out_dir, f"{line['id']}.mp3")
    async with semaphore:
        try:
            communicate = edge_tts.Communicate(line["text"], voice, rate=rate)
            await communicate.save(target)
            return {"id": line["id"], "file": target, "ok": True}
        except Exception as error:  # noqa: BLE001 - report per line, keep the batch alive
            return {"id": line["id"], "ok": False, "error": str(error)}


async def main():
    job = json.load(open(sys.argv[1], encoding="utf-8"))
    out_dir = job["out"]
    voice = job.get("voice", "ru-RU-DmitryNeural")
    rate = job.get("rate", "+6%")
    force = bool(job.get("force"))
    os.makedirs(out_dir, exist_ok=True)

    pending = []
    results = []
    for line in job["lines"]:
        target = os.path.join(out_dir, f"{line['id']}.mp3")
        digest = key(line, voice, rate)
        if not force and os.path.exists(target) and line.get("sha") == digest:
            results.append({"id": line["id"], "file": target, "ok": True, "cached": True, "sha": digest})
        else:
            pending.append((line, digest))

    semaphore = asyncio.Semaphore(CONCURRENCY)
    done = await asyncio.gather(*[one(line, out_dir, voice, rate, semaphore) for line, _ in pending])
    for (line, digest), result in zip(pending, done):
        result["sha"] = digest
        results.append(result)

    # edge-tts occasionally drops a connection; retry those lines once, sequentially.
    failed = [item for item in results if not item.get("ok") and item.get("id")]
    for item in failed:
        line = next(entry for entry in job["lines"] if entry["id"] == item["id"])
        digest = key(line, voice, rate)
        retry = await one(line, out_dir, voice, rate, asyncio.Semaphore(1))
        if retry.get("ok"):
            item.update({"ok": True, "file": retry["file"]})
            item.pop("error", None)
            item["sha"] = digest

    bad = [item for item in results if not item.get("ok")]
    print(json.dumps({"ok": not bad, "count": len(results), "failed": bad, "results": results}, ensure_ascii=False))


if __name__ == "__main__":
    asyncio.run(main())
