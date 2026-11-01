import React from "react";
import { AbsoluteFill, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { Backdrop } from "../components/Background";
import { MaskText } from "../components/Type";
import { Panel } from "../components/Ui";
import { useC } from "../lib/colors";
import { FONTS, useLayout } from "../lib/theme";
import { clamp } from "../lib/anim";
import type { CompareScene, SceneProps } from "../types";

export const Compare: React.FC<SceneProps> = ({ scene, duration }) => {
  const s = scene as CompareScene;
  const c = useC();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { u, pad, contentWidth, portrait } = useLayout();
  const gap = Math.max(1, (duration - 24) / 2);

  const columns = [
    { ...s.left, tint: s.left.tone === "good" ? c.green : c.red, sign: "−" },
    { ...s.right, tint: s.right.tone === "bad" ? c.red : c.green, sign: "+" },
  ];

  return (
    <AbsoluteFill>
      <Backdrop bg={s.bg ?? "grid"} accent={s.accent ?? c.accent} />
      <AbsoluteFill style={{ padding: pad, display: "flex", flexDirection: "column", justifyContent: "center", gap: 34 * u }}>
        {s.title ? (
          <MaskText
            text={s.title}
            at={4}
            size={Math.round(50 * u)}
            dir="up"
            maxWidth={contentWidth}
            style={{ textTransform: "none", letterSpacing: -1.2 * u }}
          />
        ) : null}
        <div style={{ display: "flex", flexDirection: portrait ? "column" : "row", gap: 20 * u }}>
          {columns.map((col, index) => {
            const at = 12 + index * gap;
            const p = clamp(spring({ frame: frame - at, fps, config: { damping: 18, mass: 0.7, stiffness: 110 } }));
            return (
              <Panel
                key={col.title}
                style={{
                  flex: 1,
                  padding: `${26 * u}px ${28 * u}px`,
                  display: "flex",
                  flexDirection: "column",
                  gap: 16 * u,
                  opacity: p,
                  transform: `translateY(${(1 - p) * 24 * u}px)`,
                  borderColor: `${col.tint}44`,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 12 * u }}>
                  <div
                    style={{
                      width: 34 * u,
                      height: 34 * u,
                      borderRadius: 999,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      background: `${col.tint}18`,
                      border: `1px solid ${col.tint}55`,
                      color: col.tint,
                      fontFamily: FONTS.mono,
                      fontSize: Math.round(19 * u),
                    }}
                  >
                    {col.sign}
                  </div>
                  <div style={{ fontFamily: FONTS.body, fontSize: Math.round(30 * u), fontWeight: 600, color: c.white }}>
                    {col.title}
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 * u }}>
                  {col.items.map((item, itemIndex) => {
                    const atItem = at + 6 + itemIndex * 5;
                    const q = clamp((frame - atItem) / 9);
                    return (
                      <div
                        key={item + itemIndex}
                        style={{
                          display: "flex",
                          gap: 10 * u,
                          alignItems: "baseline",
                          opacity: q,
                          transform: `translateX(${(1 - q) * 12 * u}px)`,
                          fontFamily: FONTS.body,
                          fontSize: Math.round(22 * u),
                          color: q > 0.9 ? c.white : c.dim,
                          lineHeight: 1.35,
                        }}
                      >
                        <span style={{ color: col.tint, fontFamily: FONTS.mono, fontSize: Math.round(16 * u) }}>■</span>
                        {item}
                      </div>
                    );
                  })}
                </div>
              </Panel>
            );
          })}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
