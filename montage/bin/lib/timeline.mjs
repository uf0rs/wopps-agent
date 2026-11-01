import { clamp } from "./util.mjs";

const TYPE_DEFAULTS = {
  title: 3.4,
  statement: 3.6,
  bullets: 5.2,
  terminal: 6.5,
  code: 6.5,
  window: 5.6,
  screenshot: 5.6,
  stats: 4.8,
  compare: 5.4,
  steps: 5.6,
  montage: 6.0,
  quote: 4.6,
  outro: 4.4,
};

const TAIL = {
  title: 1.0,
  statement: 0.9,
  quote: 1.0,
  montage: 0.5,
  outro: 1.4,
};

export const estimateSeconds = (text) => {
  const words = String(text ?? "")
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
  if (!words) return 0;
  return clamp(words / 2.45 + 0.75, 1.1, 40);
};

export const scenesOf = (scene) => {
  if (Array.isArray(scene.vo)) return scene.vo.filter((line) => String(line).trim());
  if (typeof scene.vo === "string" && scene.vo.trim()) return [scene.vo];
  return [];
};

export const normalizeScenes = (scenes, fps) =>
  scenes.map((scene, index) => {
    const type = scene.type ?? "statement";
    if (!TYPE_DEFAULTS[type]) {
      throw new Error(`неизвестный тип сцены "${type}" (сцена #${index + 1}). Доступно: ${Object.keys(TYPE_DEFAULTS).join(", ")}`);
    }
    return {
      ...scene,
      id: scene.id ?? `s${String(index + 1).padStart(2, "0")}`,
      type,
      fps,
    };
  });

/**
 * One source of timing: measured voice durations decide scene lengths.
 * `voice` maps scene id -> array of measured seconds (one per VO line).
 */
export const buildTimeline = (scenes, { fps, voice }) => {
  let cursorFrames = 0;
  const result = [];
  const captions = [];

  for (const scene of scenes) {
    const lines = scenesOf(scene);
    const measured = voice?.[scene.id] ?? [];
    const leadIn = lines.length ? 0.26 : 0;
    const tail = TAIL[scene.type] ?? 0.7;

    let seconds = 0;
    if (lines.length) {
      const total = measured.length
        ? measured.reduce((sum, value) => sum + value, 0)
        : lines.reduce((sum, text) => sum + estimateSeconds(text), 0);
      seconds = leadIn + total + tail;
    } else {
      seconds = Number(scene.duration ?? TYPE_DEFAULTS[scene.type]);
    }
    seconds = Math.max(seconds, TYPE_DEFAULTS[scene.type] * 0.55);

    const durationFrames = Math.max(2, Math.round(seconds * fps));
    const startFrame = cursorFrames;
    const start = startFrame / fps;
    const lineRecords = [];
    let lineCursor = start + leadIn;

    lines.forEach((text, index) => {
      const length = measured[index] ?? estimateSeconds(text);
      lineRecords.push({
        file: `${scene.id}-l${String(index + 1).padStart(2, "0")}.mp3`,
        text,
        start: Number(lineCursor.toFixed(3)),
        dur: Number(length.toFixed(3)),
        end: Number((lineCursor + length).toFixed(3)),
      });
      captions.push({
        start: Number(lineCursor.toFixed(3)),
        end: Number((lineCursor + length).toFixed(3)),
        text,
      });
      lineCursor += length;
    });

    result.push({
      id: scene.id,
      type: scene.type,
      title: scene.title ?? scene.headline ?? scene.kicker ?? scene.type,
      start: Number(start.toFixed(3)),
      end: Number(((startFrame + durationFrames) / fps).toFixed(3)),
      dur: Number((durationFrames / fps).toFixed(3)),
      startFrame,
      durationFrames,
      lines: lineRecords,
      cards: scene.cards?.length,
      items: scene.items?.length,
    });

    cursorFrames += durationFrames;
  }

  const totalFrames = cursorFrames;
  return {
    fps,
    totalFrames,
    totalSeconds: Number((totalFrames / fps).toFixed(3)),
    scenes: result,
    captions,
  };
};

const stamp = (seconds) => {
  const ms = Math.max(0, Math.round(seconds * 1000));
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  const rest = ms % 1000;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")},${String(rest).padStart(3, "0")}`;
};

export const toSrt = (captions) =>
  `${captions
    .map((cue, index) => `${index + 1}\n${stamp(cue.start)} --> ${stamp(cue.end)}\n${cue.text}`)
    .join("\n\n")}\n`;
