import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Backdrop, FrameCorners } from "../components/Background";
import { Kicker, Kinetic, MaskText } from "../components/Type";
import { useC } from "../lib/colors";
import { useLayout } from "../lib/theme";
import { clamp, easeOutExpo } from "../lib/anim";
import type { SceneProps, TitleScene } from "../types";

export const Title: React.FC<SceneProps> = ({ scene }) => {
  const s = scene as TitleScene;
  const c = useC();
  const frame = useCurrentFrame();
  const { u, portrait, pad, contentWidth } = useLayout();
  const align = portrait ? "center" : "left";
  const headline = s.headline.split("\n").join("\n");
  const rule = easeOutExpo(clamp((frame - 8) / 26));
  const tint = s.accent ?? c.accent;

  return (
    <AbsoluteFill>
      <Backdrop bg={s.bg ?? "glow"} accent={tint} />
      <FrameCorners />
      <AbsoluteFill
        style={{
          padding: pad,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: portrait ? "center" : "flex-start",
          gap: 26 * u,
        }}
      >        {s.kicker ? <Kicker text={s.kicker} at={2} color={tint} size={Math.round(19 * u)} /> : null}
        <MaskText
          text={headline}
          at={6}
          size={Math.round((portrait ? 74 : 96) * u)}
          align={align}
          dir="left"
          maxWidth={contentWidth}
          style={{ textTransform: "none", letterSpacing: -2.4 * u }}
        />
        <div
          style={{
            width: contentWidth * 0.42 * rule,
            height: Math.max(2, 3 * u),
            background: `linear-gradient(90deg, ${tint}, transparent)`,
            boxShadow: `0 0 22px ${tint}88`,
          }}
        />
        {s.sub ? (
          <Kinetic
            text={s.sub}
            at={18}
            size={Math.round((portrait ? 34 : 38) * u)}
            weight={400}
            color={c.dim}
            align={align}
            maxWidth={contentWidth * 0.82}
            stagger={1.4}
            rise={16}
            blur={6}
          />
        ) : null}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
