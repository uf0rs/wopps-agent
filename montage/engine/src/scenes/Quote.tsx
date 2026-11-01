import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Backdrop } from "../components/Background";
import { Kinetic, MaskText } from "../components/Type";
import { useC } from "../lib/colors";
import { FONTS, useLayout } from "../lib/theme";
import { clamp, easeOutExpo } from "../lib/anim";
import type { QuoteScene, SceneProps } from "../types";

export const Quote: React.FC<SceneProps> = ({ scene }) => {
  const s = scene as QuoteScene;
  const c = useC();
  const frame = useCurrentFrame();
  const { u, pad, contentWidth, portrait } = useLayout();
  const tint = s.accent ?? c.accent;
  const mark = easeOutExpo(clamp(frame / 24));

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
          gap: 26 * u,
        }}
      >
        <div
          style={{
            fontFamily: FONTS.display,
            fontSize: Math.round(160 * u),
            lineHeight: 0.6,
            color: tint,
            opacity: 0.35 * mark,
            transform: `translateY(${(1 - mark) * 16 * u}px)`,
          }}
        >
          “
        </div>
        <MaskText
          text={s.text}
          at={6}
          size={Math.round((portrait ? 46 : 56) * u)}
          weight={500}
          align="center"
          dir="up"
          maxWidth={contentWidth * 0.88}
          style={{ fontFamily: FONTS.body, textTransform: "none", letterSpacing: -1 * u, lineHeight: 1.24 }}
        />
        {s.author ? (
          <div style={{ display: "flex", alignItems: "center", gap: 14 * u }}>
            <div style={{ width: 46 * u, height: 1.5 * u, background: tint, opacity: 0.7 }} />
            <Kinetic
              text={s.author}
              at={22}
              size={Math.round(20 * u)}
              font={FONTS.mono}
              color={c.dim}
              stagger={1}
              rise={8}
              blur={2}
              tracking={2}
            />
          </div>
        ) : null}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
