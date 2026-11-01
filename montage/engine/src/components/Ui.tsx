import React from "react";
import { useCurrentFrame } from "remotion";
import { useC } from "../lib/colors";
import { FONTS } from "../lib/theme";

export const Panel: React.FC<{
  children?: React.ReactNode;
  style?: React.CSSProperties;
  glow?: boolean;
}> = ({ children, style, glow = false }) => {
  const c = useC();
  return (
    <div
      style={{
        background: c.panel,
        border: `1px solid ${c.line}`,
        borderRadius: 18,
        boxShadow: glow
          ? `0 40px 120px -50px ${c.accent}66, inset 0 1px 0 rgba(255,255,255,0.06)`
          : "0 40px 120px -60px rgba(0,0,0,0.9), inset 0 1px 0 rgba(255,255,255,0.05)",
        backdropFilter: "blur(10px)",
        ...style,
      }}
    >
      {children}
    </div>
  );
};

/** macOS-style window chrome with a URL pill. */
export const WindowFrame: React.FC<{
  title?: string;
  url?: string;
  children?: React.ReactNode;
  style?: React.CSSProperties;
  chrome?: boolean;
}> = ({ title, url, children, style, chrome = true }) => {
  const c = useC();
  return (
    <Panel style={{ overflow: "hidden", display: "flex", flexDirection: "column", ...style }} glow>
      {chrome ? (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 18,
            padding: "16px 22px",
            borderBottom: `1px solid ${c.line}`,
            background: `${c.bgSoft}cc`,
          }}
        >
          <div style={{ display: "flex", gap: 8 }}>
            {["#FF5F57", "#FEBC2E", "#28C840"].map((color) => (
              <div key={color} style={{ width: 11, height: 11, borderRadius: 11, background: color, opacity: 0.9 }} />
            ))}
          </div>
          {url ? (
            <div
              style={{
                flex: 1,
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "7px 16px",
                borderRadius: 999,
                background: `${c.bg}88`,
                border: `1px solid ${c.line}`,
                fontFamily: FONTS.mono,
                fontSize: 15,
                color: c.dim,
                letterSpacing: 0.4,
              }}
            >
              <span style={{ color: c.green }}>●</span>
              {url}
            </div>
          ) : (
            <div style={{ flex: 1, fontFamily: FONTS.mono, fontSize: 15, color: c.dim, letterSpacing: 2 }}>{title}</div>
          )}
        </div>
      ) : null}
      <div style={{ position: "relative", flex: 1, minHeight: 0 }}>{children}</div>
    </Panel>
  );
};

export const Chip: React.FC<{ children: React.ReactNode; color?: string; size?: number; style?: React.CSSProperties }> = ({
  children,
  color,
  size = 15,
  style,
}) => {
  const c = useC();
  const tint = color ?? c.accent;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        padding: `${size * 0.42}px ${size * 0.9}px`,
        borderRadius: 999,
        border: `1px solid ${tint}44`,
        background: `${tint}12`,
        color: tint,
        fontFamily: FONTS.mono,
        fontSize: size,
        letterSpacing: 1.6,
        textTransform: "uppercase",
        ...style,
      }}
    >
      {children}
    </span>
  );
};

export const Meter: React.FC<{
  value: number;
  at: number;
  dur?: number;
  height?: number;
  color?: string;
  radius?: number;
}> = ({ value, at, dur = 30, height = 8, color, radius = 99 }) => {
  const c = useC();
  const frame = useCurrentFrame();
  const p = Math.min(1, Math.max(0, (frame - at) / Math.max(1, dur)));
  const eased = 1 - Math.pow(1 - p, 3);
  return (
    <div style={{ width: "100%", height, borderRadius: radius, background: `${c.white}12`, overflow: "hidden" }}>
      <div
        style={{
          width: `${Math.min(100, Math.max(0, value)) * eased}%`,
          height: "100%",
          borderRadius: radius,
          background: `linear-gradient(90deg, ${c.accent2}, ${color ?? c.accent})`,
          boxShadow: `0 0 18px ${color ?? c.accent}88`,
        }}
      />
    </div>
  );
};

export const Dot: React.FC<{ color?: string; size?: number; glow?: boolean }> = ({ color, size = 10, glow = true }) => {
  const c = useC();
  const tint = color ?? c.accent;
  return (
    <span
      style={{
        display: "inline-block",
        width: size,
        height: size,
        borderRadius: size,
        background: tint,
        boxShadow: glow ? `0 0 ${size * 1.6}px ${tint}` : undefined,
      }}
    />
  );
};
