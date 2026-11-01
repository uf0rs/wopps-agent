import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Backdrop } from "../components/Background";
import { WindowFrame } from "../components/Ui";
import { useC } from "../lib/colors";
import { FONTS, useLayout } from "../lib/theme";
import { clamp } from "../lib/anim";
import type { CodeScene, SceneProps } from "../types";

const KEYWORDS = new Set([
  "const", "let", "var", "function", "return", "import", "from", "export", "default", "if", "else", "for",
  "of", "in", "new", "await", "async", "class", "type", "interface", "extends", "implements", "try", "catch",
  "finally", "throw", "switch", "case", "break", "continue", "while", "as", "typeof", "void", "null",
  "true", "false", "undefined", "this", "yield", "static", "public", "private", "readonly", "def", "package",
]);

type Token = { text: string; color: "plain" | "keyword" | "string" | "number" | "comment" | "fn" | "tag" };

const tokenize = (line: string): Token[] => {
  const tokens: Token[] = [];
  const regex = /("([^"\\]|\\.)*"|'([^'\\]|\\.)*'|`([^`\\]|\\.)*`)|(\/\/.*$|#.*$)|(\b\d+(?:\.\d+)?\b)|([A-Za-z_$][\w$]*)|(\s+)|([^\s\w])/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(line))) {
    const text = match[0];
    const color: Token["color"] = match[1]
      ? "string"
      : match[5]
        ? "comment"
        : match[6]
          ? "number"
          : match[7]
            ? KEYWORDS.has(text)
              ? "keyword"
              : /^[A-Z]/.test(text)
                ? "tag"
                : "plain"
            : "plain";
    tokens.push({ text, color });
  }
  return tokens;
};

export const Code: React.FC<SceneProps> = ({ scene, duration }) => {
  const s = scene as CodeScene;
  const c = useC();
  const frame = useCurrentFrame();
  const { u, pad, contentWidth, height } = useLayout();
  const tint = s.accent ?? c.accent;
  const perLine = Math.max(3, (duration - 26) / Math.max(1, s.lines.length));
  const visible = Math.min(s.lines.length, Math.floor((frame - 10) / perLine) + 1);
  const activeLine = clamp(visible - 1, 0, s.lines.length - 1);
  const colors: Record<Token["color"], string> = {
    plain: c.white,
    keyword: c.violet,
    string: c.green,
    number: c.amber,
    comment: c.dim,
    fn: tint,
    tag: c.accent2,
  };

  return (
    <AbsoluteFill>
      <Backdrop bg={s.bg ?? "grid"} accent={tint} />
      <AbsoluteFill style={{ padding: pad, display: "flex", flexDirection: "column", justifyContent: "center" }}>
        <WindowFrame url={s.file ?? "src/app.ts"} style={{ height: height * 0.74, width: contentWidth }}>
          <div
            style={{
              padding: `${26 * u}px 0`,
              fontFamily: FONTS.mono,
              fontSize: Math.round(25 * u),
              lineHeight: 1.62,
              display: "flex",
              flexDirection: "column",
            }}
          >
            {s.lines.slice(0, visible).map((line, index) => {
              const p = clamp((frame - (10 + index * perLine)) / 8);
              const isActive = index === activeLine && frame < 10 + s.lines.length * perLine + 6;
              const bg =
                line.kind === "add"
                  ? `${c.green}14`
                  : line.kind === "del"
                    ? `${c.red}14`
                    : line.kind === "accent"
                      ? `${tint}10`
                      : isActive
                        ? `${c.white}06`
                        : "transparent";
              const marker = line.kind === "add" ? "+" : line.kind === "del" ? "−" : " ";
              return (
                <div
                  key={index}
                  style={{
                    display: "flex",
                    gap: 18 * u,
                    padding: `${2 * u}px ${26 * u}px`,
                    background: bg,
                    borderLeft: `2px solid ${line.kind === "add" ? c.green : line.kind === "del" ? c.red : isActive ? tint : "transparent"}`,
                    opacity: p,
                  }}
                >
                  <span style={{ width: 34 * u, color: c.dim, opacity: 0.5, textAlign: "right" }}>{index + 1}</span>
                  <span style={{ width: 16 * u, color: line.kind === "add" ? c.green : line.kind === "del" ? c.red : c.dim }}>
                    {marker}
                  </span>
                  <span
                    style={{
                      whiteSpace: "pre",
                      color: line.kind === "dim" ? c.dim : c.white,
                      textDecoration: line.kind === "del" ? "line-through" : undefined,
                    }}
                  >
                    {tokenize(line.text).map((token, tokenIndex) => (
                      <span key={tokenIndex} style={{ color: line.kind === "dim" ? c.dim : colors[token.color] }}>
                        {token.text}
                      </span>
                    ))}
                    {isActive ? <span style={{ color: tint }}>▌</span> : null}
                  </span>
                </div>
              );
            })}
          </div>
        </WindowFrame>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
