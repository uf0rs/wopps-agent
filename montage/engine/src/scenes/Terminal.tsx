import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Backdrop } from "../components/Background";
import { WindowFrame } from "../components/Ui";
import { useC } from "../lib/colors";
import { FONTS, useLayout } from "../lib/theme";
import type { SceneProps, TerminalScene } from "../types";

type Block = { cmd: string; out: string[]; start: number; typeFrames: number; outStart: number };

const CPS = 0.85; // characters per frame at 30 fps

const schedule = (commands: TerminalScene["commands"], duration: number): Block[] => {
  const weights = commands.map((item) => item.cmd.length * 0.75 + (item.out?.length ?? 0) * 7 + 16);
  const total = weights.reduce((sum, value) => sum + value, 0) || 1;
  const budget = Math.max(30, duration - 24);
  let cursor = 8;
  return commands.map((item, index) => {
    const typeFrames = Math.min(budget * 0.55, item.cmd.length / CPS);
    const out = item.out ?? [];
    const block: Block = {
      cmd: item.cmd,
      out,
      start: cursor,
      typeFrames,
      outStart: cursor + typeFrames + 4,
    };
    cursor += (weights[index] / total) * budget + 8;
    return block;
  });
};

export const Terminal: React.FC<SceneProps> = ({ scene, duration }) => {
  const s = scene as TerminalScene;
  const c = useC();
  const frame = useCurrentFrame();
  const { u, pad, contentWidth, height, portrait } = useLayout();
  const tint = s.accent ?? c.accent;
  const blocks = schedule(s.commands, duration);
  const active = blocks.findIndex((block) => frame < block.outStart + block.out.length * 6);
  const activeIndex = active === -1 ? blocks.length - 1 : active;

  return (
    <AbsoluteFill>
      <Backdrop bg={s.bg ?? "grid"} accent={tint} grain={false} />
      <AbsoluteFill
        style={{
          padding: pad,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <WindowFrame
          url={s.cwd ?? "cmd"}
          style={{ width: contentWidth, height: height * (portrait ? 0.38 : 0.72) }}
        >
          <div
            style={{
              padding: `${34 * u}px ${40 * u}px`,
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              gap: 10 * u,
              fontFamily: FONTS.mono,
              fontSize: Math.round(25 * u),
              lineHeight: 1.5,
              color: c.white,
              height: "100%",
            }}
          >
            {blocks.map((block, index) => {
              const shown = Math.max(0, Math.floor((frame - block.start) * CPS));
              const typing = frame >= block.start && shown < block.cmd.length;
              const done = shown >= block.cmd.length;
              if (frame < block.start) return null;
              return (
                <div key={block.cmd + index} style={{ display: "flex", flexDirection: "column", gap: 4 * u }}>
                  <div style={{ display: "flex", gap: 14 * u, alignItems: "baseline" }}>
                    <span style={{ color: tint, opacity: 0.9 }}>❯</span>
                    <span style={{ color: c.white }}>{block.cmd.slice(0, typing ? shown : block.cmd.length)}</span>
                    {typing || (index === activeIndex && frame < block.outStart + 6) ? (
                      <span style={{ color: tint, opacity: Math.floor(frame / 10) % 2 ? 0.2 : 1 }}>█</span>
                    ) : null}
                  </div>
                  {done
                    ? block.out.map((line, lineIndex) => {
                        const at = block.outStart + lineIndex * (block.out.length > 6 ? 2 : 5);
                        const p = Math.min(1, Math.max(0, (frame - at) / 8));
                        if (p <= 0) return null;
                        const isOk = /^(ok|done|success|✓|готово|готов|успех)/i.test(line.trim());
                        const isErr = /^(error|fail|✗|ошибка)/i.test(line.trim());
                        return (
                          <div
                            key={line + lineIndex}
                            style={{
                              paddingLeft: 34 * u,
                              color: isOk ? c.green : isErr ? c.red : c.dim,
                              opacity: p,
                              transform: `translateY(${(1 - p) * 6 * u}px)`,
                            }}
                          >
                            {line}
                          </div>
                        );
                      })
                    : null}
                </div>
              );
            })}
          </div>
        </WindowFrame>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
