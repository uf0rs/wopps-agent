import React from "react";
import { AbsoluteFill, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { Backdrop } from "../components/Background";
import { Kicker, MaskText } from "../components/Type";
import { useC } from "../lib/colors";
import { FONTS, useLayout } from "../lib/theme";
import { clamp } from "../lib/anim";
import type { MontageScene, SceneProps } from "../types";

export const Montage: React.FC<SceneProps> = ({ scene, duration }) => {
  const s = scene as MontageScene;
  const c = useC();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { u, pad, contentWidth, portrait } = useLayout();
  const tint = s.accent ?? c.accent;
  const count = Math.max(1, s.cards.length);
  const per = Math.max(1, (duration - 18) / count);
  const columns = portrait ? 1 : count <= 4 ? 2 : 3;
  const current = Math.min(count - 1, Math.floor(Math.max(0, frame - 10) / per));
  const camera = 1 + (current / Math.max(1, count)) * 0.05;

  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      <Backdrop bg={s.bg ?? "nebula"} accent={tint} />
      <AbsoluteFill
        style={{
          padding: pad,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          gap: 26 * u,
          transform: `scale(${camera})`,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", width: contentWidth }}>
          <Kicker text={s.accent ? "montage" : "нарезка"} at={2} color={tint} size={Math.round(16 * u)} />
          <div style={{ fontFamily: FONTS.mono, fontSize: Math.round(15 * u), color: c.dim, letterSpacing: 2 }}>
            {`${String(current + 1).padStart(2, "0")} / ${String(count).padStart(2, "0")}`}
          </div>
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(${columns}, 1fr)`,
            gap: 16 * u,
          }}
        >
          {s.cards.map((card, index) => {
            const at = 10 + index * per;
            const p = clamp(spring({ frame: frame - at, fps, config: { damping: 17, mass: 0.6, stiffness: 130 } }));
            const color = card.color ?? [tint, c.accent2, c.violet, c.green, c.amber, c.red][index % 6];
            const isCurrent = index === current;
            return (
              <div
                key={card.title + index}
                style={{
                  padding: `${22 * u}px ${24 * u}px`,
                  borderRadius: 16,
                  border: `1px solid ${isCurrent ? color : c.line}`,
                  background: isCurrent ? `${color}14` : c.panel,
                  boxShadow: isCurrent ? `0 30px 90px -40px ${color}` : "none",
                  display: "flex",
                  flexDirection: "column",
                  gap: 10 * u,
                  minHeight: 150 * u,
                  opacity: p,
                  transform: `translateY(${(1 - p) * 22 * u}px) scale(${0.96 + p * 0.04})`,
                }}
              >
                {card.tag ? (
                  <div style={{ fontFamily: FONTS.mono, fontSize: Math.round(14 * u), letterSpacing: 2.4, color, textTransform: "uppercase" }}>
                    {card.tag}
                  </div>
                ) : null}
                <div style={{ fontFamily: FONTS.body, fontSize: Math.round(28 * u), fontWeight: 600, lineHeight: 1.18, color: c.white, letterSpacing: -0.5 }}>
                  {card.title}
                </div>
                {card.text ? (
                  <div style={{ fontFamily: FONTS.body, fontSize: Math.round(19 * u), lineHeight: 1.35, color: c.dim }}>
                    {card.text}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
