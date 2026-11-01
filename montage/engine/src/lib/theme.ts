import { useVideoConfig } from "remotion";
import type { Palette } from "../types";

const DARK: Palette = {
  bg: "#04060C",
  bgSoft: "#070E1A",
  accent: "#28E9FF",
  accent2: "#3D7BFF",
  white: "#EAF2FF",
  dim: "#7E91AA",
  panel: "rgba(9,17,30,0.78)",
  line: "rgba(120,170,230,0.16)",
  green: "#3DE8A0",
  amber: "#FFB25E",
  red: "#FF5C6A",
  violet: "#9B7BFF",
};

const LIGHT: Palette = {
  bg: "#F4F6FB",
  bgSoft: "#E8EDF7",
  accent: "#1F6BFF",
  accent2: "#00B3C7",
  white: "#0A1220",
  dim: "#5B6B82",
  panel: "rgba(255,255,255,0.86)",
  line: "rgba(20,40,80,0.14)",
  green: "#0FA968",
  amber: "#D97A0C",
  red: "#D93B4B",
  violet: "#6B4DE6",
};

export const palette = (overrides?: Partial<Palette>): Palette => {
  const base = overrides?.bg && isLight(overrides.bg) ? LIGHT : DARK;
  return { ...base, ...overrides };
};

const isLight = (hex: string) => {
  const value = hex.replace("#", "");
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  return r * 0.299 + g * 0.587 + b * 0.114 > 160;
};

export const FONTS = {
  display: "Unbounded, sans-serif",
  body: "Golos Text, sans-serif",
  mono: "JetBrains Mono, monospace",
  wide: "Oswald, sans-serif",
};

/** Layout scale: design canvas is 1920x1080, narrow formats keep text readable. */
export const useLayout = () => {
  const { width, height } = useVideoConfig();
  const portrait = height > width;
  const square = Math.abs(height - width) < 8;
  const u = portrait ? width / 1080 : height / 1080;
  return {
    width,
    height,
    portrait,
    square,
    u,
    pad: Math.round((portrait ? width : height) * 0.075),
    /** content width as a fraction of the frame */
    contentWidth: portrait ? width * 0.86 : width * 0.84,
  };
};
