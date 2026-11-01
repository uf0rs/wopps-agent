import type { Project } from "./types";

/** Fallback project so `remotion studio` previews something useful before a brief exists. */
export const DEMO: Project = {
  slug: "demo",
  title: "WOPPS Montage demo",
  width: 1920,
  height: 1080,
  fps: 30,
  brand: { name: "WOPPS", accent: "#28E9FF", tagline: "motion, generated" },
  hud: true,
  captions: false,
  totalFrames: 300,
  totalSeconds: 10,
  scenes: [
    {
      id: "s01",
      type: "title",
      duration: 80,
      kicker: "WOPPS // montage",
      headline: "Видео\nиз одной фразы",
      sub: "Сценарий, голос, музыка, рендер — автоматически",
      bg: "glow",
    },
    {
      id: "s02",
      type: "stats",
      duration: 90,
      kicker: "пайплайн",
      title: "10 минут за один прогон",
      items: [
        { label: "сцен", value: 16, suffix: "" },
        { label: "реплик", value: 112 },
        { label: "кадров", value: 18510 },
      ],
      bg: "grid",
    },
    {
      id: "s03",
      type: "outro",
      duration: 130,
      headline: "Готово. Без монтажной программы.",
      sub: "Один brief — один MP4 со звуком и субтитрами",
      cta: "/montage",
      bg: "nebula",
    },
  ],
  captionsData: [],
};
