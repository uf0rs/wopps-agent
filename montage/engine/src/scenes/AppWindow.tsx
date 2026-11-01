import React from "react";
import { AbsoluteFill, Img, staticFile, useCurrentFrame } from "remotion";
import { Backdrop } from "../components/Background";
import { WindowFrame } from "../components/Ui";
import { useC } from "../lib/colors";
import { FONTS, useLayout } from "../lib/theme";
import { clamp, easeOut } from "../lib/anim";
import type { SceneProps, WindowScene } from "../types";

export const AppWindow: React.FC<SceneProps> = ({ scene, duration }) => {
  const s = scene as WindowScene;
  const c = useC();
  const frame = useCurrentFrame();
  const { u, pad, contentWidth, height, portrait } = useLayout();
  const tint = s.accent ?? c.accent;
  const push = 1 + clamp(frame / Math.max(1, duration)) * 0.04;
  const callouts = s.callouts ?? [];
  const cards = s.cards ?? [];

  return (
    <AbsoluteFill>
      <Backdrop bg={s.bg ?? "glow"} accent={tint} />
      <AbsoluteFill
        style={{
          padding: pad,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          gap: 24 * u,
        }}
      >
        <WindowFrame url={s.url ?? s.title ?? "app"} style={{ width: contentWidth, height: height * (portrait ? 0.58 : 0.66), overflow: "hidden" }}>
          <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
            {s.screenshot ? (
              <Img
                src={staticFile(s.screenshot)}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  transform: `scale(${push}) translateY(${-4 * (push - 1) * 100}px)`,
                }}
              />
            ) : (
              <div
                style={{
                  padding: `${30 * u}px ${34 * u}px`,
                  display: "grid",
                  gridTemplateColumns: portrait ? "1fr" : "1fr 1fr",
                  gap: 16 * u,
                  height: "100%",
                  alignContent: "center",
                }}
              >
                {cards.map((card, index) => {
                  const at = 12 + index * 7;
                  const p = clamp(easeOut((frame - at) / 12));
                  return (
                    <div
                      key={card.title + index}
                      style={{
                        padding: `${20 * u}px ${22 * u}px`,
                        borderRadius: 14,
                        border: `1px solid ${c.line}`,
                        background: `${c.bgSoft}aa`,
                        display: "flex",
                        flexDirection: "column",
                        gap: 8 * u,
                        opacity: p,
                        transform: `translateY(${(1 - p) * 14 * u}px)`,
                      }}
                    >
                      {card.meta ? (
                        <div style={{ fontFamily: FONTS.mono, fontSize: Math.round(14 * u), letterSpacing: 2, color: tint, textTransform: "uppercase" }}>
                          {card.meta}
                        </div>
                      ) : null}
                      <div style={{ fontFamily: FONTS.body, fontSize: Math.round(26 * u), fontWeight: 600, color: c.white }}>
                        {card.title}
                      </div>
                      {card.text ? (
                        <div style={{ fontFamily: FONTS.body, fontSize: Math.round(19 * u), color: c.dim, lineHeight: 1.35 }}>
                          {card.text}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </WindowFrame>
        {callouts.length > 0 ? (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12 * u, justifyContent: "center", maxWidth: contentWidth }}>
            {callouts.map((text, index) => {
              const at = 20 + index * 8;
              const p = clamp((frame - at) / 12);
              return (
                <div
                  key={text + index}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10 * u,
                    padding: `${9 * u}px ${16 * u}px`,
                    borderRadius: 999,
                    border: `1px solid ${tint}44`,
                    background: `${c.bgSoft}cc`,
                    fontFamily: FONTS.mono,
                    fontSize: Math.round(17 * u),
                    color: c.white,
                    opacity: p,
                    transform: `translateY(${(1 - p) * 10 * u}px)`,
                  }}
                >
                  <span style={{ width: 6 * u, height: 6 * u, borderRadius: 6, background: tint, boxShadow: `0 0 10px ${tint}` }} />
                  {text}
                </div>
              );
            })}
          </div>
        ) : null}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
