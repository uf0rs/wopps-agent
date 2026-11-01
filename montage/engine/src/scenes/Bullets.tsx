import React from "react";
import { AbsoluteFill, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { Backdrop } from "../components/Background";
import { Kicker, Kinetic, MaskText } from "../components/Type";
import { Dot, Panel } from "../components/Ui";
import { useC } from "../lib/colors";
import { useLayout } from "../lib/theme";
import { clamp } from "../lib/anim";
import type { BulletsScene, SceneProps } from "../types";

export const Bullets: React.FC<SceneProps> = ({ scene, duration }) => {
  const s = scene as BulletsScene;
  const c = useC();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { u, pad, contentWidth, portrait } = useLayout();
  const tint = s.accent ?? c.accent;
  const gap = Math.min(34, Math.max(6, (duration - 26) / Math.max(1, s.items.length)));
  const columns = portrait;
  return (
    <AbsoluteFill>
      <Backdrop bg={s.bg ?? "grid"} accent={tint} />
      <AbsoluteFill
        style={{
          padding: pad,
          display: "flex",
          flexDirection: columns ? "column" : "row",
          gap: 48 * u,
          alignItems: columns ? "stretch" : "center",
          justifyContent: "center",
        }}
      >
        <div style={{ width: columns ? "100%" : contentWidth * 0.36, display: "flex", flexDirection: "column", gap: 18 * u }}>
          {s.kicker ? <Kicker text={s.kicker} at={2} color={tint} size={Math.round(17 * u)} /> : null}
          {s.title ? (
            <MaskText
              text={s.title}
              at={5}
              size={Math.round((columns ? 56 : 62) * u)}
              align="left"
              dir="left"
              maxWidth={columns ? contentWidth : contentWidth * 0.36}
              style={{ textTransform: "none", letterSpacing: -1.6 * u }}
            />
          ) : null}
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 14 * u,
            width: columns ? "100%" : undefined,
            justifyContent: "center",
            flex: columns ? "0 1 auto" : 1,
          }}
        >
          {s.items.map((item, index) => {
            const at = 12 + index * gap;
            const p = spring({ frame: frame - at, fps, config: { damping: 20, mass: 0.7, stiffness: 110 } });
            const v = clamp(p);
            return (
              <Panel
                key={item.title + index}
                style={{
                  padding: `${22 * u}px ${26 * u}px`,
                  display: "flex",
                  gap: 20 * u,
                  alignItems: "baseline",
                  opacity: v,
                  transform: `translateX(${(1 - v) * (columns ? -18 : 26) * u}px)`,
                }}
              >
                <div
                  style={{
                    fontFamily: "JetBrains Mono, monospace",
                    fontSize: Math.round(20 * u),
                    color: tint,
                    opacity: 0.85,
                    minWidth: 30 * u,
                  }}
                >
                  {String(index + 1).padStart(2, "0")}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 * u }}>
                  <Kinetic
                    text={item.title}
                    at={at + 2}
                    size={Math.round((columns ? 32 : 34) * u)}
                    weight={600}
                    stagger={1.2}
                    rise={10}
                    blur={4}
                  />
                  {item.text ? (
                    <Kinetic
                      text={item.text}
                      at={at + 8}
                      size={Math.round(23 * u)}
                      weight={400}
                      color={c.dim}
                      stagger={0.7}
                      rise={8}
                      blur={3}
                    />
                  ) : null}
                </div>
              </Panel>
            );
          })}
        </div>
      </AbsoluteFill>
      <Dot color={tint} size={Math.round(8 * u)} />
    </AbsoluteFill>
  );
};
