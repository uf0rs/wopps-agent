import React from "react";
import { spring, useCurrentFrame, useVideoConfig } from "remotion";
import { FONTS } from "../lib/theme";
import { clamp, easeOutExpo, progress } from "../lib/anim";
import { useC } from "../lib/colors";

type Base = {
  text: string;
  at: number;
  stagger?: number;
  size?: number;
  weight?: number;
  font?: string;
  color?: string;
  tracking?: number;
  lineHeight?: number;
  align?: React.CSSProperties["textAlign"];
  maxWidth?: number | string;
  upper?: boolean;
  blur?: number;
  italic?: boolean;
  style?: React.CSSProperties;
  accent?: number[];
  accentColor?: string;
  rise?: number;
};

/** word-by-word spring reveal: the workhorse for voice-synced statements */
export const Kinetic: React.FC<Base> = ({
  text,
  at,
  stagger = 3,
  size = 64,
  weight = 600,
  font = FONTS.body,
  color,
  tracking = -0.5,
  lineHeight = 1.12,
  align = "left",
  maxWidth,
  upper = false,
  blur = 10,
  italic = false,
  style,
  accent = [],
  accentColor,
  rise = 28,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const c = useC();
  const words = text.split(" ");
  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: `0 ${size * 0.26}px`,
        maxWidth,
        fontFamily: font,
        fontSize: size,
        fontWeight: weight,
        lineHeight,
        letterSpacing: tracking,
        textAlign: align,
        justifyContent: align === "center" ? "center" : align === "right" ? "flex-end" : "flex-start",
        fontStyle: italic ? "italic" : "normal",
        textTransform: upper ? "uppercase" : "none",
        color: color ?? c.white,
        ...style,
      }}
    >
      {words.map((word, index) => {
        const p = spring({
          frame: frame - at - index * stagger,
          fps,
          config: { damping: 18, mass: 0.55, stiffness: 130 },
        });
        const v = clamp(p);
        return (
          <span
            key={`${word}-${index}`}
            style={{
              display: "inline-block",
              opacity: v,
              transform: `translateY(${(1 - v) * rise}px)`,
              filter: blur > 0 ? `blur(${(1 - v) * blur}px)` : undefined,
              color: accent.includes(index) ? (accentColor ?? c.accent) : "inherit",
            }}
          >
            {word}
          </span>
        );
      })}
    </div>
  );
};

/** line reveal through a moving mask: big cinematic statements */
export const MaskText: React.FC<Base & { dur?: number; dir?: "up" | "left" | "right" }> = ({
  text,
  at,
  dur = 20,
  size = 112,
  weight = 700,
  font = FONTS.display,
  color,
  tracking = -2,
  lineHeight = 1,
  align = "left",
  maxWidth,
  upper = true,
  dir = "left",
  style,
  accent = [],
  accentColor,
}) => {
  const frame = useCurrentFrame();
  const c = useC();
  const lines = text.split("\n");
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: align === "center" ? "center" : align === "right" ? "flex-end" : "flex-start",
        fontFamily: font,
        fontSize: size,
        fontWeight: weight,
        lineHeight,
        letterSpacing: tracking,
        textAlign: align,
        maxWidth,
        textTransform: upper ? "uppercase" : "none",
        color: color ?? c.white,
        ...style,
      }}
    >
      {lines.map((line, index) => {
        const p = clamp((frame - at - index * Math.round(dur * 0.35)) / dur);
        const e = easeOutExpo(p);
        const clip =
          dir === "left"
            ? `inset(0% ${(1 - e) * 100}% 0% 0%)`
            : dir === "right"
              ? `inset(0% 0% 0% ${(1 - e) * 100}%)`
              : `inset(${(1 - e) * 100}% 0% 0% 0%)`;
        return (
          <div key={line + index} style={{ clipPath: clip, WebkitClipPath: clip, overflow: "hidden", paddingBottom: size * 0.06 }}>
            <div
              style={{
                transform: `translateX(${dir === "left" ? (1 - e) * -32 : dir === "right" ? (1 - e) * 32 : 0}px)`,
                color: accent.includes(index) ? (accentColor ?? c.accent) : "inherit",
              }}
            >
              {line}
            </div>
          </div>
        );
      })}
    </div>
  );
};

