#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
WOPPS Montage :: original score

Reads a job file and synthesizes a stereo 48 kHz score that follows the edit:
  {"out": "score.wav", "totalSeconds": 617, "sampleRate": 48000,
   "scenes": [{"start": 0, "end": 13.6, "energy": 0.2, "mood": "tech"}]}

No samples, no licences: everything is oscillators and noise.
"""
import json, sys, wave
import numpy as np

job = json.load(open(sys.argv[1], encoding="utf-8"))
OUT = job["out"]
SR = int(job.get("sampleRate", 48000))
TL = job["scenes"]
DUR = float(job["totalSeconds"]) + 2.0
MOOD = job.get("mood", "tech")
N = int(DUR * SR)
rng = np.random.default_rng(7)

L = np.zeros(N, dtype=np.float32)
R = np.zeros(N, dtype=np.float32)


def m2f(m):
    return 440.0 * 2 ** ((m - 69) / 12)


def add(sig, start, gain=1.0, pan=0.0):
    i = int(start * SR)
    if i >= N or i < 0:
        return
    n = min(len(sig), N - i)
    if n <= 0:
        return
    L[i:i + n] += sig[:n] * (gain * (1.0 - max(0.0, pan) * 0.55))
    R[i:i + n] += sig[:n] * (gain * (1.0 + min(0.0, pan) * 0.55))


def env(n, a, d, s, r):
    a = max(1, int(a * SR)); d = max(1, int(d * SR)); r = max(1, int(r * SR))
    s_len = max(0, n - a - d - r)
    e = np.concatenate([
        np.linspace(0, 1, a),
        np.linspace(1, s, d),
        np.full(s_len, s),
        np.linspace(s, 0, r),
    ])
    if len(e) < n:
        e = np.pad(e, (0, n - len(e)))
    return e[:n].astype(np.float32)


def saw(f, n, detune=0.0, harmonics=9):
    t = np.arange(n) / SR
    out = np.zeros(n, dtype=np.float32)
    for h in range(1, harmonics + 1):
        out += (np.sin(2 * np.pi * f * h * (1 + detune) * t) / h ** 1.6).astype(np.float32)
    return out


def pad(notes, dur, amp=0.16):
    n = int(dur * SR)
    out = np.zeros(n, dtype=np.float32)
    for m in notes:
        f = m2f(m)
        for dt in (-0.004, 0.0, 0.0045):
            out += saw(f, n, dt, 7) * 0.33
    out /= max(1, len(notes)) * 1.4
    return (out * env(n, min(1.4, dur * 0.35), 0.6, 0.85, min(1.6, dur * 0.35)) * amp).astype(np.float32)


def pluck(f, dur, amp=0.2, bright=1.0):
    n = int(dur * SR); t = np.arange(n) / SR
    out = np.zeros(n, dtype=np.float32)
    for h in range(1, 8):
        out += (np.sin(2 * np.pi * f * h * t) * np.exp(-t * (3.0 + h * 4.0 / bright)) / h ** 1.2).astype(np.float32)
    return (out * amp * env(n, 0.004, 0.05, 0.35, dur * 0.15)).astype(np.float32)


def bass(f, dur, amp=0.34):
    n = int(dur * SR); t = np.arange(n) / SR
    out = (np.sin(2 * np.pi * f * t) + 0.35 * np.sin(2 * np.pi * f * 2 * t) + 0.12 * np.sin(2 * np.pi * f * 3 * t)).astype(np.float32)
    out *= np.exp(-t * 1.6).astype(np.float32)
    return (out * amp * env(n, 0.01, 0.1, 0.6, 0.12)).astype(np.float32)


def kick(amp=0.95):
    n = int(0.55 * SR); t = np.arange(n) / SR
    f = 150 * np.exp(-t * 22) + 44
    body = np.sin(2 * np.pi * np.cumsum(f) / SR).astype(np.float32) * np.exp(-t * 7.5).astype(np.float32)
    click = (rng.standard_normal(n) * np.exp(-t * 160)).astype(np.float32) * 0.35
    return ((body + click) * amp).astype(np.float32)


def hat(amp=0.14, dec=60):
    n = int(0.09 * SR); t = np.arange(n) / SR
    nz = rng.standard_normal(n).astype(np.float32)
    hp = np.diff(nz, prepend=0.0).astype(np.float32)
    return (hp * np.exp(-t * dec) * amp).astype(np.float32)


def snare(amp=0.3):
    n = int(0.35 * SR); t = np.arange(n) / SR
    nz = rng.standard_normal(n).astype(np.float32)
    body = (np.sin(2 * np.pi * 190 * t) * np.exp(-t * 24)).astype(np.float32)
    return (((nz * np.exp(-t * 17) * 0.8 + body * 0.6)) * amp).astype(np.float32)


def riser(dur, amp=0.28):
    n = int(dur * SR); t = np.arange(n) / SR
    nz = rng.standard_normal(n).astype(np.float32)
    out = np.zeros(n, dtype=np.float32)
    for k in range(1, 5):
        d = int(SR / (400 + 4200 * (k / 5)))
        out += (nz - np.roll(nz, d)) * 0.25
    swp = np.sin(2 * np.pi * (120 * t + 900 * t ** 2 / (2 * dur))).astype(np.float32)
    e = (np.linspace(0, 1, n) ** 2.2).astype(np.float32)
    return ((out * 0.6 + swp * 0.4) * e * amp).astype(np.float32)


BEAT = 60 / (104.0 if MOOD != "calm" else 88.0)
BAR = BEAT * 4
CHORDS = [[57, 60, 64], [53, 57, 60], [48, 55, 60], [55, 59, 62]]
CHORDS_WARM = [[53, 57, 60], [48, 55, 60], [55, 59, 62], [57, 60, 64]]
ROOTS = [45, 41, 36, 43]


def scene_at(t):
    for sc in TL:
        if sc["start"] <= t < sc["end"]:
            return sc
    return TL[-1]


def energy(t):
    sc = scene_at(t)
    value = float(sc.get("energy", 0.7))
    if MOOD == "calm":
        return (value * 0.25, value * 0.25, 1.0, value * 0.3)
    return (value, value * 0.92, 0.8 + value * 0.2, 0.55 + value * 0.45)


# pads
t = 0.0
while t < DUR:
    sc = scene_at(t)
    warm = sc.get("mood") == "warm" or MOOD == "warm"
    ch = CHORDS_WARM if warm else CHORDS
    index = int(t / (BAR * 2)) % 4
    dur = BAR * 2 + 0.6
    p = pad(ch[index], dur, 0.2 if warm else 0.15)
    if not warm:
        tt = np.arange(len(p)) / SR
        p = p * (0.58 + 0.42 * np.exp(-((tt % BEAT) * 7))).astype(np.float32)
    add(p, t, 1.0, -0.18)
    add(p, t, 1.0, 0.18)
    t += BAR * 2

# bass, drums, arpeggio
t = 0.0
while t < DUR:
    drums, arp, _, bl = energy(t)
    bar = int(t / BAR)
    index = bar % 4
    if bl > 0.05:
        for b in range(4):
            add(bass(m2f(ROOTS[index]), BEAT * 0.92, 0.3), t + b * BEAT, bl * (0.9 if b % 2 == 0 else 0.55))
    if drums > 0.05:
        for b in range(4):
            tt = t + b * BEAT
            if drums > 0.8:
                add(kick(0.95), tt, drums * 0.85)
            elif b in (0, 2):
                add(kick(0.9), tt, drums * 0.9)
            else:
                add(kick(0.55), tt + BEAT * 0.5, drums * 0.45)
            add(hat(0.12), tt + BEAT * 0.5, drums * 0.85, 0.15)
            if b == 3:
                add(hat(0.08), tt + BEAT * 0.75, drums * 0.6, -0.15)
        if bar % 2 == 1:
            add(snare(0.28), t + BEAT, drums, 0.05)
            add(snare(0.3), t + BEAT * 3, drums, -0.05)
    if arp > 0.05:
        notes = CHORDS_WARM[index] if MOOD == "warm" else CHORDS[index]
        seeds = rng.permutation(notes + [notes[0] + 12])
        for step in range(16):
            tt = t + step * BEAT / 4
            f = m2f(int(seeds[step % 4]) + (12 if step % 8 == 5 else 0))
            add(pluck(f, 0.28, 0.16, 1.2), tt, arp * (0.5 if step % 4 == 0 else 0.3), 0.35 if step % 2 else -0.35)
    t += BAR

# risers into every scene change
for sc in TL[1:]:
    d = min(3.2, max(0.6, (sc["end"] - sc["start"]) * 0.35))
    add(riser(d, 0.18), max(0.0, sc["start"] - d + 0.2), 1.0)
    add(kick(0.5), sc["start"], 0.55)

fade = int(min(6.0, DUR * 0.25) * SR)
if fade > 0:
    L[-fade:] *= np.linspace(1, 0, fade).astype(np.float32)
    R[-fade:] *= np.linspace(1, 0, fade).astype(np.float32)

mix = np.stack([L, R], axis=1)
peak = np.max(np.abs(mix)) + 1e-9
mix = np.tanh(mix / peak * 1.15) * 0.82
data = (mix * 32767).astype(np.int16)

with wave.open(OUT, "wb") as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes(data.tobytes())

print(json.dumps({"ok": True, "out": OUT, "seconds": round(DUR, 2)}))
