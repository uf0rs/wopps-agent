import React, { useMemo, useRef, useEffect } from "react";
import { Img, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { mulberry32 } from "../lib/anim";
import { useC } from "../lib/colors";
import type { Background } from "../types";

/** film grain, jittered per frame */
export const Grain: React.FC<{ opacity?: number }> = ({ opacity = 0.05 }) => {
  const frame = useCurrentFrame();
  return (
    <Img
      src={staticFile("grain.png")}
      style={{
        position: "absolute",
        inset: -160,
        width: "calc(100% + 320px)",
        height: "calc(100% + 320px)",
        objectFit: "cover",
        transform: `translate(${(frame * 37) % 160 - 80}px, ${(frame * 61) % 160 - 80}px)`,
        opacity,
        mixBlendMode: "overlay",
        pointerEvents: "none",
      }}
    />
  );
};

export const Vignette: React.FC<{ strength?: number }> = ({ strength = 0.85 }) => (
  <div
    style={{
      position: "absolute",
      inset: 0,
      background: `radial-gradient(ellipse 82% 72% at 50% 45%, rgba(0,0,0,0) 28%, rgba(0,0,0,${strength}) 100%)`,
      pointerEvents: "none",
    }}
  />
);

export const Scanlines: React.FC<{ opacity?: number }> = ({ opacity = 0.05 }) => (
  <div
    style={{
      position: "absolute",
      inset: 0,
      background:
        "repeating-linear-gradient(0deg, rgba(255,255,255,0.5) 0px, rgba(255,255,255,0.5) 1px, transparent 1px, transparent 4px)",
      opacity,
      pointerEvents: "none",
      mixBlendMode: "overlay",
    }}
  />
);

export const Glow: React.FC<{
  x?: number;
  y?: number;
  size?: number;
  color?: string;
  opacity?: number;
}> = ({ x = 50, y = 50, size = 1100, color, opacity = 0.3 }) => {
  const c = useC();
  return (
    <div
      style={{
        position: "absolute",
        left: `${x}%`,
        top: `${y}%`,
        width: size,
        height: size,
        transform: "translate(-50%,-50%)",
        background: `radial-gradient(circle, ${color ?? c.accent} 0%, transparent 62%)`,
        opacity,
        pointerEvents: "none",
        mixBlendMode: "screen",
      }}
    />
  );
};

export const GridFloor: React.FC<{ opacity?: number; horizon?: number }> = ({ opacity = 0.3, horizon = 60 }) => {
  const frame = useCurrentFrame();
  const c = useC();
  const shift = (frame * 1.2) % 100;
  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", opacity }}>
      <div
        style={{
          position: "absolute",
          left: "-30%",
          right: "-30%",
          top: `${horizon}%`,
          bottom: "-40%",
          transform: "perspective(760px) rotateX(64deg)",
          transformOrigin: "top center",
          backgroundImage: `linear-gradient(${c.accent2}66 1px, transparent 1px), linear-gradient(90deg, ${c.accent2}66 1px, transparent 1px)`,
          backgroundSize: "110px 110px",
          backgroundPosition: `0px ${shift}px`,
          maskImage: "linear-gradient(to bottom, rgba(0,0,0,0.85), transparent 76%)",
          WebkitMaskImage: "linear-gradient(to bottom, rgba(0,0,0,0.85), transparent 76%)",
        }}
      />
    </div>
  );
};

export const GridBg: React.FC<{ opacity?: number; step?: number }> = ({ opacity = 0.14, step = 84 }) => {
  const frame = useCurrentFrame();
  const c = useC();
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        backgroundImage: `linear-gradient(${c.accent2}55 1px, transparent 1px), linear-gradient(90deg, ${c.accent2}55 1px, transparent 1px)`,
        backgroundSize: `${step}px ${step}px`,
        backgroundPosition: `${(frame * 0.3) % step}px ${(frame * 0.18) % step}px`,
        opacity,
        maskImage: "radial-gradient(ellipse 90% 85% at 50% 50%, #000 18%, transparent 84%)",
        WebkitMaskImage: "radial-gradient(ellipse 90% 85% at 50% 50%, #000 18%, transparent 84%)",
      }}
    />
  );
};

