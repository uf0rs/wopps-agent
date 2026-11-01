import React from "react";
import { AbsoluteFill, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { Backdrop } from "../components/Background";
import { Kicker, MaskText, Counter } from "../components/Type";
import { Meter } from "../components/Ui";
import { useC } from "../lib/colors";
import { FONTS, useLayout } from "../lib/theme";
import { clamp } from "../lib/anim";
import type { SceneProps, StatsScene } from "../types";

export const Stats: React.FC<SceneProps> = ({ scene, duration }) => {
  const s = scene as StatsScene;
  const c = useC();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { u, pad, contentWidth, portrait } = useLayout();
  const tint = s.accent ?? c.accent;
  const gap = Math.min(30, Math.max(6, (duration - 26) / Math.max(1, s.items.length)));
  const max = Math.max(...s.items.map((item) => item.value), 1);

  return (
    <AbsoluteFill>
      <Backdrop bg={s.bg ?? "glow"} accent={tint} />
      <AbsoluteFill
        style={{
          padding: pad,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          gap: 34 * u,
        }}
      >
        {s.kicker ? <Kicker text={s.kicker} at={2} color={tint} size={Math.round(16 * u)} /> : null}
        {s.title ? (
          <MaskText
            text={s.title}
            at={4}
            size={Math.round(54 * u)}
            dir="up"
            maxWidth={contentWidth}
            style={{ textTransform: "none", letterSpacing: -1.4 * u }}
          />
        ) : null}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: portrait ? "1fr" : `repeat(${Math.min(s.items.length, 3)}, 1fr)`,
            gap: 20 * u,
          }}
        >
          {s.items.map((item, index) => {
            const at = 12 + index * gap;
            const p = clamp(spring({ frame: frame - at, fps, config: { damping: 18, mass: 0.7, stiffness: 110 } }));
            const color = item.color ?? [tint, c.accent2, c.violet, c.green][index % 4];
            return (
              <div
                key={item.label + index}
                style={{
                  padding: `${24 * u}px ${26 * u}px`,
                  borderRadius: 18,
                  border: `1px solid ${c.line}`,
                  background: `${c.panel}`,
                  display: "flex",
                  flexDirection: "column",
                  gap: 14 * u,
                  opacity: p,
                  transform: `translateY(${(1 - p) * 20 * u}px)`,
                }}
              >
                <div style={{ fontFamily: FONTS.body, fontSize: Math.round(20 * u), color: c.dim, letterSpacing: 0.4 }}>
                  {item.label}
                </div>
                <Counter
                  to={item.value}
                  at={at + 4}
                  dur={30}
                  size={Math.round((item.value > 9999 ? 56 : 72) * u)}
                  color={color}
                  prefix={item.prefix}
                  suffix={item.suffix}
                />
                <Meter value={(item.value / max) * 100} at={at + 6} dur={30} height={Math.round(7 * u)} color={color} />
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