/** typewriter with blinking caret */
export const Typed: React.FC<{
  text: string;
  at: number;
  cps?: number;
  size?: number;
  color?: string;
  font?: string;
  weight?: number;
  caret?: boolean;
  style?: React.CSSProperties;
  tracking?: number;
}> = ({ text, at, cps = 1.6, size = 34, color, font = FONTS.mono, weight = 400, caret = true, style, tracking = 0 }) => {
  const frame = useCurrentFrame();
  const c = useC();
  const shown = Math.max(0, Math.floor((frame - at) * cps));
  const visible = text.slice(0, Math.min(text.length, shown));
  const blink = Math.floor(frame / 14) % 2 === 0 || shown < text.length;
  return (
    <span
      style={{
        fontFamily: font,
        fontSize: size,
        color: color ?? c.white,
        fontWeight: weight,
        whiteSpace: "pre",
        letterSpacing: tracking,
        ...style,
      }}
    >
      {visible}
      {caret ? <span style={{ opacity: blink ? 1 : 0, color: c.accent, marginLeft: 2 }}>█</span> : null}
    </span>
  );
};

/** animated number */
export const Counter: React.FC<{
  to: number;
  at: number;
  dur?: number;
  size?: number;
  color?: string;
  font?: string;
  weight?: number;
  suffix?: string;
  prefix?: string;
  decimals?: number;
}> = ({ to, at, dur = 36, size = 96, color, font = FONTS.mono, weight = 700, suffix = "", prefix = "", decimals = 0 }) => {
  const frame = useCurrentFrame();
  const c = useC();
  const p = easeOutExpo(progress(frame, at, at + dur));
  const value = (to * p).toFixed(decimals);
  const formatted = decimals === 0
    ? String(Math.round(to * p)).replace(/\B(?=(\d{3})+(?!\d))/g, " ")
    : Number(value).toLocaleString("ru-RU");
  return (
    <span style={{ fontFamily: font, fontSize: size, color: color ?? c.white, fontWeight: weight, fontVariantNumeric: "tabular-nums" }}>
      {prefix}
      {formatted}
      {suffix}
    </span>
  );
};

/** small uppercase kicker with a glowing dot */
export const Kicker: React.FC<{
  text: string;
  at?: number;
  color?: string;
  size?: number;
  dot?: boolean;
  style?: React.CSSProperties;
}> = ({ text, at = 0, color, size = 19, dot = true, style }) => {
  const frame = useCurrentFrame();
  const c = useC();
  const p = clamp((frame - at) / 12);
  const tint = color ?? c.accent;
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        fontFamily: FONTS.mono,
        fontSize: size,
        letterSpacing: 4,
        textTransform: "uppercase",
        color: tint,
        opacity: p,
        transform: `translateY(${(1 - easeOutExpo(p)) * 10}px)`,
        ...style,
      }}
    >
      {dot ? (
        <span style={{ width: 8, height: 8, borderRadius: 8, background: tint, boxShadow: `0 0 14px ${tint}` }} />
      ) : null}
      {text}
    </div>
  );
};

/** per-character scramble/decode effect */
export const Decode: React.FC<{
  text: string;
  at: number;
  dur?: number;
  size?: number;
  color?: string;
  font?: string;
  weight?: number;
  style?: React.CSSProperties;
  tracking?: number;
}> = ({ text, at, dur = 30, size = 90, color, font = FONTS.display, weight = 800, style, tracking = 2 }) => {
  const frame = useCurrentFrame();
  const c = useC();
  const glyphs = "ABVG0123456789#@$%&*<>/";
  return (
    <div
      style={{
        fontFamily: font,
        fontSize: size,
        color: color ?? c.white,
        fontWeight: weight,
        letterSpacing: tracking,
        whiteSpace: "pre",
        ...style,
      }}
    >
      {text.split("").map((char, index) => {
        const start = at + (index / Math.max(1, text.length)) * dur * 0.55;
        const p = clamp((frame - start) / (dur * 0.45));
        if (char === " ") return " ";
        if (p >= 1) return <span key={index}>{char}</span>;
        return (
          <span key={index} style={{ opacity: p < 0.15 ? 0.2 : 0.75 }}>
            {glyphs[Math.floor((frame * 7 + index * 13) % glyphs.length)]}
          </span>
        );
      })}
    </div>
  );
};
