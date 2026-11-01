#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
WOPPS Montage :: sound design pack

All effects are synthesized from noise and oscillators, so the rights are clean.
Usage: python sfx.py job.json  ->  {"out": "dir", "sampleRate": 48000}
"""
import json, os, sys, wave
import numpy as np

job = json.load(open(sys.argv[1], encoding="utf-8"))
OUT = job["out"]
SR = int(job.get("sampleRate", 48000))
os.makedirs(OUT, exist_ok=True)
rng = np.random.default_rng(3)


def save(name, x):
    peak = float(np.max(np.abs(x))) + 1e-9
    x = np.tanh(x / peak * 1.05) * 0.88
    data = (x * 32767).astype(np.int16)
    with wave.open(os.path.join(OUT, name), "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(data.tobytes())


def hp(x, k=1):
    for _ in range(k):
        x = np.diff(x, prepend=0.0)
    return x


def lp(x, k=1):
    for _ in range(k):
        x = np.convolve(x, np.ones(9) / 9.0, mode="same")
    return x


def noise(n):
    return rng.standard_normal(n).astype(np.float32)


def whoosh(dur=1.1, up=True):
    n = int(dur * SR); t = np.arange(n) / SR
    nz = noise(n)
    out = np.zeros(n, dtype=np.float32)
    for i in range(0, n, 256):
        k = i / n
        out[i:i + 256] = hp(nz[i:i + 256], 1 + int((1 - k if up else k) * 10))
    return out * (np.sin(np.pi * np.clip(t / dur, 0, 1)) ** 1.6)


def impact(dur=1.6):
    n = int(dur * SR); t = np.arange(n) / SR
    f = 120 * np.exp(-t * 6) + 38
    sub = np.sin(2 * np.pi * np.cumsum(f) / SR).astype(np.float32) * np.exp(-t * 2.6)
    return sub + lp(noise(n) * np.exp(-t * 9) * 0.5, 2)


def riser(dur=2.6):
    n = int(dur * SR); t = np.arange(n) / SR
    nz = noise(n)
    out = np.zeros(n, dtype=np.float32)
    for i in range(0, n, 512):
        k = i / max(1, n)
        out[i:i + 512] = hp(nz[i:i + 512], 1 + int(k * 9))
    e = (t / dur) ** 2.0
    swp = np.sin(2 * np.pi * (200 * t + 1400 * t ** 2 / (2 * dur)))
    return out * e * 0.8 + swp * e * 0.35


def tick(dur=0.05, f=2400, amp=1.0):
    n = int(dur * SR); t = np.arange(n) / SR
    return (np.sin(2 * np.pi * f * t) * np.exp(-t * 220) * amp).astype(np.float32)


def click():
    n = int(0.09 * SR); t = np.arange(n) / SR
    return (np.sin(2 * np.pi * 1500 * t) * np.exp(-t * 180)).astype(np.float32) * 0.7 + (
        noise(n) * np.exp(-t * 260)
    ).astype(np.float32) * 0.4


def key():
    n = int(0.06 * SR); t = np.arange(n) / SR
    return (hp(noise(n), 3) * np.exp(-t * 160) * 0.35 + np.sin(2 * np.pi * rng.uniform(1800, 2600) * t) * np.exp(-t * 120) * 0.5).astype(np.float32)


def glitch(dur=0.55):
    n = int(dur * SR)
    out = np.zeros(n, dtype=np.float32)
    block = int(0.035 * SR)
    for i in range(0, n, block):
        if rng.random() < 0.55:
            f = rng.choice([90, 140, 220, 320])
            tt = np.arange(min(block, n - i)) / SR
            out[i:i + len(tt)] = (np.sign(np.sin(2 * np.pi * f * tt)) * 0.5).astype(np.float32)
        else:
            out[i:i + block] = hp(noise(min(block, n - i)), 2) * 0.5
    return out * np.exp(-np.arange(n) / SR * 2.2)


def chime(base=880, dur=1.4):
    n = int(dur * SR); t = np.arange(n) / SR
    out = np.zeros(n, dtype=np.float32)
    for h, g in ((1, 1.0), (2, 0.45), (3, 0.22), (4.2, 0.1)):
        out += (np.sin(2 * np.pi * base * h * t) * np.exp(-t * (3.0 + h)) * g).astype(np.float32)
    return out


def subdrop(dur=1.3):
    n = int(dur * SR); t = np.arange(n) / SR
    f = 220 * np.exp(-t * 1.6) + 30
    return (np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 1.4)).astype(np.float32)


def reverse_swell(dur=1.6):
    n = int(dur * SR); t = np.arange(n) / SR
    return lp(noise(n), 3) * (t / dur) ** 2.6 * 0.9


def roll(dur=2.0):
    n = int(dur * SR)
    out = np.zeros(n, dtype=np.float32)
    t = 0.0
    gap = 0.09
    while t < dur - 0.05:
        m = int(0.22 * SR)
        tt = np.arange(m) / SR
        s = (noise(m) * np.exp(-tt * 26) * 0.7).astype(np.float32)
        i = int(t * SR)
        k = min(m, n - i)
        out[i:i + k] += s[:k]
        gap = max(0.032, gap * 0.86)
        t += gap
    return out


def ui_soft():
    n = int(0.18 * SR); t = np.arange(n) / SR
    return (np.sin(2 * np.pi * (1200 + 800 * t) * t) * np.exp(-t * 30) * 0.6).astype(np.float32)


save("whoosh.wav", whoosh(1.2, True) * 0.85)
save("whoosh_rev.wav", whoosh(0.95, False) * 0.8)
save("impact.wav", impact(1.7) * 0.95)
save("riser.wav", riser(3.0) * 0.7)
save("riser_short.wav", riser(1.4) * 0.65)
save("tick.wav", tick(0.05, 2600) * 0.6)
save("tock.wav", tick(0.07, 1500) * 0.55)
save("click.wav", click() * 0.7)
save("key.wav", key() * 0.5)
save("glitch.wav", glitch() * 0.6)
save("success.wav", (chime(784, 1.1) + chime(1046, 1.1)) * 0.45)
save("error.wav", (np.sin(2 * np.pi * 90 * np.arange(int(0.4 * SR)) / SR) * 0.5).astype(np.float32))
save("subdrop.wav", subdrop() * 0.8)
save("swell.wav", reverse_swell(1.8) * 0.6)
save("roll.wav", roll(2.2) * 0.55)
save("ui.wav", ui_soft() * 0.7)
save("bell.wav", chime(523.25, 2.4) * 0.5)

print(json.dumps({"ok": True, "out": OUT, "count": 17}))
