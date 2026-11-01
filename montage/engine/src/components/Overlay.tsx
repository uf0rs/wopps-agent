import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { useC } from "../lib/colors";
import { FONTS } from "../lib/theme";
import { clamp, easeOut, fmtTime, wrap } from "../lib/anim";
import type { Caption } from "../types";

export const Captions: React.FC<{
  captions: Caption[];
  size?: number;
}> = ({ captions, size = 32 }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const c = useC();
  const t = frame / fps;
  const cue = captions.find((item) => t >= item.start - 0.05 && t <= item.end + 0.15);
  if (!cue) return null;
  const pIn = clamp((t - cue.start + 0.05) / 0.16);
  const pOut = clamp((cue.end + 0.15 - t) / 0.18);
  const alpha = Math.min(pIn, pOut);
  const lines = wrap(cue.text, width > height ? 62 : 36);
  const unit = Math.min(width / 1920, height / 1080);
  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        bottom: Math.round(height * 0.055),
        display: "flex",
        justifyContent: "center",
        pointerEvents: "none",
        zIndex: 90,
        opacity: alpha,
        transform: `translateY(${(1 - easeOut(pIn)) * 12}px)`,
      }}
    >
      <div
        style={{
          maxWidth: width * 0.78,
          padding: `${Math.round(size * 0.38)}px ${Math.round(size * 0.82)}px`,
          background: "rgba(3,6,12,0.62)",
          border: `1px solid ${c.line}`,
          borderRadius: 12,
          backdropFilter: "blur(5px)",
          boxShadow: "0 18px 50px -24px rgba(0,0,0,0.9)",
          textAlign: "center",
        }}
      >
        {lines.map((line, index) => (
          <div
            key={index}
            style={{
              fontFamily: FONTS.body,
              fontSize: Math.round(size * (unit < 0.7 ? 1.25 : 1)),
              fontWeight: 500,
              lineHeight: 1.32,
              color: "rgba(238,246,255,0.95)",
              letterSpacing: -0.2,
              textShadow: "0 2px 18px rgba(0,0,0,0.85)",
            }}
          >
            {line}
          </div>
        ))}
      </div>
    </div>
  );
};

export const Hud: React.FC<{
  brand: string;
  sceneIndex: number;
  sceneCount: number;
  totalSeconds: number;
  accent?: string;
}> = ({ brand, sceneIndex, sceneCount, totalSeconds, accent }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const c = useC();
  const t = frame / fps;
  const tint = accent ?? c.accent;
  const unit = Math.min(width / 1920, height / 1080);
  const pad = Math.round(Math.min(width, height) * 0.045);
  const progress = clamp(t / Math.max(0.001, totalSeconds));
  return (
    <>
      <div
        style={{
          position: "absolute",
          left: pad,
          top: Math.round(pad * 0.8),
          display: "flex",
          alignItems: "center",
          gap: 12,
          opacity: 0.6,
          fontFamily: FONTS.mono,
          fontSize: Math.round(15 * unit),
          letterSpacing: 5,
          color: c.white,
          zIndex: 80,
        }}
      >
        <span style={{ width: 7, height: 7, borderRadius: 7, background: tint, boxShadow: `0 0 10px ${tint}` }} />
        {brand.toUpperCase()}
      </div>
      <div
        style={{
          position: "absolute",
          right: pad,
          top: Math.round(pad * 0.8),
          display: "flex",
          alignItems: "center",
          gap: 18,
          opacity: 0.42,
          fontFamily: FONTS.mono,
          fontSize: Math.round(14 * unit),
          letterSpacing: 3,
          color: c.dim,
          zIndex: 80,
        }}
      >
        <span>{`${String(sceneIndex).padStart(2, "0")}/${String(sceneCount).padStart(2, "0")}`}</span>
        <span>{fmtTime(t)}</span>
      </div>
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          height: Math.max(2, Math.round(3 * unit)),
          background: `${c.white}0C`,
          zIndex: 85,
        }}
      >
        <div
          style={{
            width: `${progress * 100}%`,
            height: "100%",
            background: `linear-gradient(90deg, ${c.accent2}, ${tint})`,
            boxShadow: `0 0 14px ${tint}aa`,
          }}
        />
      </div>
    </>
  );
};

/** Soft entrance/exit for every scene: fade + tiny camera push. */export const SceneShell: React.FC<{
  duration: number;
  children: React.ReactNode;
  fadeIn?: number;
  fadeOut?: number;
  zoom?: boolean;
}> = ({ duration, children, fadeIn = 10, fadeOut = 8, zoom = true }) => {
  const frame = useCurrentFrame();
  const opacity = Math.min(clamp(frame / Math.max(1, fadeIn)), clamp((duration - frame) / Math.max(1, fadeOut)));
  const scale = zoom ? 1.015 - 0.015 * clamp(frame / Math.max(1, duration)) : 1;
  return (
    <AbsoluteFill style={{ opacity, transform: `scale(${scale})` }}>
      {children}
    </AbsoluteFill>
  );
};

/** A light sweep that lands on every cut, so edits feel intentional. */
export const CutSweep: React.FC<{ cuts: number[]; frame: number; accent?: string }> = ({ cuts, frame, accent }) => {
  const c = useC();
  const tint = accent ?? c.accent;
  const cut = cuts.find((start) => frame >= start - 7 && frame <= start + 9);
  if (cut === undefined) return null;
  const delta = frame - cut;
  const p = clamp((delta + 7) / 16);
  const x = -30 + 160 * easeOut(p);
  const flash = Math.max(0, 1 - Math.abs(delta) / 3) * 0.1;
  return (
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 85 }}>
      <div
        style={{
          position: "absolute",
          left: `${x}%`,
          top: 0,
          bottom: 0,
          width: 460,
          background: `linear-gradient(90deg, transparent, ${tint}14, ${tint}26, transparent)`,
          transform: "skewX(-14deg)",
          opacity: Math.sin(Math.PI * p) * 0.9,
        }}
      />
      <div style={{ position: "absolute", inset: 0, background: tint, opacity: flash, mixBlendMode: "screen" }} />
    </div>
  );
};
