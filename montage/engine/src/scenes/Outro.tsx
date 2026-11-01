import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Backdrop, FrameCorners } from "../components/Background";
import { Kinetic, MaskText } from "../components/Type";
import { useC } from "../lib/colors";
import { FONTS, useLayout } from "../lib/theme";
import { clamp, easeOutExpo } from "../lib/anim";
import type { OutroScene, SceneProps } from "../types";

export const Outro: React.FC<SceneProps> = ({ scene }) => {
  const s = scene as OutroScene;
  const c = useC();
  const frame = useCurrentFrame();
  const { u, pad, contentWidth, portrait } = useLayout();
  const tint = s.accent ?? c.accent;
  const ring = easeOutExpo(clamp((frame - 4) / 34));
  const brand = s.brand ?? "WOPPS";

  return (
    <AbsoluteFill>
      <Backdrop bg="nebula" accent={tint} />
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "46%",
          width: 900 * u * ring,
          height: 900 * u * ring,
          transform: "translate(-50%,-50%)",
          borderRadius: "50%",
          border: `1px solid ${tint}22`,
          boxShadow: `inset 0 0 160px ${tint}18`,
        }}
      />
      <FrameCorners />
      <AbsoluteFill
        style={{
          padding: pad,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          gap: 24 * u,
          textAlign: "center",
        }}
      >
        <div
          style={{
            fontFamily: FONTS.display,
            fontSize: Math.round((portrait ? 60 : 74) * u),
            fontWeight: 800,
            letterSpacing: 6 * u,
            color: c.white,
            textShadow: `0 0 40px ${tint}55`,
            opacity: ring,
          }}
        >
          {brand.toUpperCase()}
        </div>
        <MaskText
          text={s.headline}
          at={8}
          size={Math.round((portrait ? 44 : 54) * u)}
          align="center"
          dir="up"
          maxWidth={contentWidth * 0.86}
          style={{ textTransform: "none", letterSpacing: -1.2 * u }}
        />
        {s.sub ? (
          <Kinetic
            text={s.sub}
            at={20}
            size={Math.round(26 * u)}
            weight={400}
            color={c.dim}
            align="center"
            stagger={1}
            rise={12}
            blur={4}
            maxWidth={contentWidth * 0.8}
          />
        ) : null}
        {s.cta ? (
          <div
            style={{
              marginTop: 10 * u,
              padding: `${14 * u}px ${30 * u}px`,
              borderRadius: 999,
              border: `1px solid ${tint}66`,
              background: `${tint}12`,
              color: tint,
              fontFamily: FONTS.mono,
              fontSize: Math.round(20 * u),
              letterSpacing: 2,
              opacity: ring,
              boxShadow: `0 0 40px -12px ${tint}88`,
            }}
          >
            {s.cta}
          </div>
        ) : null}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
