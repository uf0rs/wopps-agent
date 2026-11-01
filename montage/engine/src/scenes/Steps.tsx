import React from "react";
import { AbsoluteFill, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { Backdrop } from "../components/Background";
import { Kicker, MaskText } from "../components/Type";
import { Dot, Panel } from "../components/Ui";
import { useC } from "../lib/colors";
import { FONTS, useLayout } from "../lib/theme";
import { clamp } from "../lib/anim";
import type { SceneProps, StepsScene } from "../types";

export const Steps: React.FC<SceneProps> = ({ scene, duration }) => {
  const s = scene as StepsScene;
  const c = useC();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { u, pad, contentWidth, portrait } = useLayout();
  const tint = s.accent ?? c.accent;
  const n = Math.max(1, s.items.length);
  const gap = Math.min(40, Math.max(8, (duration - 30) / n));
  const lineGrow = clamp((frame - 14) / Math.max(1, duration - 34));

  return (
    <AbsoluteFill>
      <Backdrop bg={s.bg ?? "grid"} accent={tint} />
      <AbsoluteFill
        style={{
          padding: pad,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          gap: 40 * u,
        }}
      >
        {s.title ? (
          <MaskText
            text={s.title}
            at={4}
            size={Math.round(52 * u)}
            dir="up"
            maxWidth={contentWidth}
            style={{ textTransform: "none", letterSpacing: -1.2 * u }}
          />
        ) : null}
        {s.title ? <Kicker text="процесс" at={2} size={Math.round(15 * u)} color={c.dim} dot={false} /> : null}
        <div
          style={{
            position: "relative",
            display: "flex",
            flexDirection: portrait ? "column" : "row",
            gap: portrait ? 22 * u : 18 * u,
            alignItems: "stretch",
          }}
        >
          {!portrait ? (
            <div
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                top: 34 * u,
                height: 2 * u,
                background: `${c.white}12`,
              }}
            >
              <div
                style={{
                  width: `${lineGrow * 100}%`,
                  height: "100%",
                  background: `linear-gradient(90deg, ${tint}, ${c.accent2})`,
                  boxShadow: `0 0 16px ${tint}aa`,
                }}
              />
            </div>
          ) : null}
          {s.items.map((item, index) => {
            const at = 12 + index * gap;
            const p = clamp(spring({ frame: frame - at, fps, config: { damping: 18, mass: 0.6, stiffness: 120 } }));
            return (
              <div
                key={item.title + index}
                style={{
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  gap: 18 * u,
                  opacity: p,
                  transform: `translateY(${(1 - p) * 18 * u}px)`,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 12 * u }}>
                  <div
                    style={{
                      width: 68 * u,
                      height: 68 * u,
                      borderRadius: 999,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      border: `1px solid ${tint}66`,
                      background: `${tint}14`,
                      boxShadow: `0 0 30px -10px ${tint}88`,
                      fontFamily: FONTS.mono,
                      fontSize: Math.round(22 * u),
                      color: tint,
                    }}
                  >
                    {String(index + 1).padStart(2, "0")}
                  </div>
                  {!portrait ? <Dot color={tint} size={Math.round(7 * u)} /> : null}
                </div>
                <Panel style={{ padding: `${20 * u}px ${22 * u}px`, display: "flex", flexDirection: "column", gap: 8 * u, flex: 1 }}>
                  <div style={{ fontFamily: FONTS.body, fontSize: Math.round(28 * u), fontWeight: 600, color: c.white, letterSpacing: -0.4 }}>
                    {item.title}
                  </div>
                  {item.text ? (
                    <div style={{ fontFamily: FONTS.body, fontSize: Math.round(20 * u), lineHeight: 1.35, color: c.dim }}>
                      {item.text}
                    </div>
                  ) : null}
                </Panel>
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
