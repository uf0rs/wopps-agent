#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
WOPPS Montage :: mixer

- places every voice take sample-accurately from the timeline
- ducks the score under speech with a real sidechain envelope
- drops SFX on cuts, typing scenes, counters and the final hit
- masters to one 48 kHz stereo WAV

The premium detail from the studio: the duck is computed from the voice envelope,
so music never covers speech by construction, not by ear.
"""
import json, math, os, subprocess, sys, wave
from concurrent.futures import ThreadPoolExecutor
import numpy as np

job = json.load(open(sys.argv[1], encoding="utf-8"))
SR = int(job.get("sampleRate", 48000))
FFMPEG = job["ffmpeg"]
TL = job["timeline"]
DUR = float(TL["totalSeconds"]) + 0.4
N = int(DUR * SR)
OUT = job["out"]
voice_dir = job.get("voDir")
sfx_dir = job.get("sfxDir")
score_path = job.get("score")
cache = job.get("voCache")

os.makedirs(cache, exist_ok=True)


def read_wav(path):
    with wave.open(path, "rb") as w:
        channels, width, rate = w.getnchannels(), w.getsampwidth(), w.getframerate()
        raw = w.readframes(w.getnframes())
    if width != 2:
        raise RuntimeError("expected 16-bit wav: " + path)
    data = np.frombuffer(raw, dtype=np.int16).astype(np.float32) / 32768.0
    if channels > 1:
        data = data.reshape(-1, channels).mean(axis=1)
    if rate != SR:
        raise RuntimeError(f"unexpected samplerate {rate} in {path}")
    return data


def decode(source):
    target = os.path.join(cache, os.path.basename(source).rsplit(".", 1)[0] + ".wav")
    if not os.path.exists(target) or os.path.getmtime(target) < os.path.getmtime(source):
        subprocess.run(
            [FFMPEG, "-y", "-v", "error", "-i", source, "-ar", str(SR), "-ac", "1", "-c:a", "pcm_s16le", target],
            check=True,
        )
    return target


vo = np.zeros(N, dtype=np.float32)
lines = [line for scene in TL["scenes"] for line in scene.get("lines", [])]

if voice_dir and lines:
    present = [line for line in lines if os.path.exists(os.path.join(voice_dir, line["file"]))]
    with ThreadPoolExecutor(max_workers=6) as pool:
        list(pool.map(decode, [os.path.join(voice_dir, line["file"]) for line in present]))
    for line in present:
        path = os.path.join(voice_dir, line["file"])
        audio = read_wav(decode(path))
        peak = float(np.max(np.abs(audio))) + 1e-9
        audio = audio / peak * 0.88
        edge = min(len(audio), int(0.012 * SR))
        if edge > 1:
            audio[:edge] *= np.linspace(0, 1, edge)
            audio[-edge:] *= np.linspace(1, 0, edge)
        index = int(line["start"] * SR)
        count = min(len(audio), N - index)
        if count > 0:
            vo[index:index + count] += audio[:count]

# ---- music with sidechain ducking
mix = np.zeros((N, 2), dtype=np.float32)
if score_path and os.path.exists(score_path):
    with wave.open(score_path, "rb") as w:
        channels = w.getnchannels()
        raw = w.readframes(w.getnframes())
    music = np.frombuffer(raw, dtype=np.int16).astype(np.float32).reshape(-1, channels) / 32768.0
    if channels == 1:
        music = np.repeat(music, 2, axis=1)
    if len(music) < N:
        music = np.pad(music, ((0, N - len(music)), (0, 0)))
    music = music[:N]

    hz = 200
    hop = SR // hz
    frames = N // hop
    envelope = np.abs(vo[: frames * hop]).reshape(frames, hop).max(axis=1)
    attack = math.exp(-1 / (0.010 * hz))
    release = math.exp(-1 / (0.320 * hz))
    smooth = np.empty_like(envelope)
    previous = 0.0
    for i in range(frames):
        sample = envelope[i]
        coefficient = attack if sample > previous else release
        previous = coefficient * previous + (1 - coefficient) * sample
        smooth[i] = previous
    smooth = np.interp(np.arange(N), np.arange(frames) * hop + hop / 2, smooth)
    duck = (1.0 - 0.74 * np.clip(smooth / 0.15, 0, 1))[:, None]
    mix += music * duck * 0.42

# ---- sfx cues
sfx = np.zeros(N, dtype=np.float32)
if sfx_dir and os.path.isdir(sfx_dir):
    cache_sfx = {}

    def effect(name):
        if name not in cache_sfx:
            cache_sfx[name] = read_wav(os.path.join(sfx_dir, name))
        return cache_sfx[name]

    def place(time_sec, name, gain=1.0):
        index = int(time_sec * SR)
        if index < 0 or index >= N:
            return
        audio = effect(name)
        count = min(len(audio), N - index)
        sfx[index:index + count] += audio[:count] * gain

    rng = np.random.default_rng(5)
    scenes = TL["scenes"]
    for scene in scenes[1:]:
        place(scene["start"] - 0.30, "whoosh_rev.wav", 0.26)
        place(scene["start"] - 0.02, "impact.wav", 0.18)
    if scenes:
        place(0.18, "subdrop.wav", 0.42)
        place(min(2.2, DUR * 0.2), "riser_short.wav", 0.12)

    for scene in scenes:
        kind = scene.get("type")
        start = scene["start"]
        end = scene["end"]
        length = max(0.5, end - start)
        if kind in ("terminal", "code"):
            t = start + 0.4
            while t < end - 0.6:
                if rng.random() < 0.5:
                    place(t, "key.wav", 0.04 + rng.random() * 0.04)
                t += 0.13 + rng.random() * 0.11
        if kind == "stats":
            items = scene.get("items") or []
            count = len(items) if isinstance(items, list) else max(1, int(items))
            for i in range(count):
                place(start + 0.9 + i * min(3.0, length / max(1, count)), "tock.wav", 0.09)
        if kind == "montage":
            cards = scene.get("cards")
            count = len(cards) if isinstance(cards, list) else max(1, int(cards or 6))
            step = length / count
            for i in range(count):
                place(start + i * step - 0.2, "whoosh_rev.wav", 0.16)
                place(start + i * step, "impact.wav", 0.2)
        if kind == "outro":
            place(end - min(2.6, length * 0.35), "swell.wav", 0.16)
            place(end - 1.2, "success.wav", 0.16)
            place(end - 0.4, "subdrop.wav", 0.22)
        if kind == "quote":
            place(start + 0.5, "bell.wav", 0.1)
        if kind == "compare":
            place(start + 0.15, "ui.wav", 0.1)

master = mix + vo[:, None] + sfx[:, None]
peak = float(np.max(np.abs(master))) + 1e-9
master = master / peak
master = np.tanh(master * 1.08) * 0.94

fade_in = int(0.6 * SR)
master[:fade_in] *= np.linspace(0, 1, fade_in)[:, None]
fade_out = int(min(2.5, DUR * 0.3) * SR)
master[-fade_out:] *= np.linspace(1, 0, fade_out)[:, None]

data = (np.clip(master, -1, 1) * 32767).astype(np.int16)
with wave.open(OUT, "wb") as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes(data.tobytes())

print(json.dumps({"ok": True, "out": OUT, "seconds": round(DUR, 2), "voicePeak": float(np.max(np.abs(vo)))}))
