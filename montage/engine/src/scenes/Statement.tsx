import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Backdrop, ParticleField } from "../components/Background";
import { Decode, Kinetic } from "../components/Type";
import { useC } from "../lib/colors";
import { useLayout } from "../lib/theme";
import { clamp, easeOutExpo } from "../lib/anim";
import type { SceneProps, StatementScene } from "../types";

export const Statement: React.FC<SceneProps> = ({ scene }) => {
  const s = scene as StatementScene;
  const c = useC();
  const frame = useCurrentFrame();
  const { u, pad, contentWidth, portrait } = useLayout();
  const tint = s.accent ?? c.accent;
  const glow = easeOutExpo(clamp(frame / 30));

  return (
    <AbsoluteFill>
      <Backdrop bg={s.bg ?? "particles"} accent={tint} />
      {s.bg === undefined ? <ParticleField opacity={0.55} /> : null}
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "50%",
          width: 1200 * u,
          height: 1200 * u,
          transform: "translate(-50%,-50%)",
          background: `radial-gradient(circle, ${tint}22 0%, transparent 60%)`,
          opacity: glow,
          filter: "blur(10px)",
        }}
      />
      <AbsoluteFill
        style={{
          padding: pad,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          textAlign: "center",
          gap: 30 * u,
        }}
      >
        {s.lines.map((line, index) => (
          <Decode
            key={line + index}
            text={line}
            at={6 + index * 10}
            dur={26}
            size={Math.round((portrait ? 62 : 84) * u)}
            color={index === 0 ? c.white : tint}
            tracking={-1}
            style={{ textTransform: "none", maxWidth: contentWidth }}
          />
        ))}
        {s.sub ? (
          <Kinetic
            text={s.sub}
            at={26}
            size={Math.round((portrait ? 30 : 34) * u)}
            weight={400}
            color={c.dim}
            align="center"
            stagger={1.2}
            rise={14}
            blur={5}
            maxWidth={contentWidth * 0.8}
          />
        ) : null}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