/** drifting dust rendered on canvas, deterministic per frame */
export const ParticleField: React.FC<{
  count?: number;
  seed?: number;
  speed?: number;
  opacity?: number;
}> = ({ count = 190, seed = 7, speed = 1, opacity = 1 }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const c = useC();
  const ref = useRef<HTMLCanvasElement>(null);

  const pts = useMemo(() => {
    const rnd = mulberry32(seed);
    return Array.from({ length: count }, () => ({
      x: rnd(),
      y: rnd(),
      z: rnd(),
      ph: rnd() * Math.PI * 2,
      sp: 0.4 + rnd() * 1.6,
    }));
  }, [count, seed]);

  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, width, height);
    const t = frame / 30;
    for (const p of pts) {
      const zz = 0.25 + p.z * 1.5;
      const x =
        (((p.x * (width + 240) + t * 26 * p.sp * speed * zz) % (width + 240)) + width + 240) % (width + 240) - 120;
      const y =
        ((((p.y * (height + 240) - t * 16 * p.sp * speed * zz) % (height + 240)) + height + 240) % (height + 240)) -
        120 +
        Math.sin(t * 0.5 + p.ph) * 14 * zz;
      const r = 0.5 + p.z * 2.1;
      const a = (0.1 + p.z * 0.42) * opacity;
      if (p.z > 0.84) {
        const g = ctx.createRadialGradient(x, y, 0, x, y, r * 14);
        g.addColorStop(0, c.accent);
        g.addColorStop(1, "rgba(0,0,0,0)");
        ctx.globalAlpha = a * 0.45;
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(x, y, r * 14, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = a;
      ctx.fillStyle = c.accent;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }, [frame, width, height, pts, speed, opacity, c.accent]);

  return <canvas ref={ref} width={width} height={height} style={{ position: "absolute", inset: 0 }} />;
};

export const Nebula: React.FC<{ intensity?: number }> = ({ intensity = 1 }) => {
  const frame = useCurrentFrame();
  const c = useC();
  const t = frame / 30;
  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
      <div
        style={{
          position: "absolute",
          width: 1600,
          height: 1600,
          left: 900 + Math.sin(t * 0.16) * 180 - 800,
          top: 540 + Math.cos(t * 0.13) * 140 - 800,
          background: `radial-gradient(circle, ${c.accent2}33 0%, transparent 62%)`,
          filter: "blur(40px)",
          opacity: 0.85 * intensity,
        }}
      />
      <div
        style={{
          position: "absolute",
          width: 1300,
          height: 1300,
          left: 300 + Math.cos(t * 0.11) * 160 - 650,
          top: 700 + Math.sin(t * 0.19) * 120 - 650,
          background: `radial-gradient(circle, ${c.accent}22 0%, transparent 65%)`,
          filter: "blur(50px)",
          opacity: 0.8 * intensity,
        }}
      />
    </div>
  );
};

export const FrameCorners: React.FC<{ inset?: number; size?: number; opacity?: number }> = ({
  inset = 46,
  size = 52,
  opacity = 0.9,
}) => {
  const c = useC();
  const color = `${c.accent}88`;
  const common = { position: "absolute" as const, width: size, height: size, opacity };
  return (
    <>
      <div style={{ ...common, left: inset, top: inset, borderLeft: `1.5px solid ${color}`, borderTop: `1.5px solid ${color}` }} />
      <div style={{ ...common, right: inset, top: inset, borderRight: `1.5px solid ${color}`, borderTop: `1.5px solid ${color}` }} />
      <div style={{ ...common, left: inset, bottom: inset, borderLeft: `1.5px solid ${color}`, borderBottom: `1.5px solid ${color}` }} />
      <div style={{ ...common, right: inset, bottom: inset, borderRight: `1.5px solid ${color}`, borderBottom: `1.5px solid ${color}` }} />
    </>
  );
};

/** The scene backdrop: base gradient + one hero effect + optional camera drift. */
export const Backdrop: React.FC<{
  bg?: Background;
  accent?: string;
  drift?: boolean;
  grain?: boolean;
}> = ({ bg = "glow", accent, drift = true, grain = true }) => {
  const c = useC();
  const frame = useCurrentFrame();
  const t = frame / 30;
  const zoom = drift ? 1 + Math.sin(t * 0.12) * 0.008 : 1;
  const push = drift ? 1 + clamp01(t / 40) * 0.03 : 1;
  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
      <div
        style={{
          position: "absolute",
          inset: -80,
          background: `radial-gradient(ellipse 120% 90% at 50% 0%, ${c.bgSoft} 0%, ${c.bg} 62%)`,
          transform: `scale(${zoom * push})`,
        }}
      />
      {bg === "grid" ? <GridBg /> : null}
      {bg === "floor" ? <GridFloor /> : null}
      {bg === "particles" ? <ParticleField /> : null}
      {bg === "nebula" ? <Nebula /> : null}
      {(bg === "glow" || bg === "particles" || bg === "nebula") ? (
        <Glow x={68} y={26} color={accent} opacity={bg === "glow" ? 0.26 : 0.16} />
      ) : null}
      {(bg === "glow" || bg === "grid") ? <Glow x={18} y={82} color={c.accent2} opacity={0.16} /> : null}
      <Vignette />
      {grain ? <Grain /> : null}
    </div>
  );
};

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
