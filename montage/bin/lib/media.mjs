import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { ENGINE, run, exists, warn } from "./util.mjs";

const require = createRequire(import.meta.url);

const executable = (candidate) => {
  if (!candidate) return null;
  const file = typeof candidate === "string" ? candidate : candidate?.path;
  if (!file) return null;
  return fs.existsSync(file) ? file : null;
};

/** ffmpeg resolution order: explicit env → bundled npm binaries → PATH → known installs. */
export const resolveMedia = () => {
  const fromEnv = (process.env.MONTAGE_FFMPEG && process.env.MONTAGE_FFPROBE)
    ? { ffmpeg: process.env.MONTAGE_FFMPEG, ffprobe: process.env.MONTAGE_FFPROBE }
    : null;
  if (fromEnv && exists(fromEnv.ffmpeg) && exists(fromEnv.ffprobe)) return { ...fromEnv, source: "env" };

  try {
    const ffmpeg = require(path.join(ENGINE, "node_modules", "ffmpeg-static"));
    const ffprobe = require(path.join(ENGINE, "node_modules", "ffprobe-static"));
    const found = { ffmpeg: executable(ffmpeg), ffprobe: executable(ffprobe), source: "bundled" };
    if (found.ffmpeg && found.ffprobe) return found;
  } catch {
    // not installed yet
  }

  try {
    const ffmpeg = execFileSync(process.platform === "win32" ? "where.exe" : "which", ["ffmpeg"], {
      encoding: "utf8",
      windowsHide: true,
    })
      .split(/\r?\n/)[0]
      .trim();
    const ffprobe = execFileSync(process.platform === "win32" ? "where.exe" : "which", ["ffprobe"], {
      encoding: "utf8",
      windowsHide: true,
    })
      .split(/\r?\n/)[0]
      .trim();
    if (ffmpeg && ffprobe) return { ffmpeg, ffprobe, source: "path" };
  } catch {
    // not on PATH
  }

  const known = [
    path.join(process.env.USERPROFILE ?? "", "Desktop", "WOPPS_Motion_Studio", "tools", "ffmpeg-9.0.2-essentials_build", "bin"),
    path.join(process.env.HOME ?? "", "Desktop", "WOPPS_Motion_Studio", "tools", "ffmpeg-9.0.2-essentials_build", "bin"),
  ];
  for (const dir of known) {
    const suffix = process.platform === "win32" ? ".exe" : "";
    const ffmpeg = path.join(dir, `ffmpeg${suffix}`);
    const ffprobe = path.join(dir, `ffprobe${suffix}`);
    if (exists(ffmpeg) && exists(ffprobe)) return { ffmpeg, ffprobe, source: dir };
  }

  return { ffmpeg: null, ffprobe: null, source: null };
};

export const requireMedia = () => {
  const media = resolveMedia();
  if (!media.ffmpeg || !media.ffprobe) {
    throw new Error("ffmpeg не найден. Запустите `montage setup` (поставит ffmpeg-static) или задайте MONTAGE_FFMPEG/MONTAGE_FFPROBE.");
  }
  return media;
};

export const probeDuration = async (file) => {
  const { ffprobe } = requireMedia();
  const output = await run(
    ffprobe,
    ["-v", "error", "-show_entries", "format=duration", "-of", "default=noprint_wrappers=1:nokey=1", file],
    { stdio: "pipe" },
  );
  const value = Number.parseFloat(output.trim());
  if (!Number.isFinite(value)) throw new Error(`не удалось измерить длительность: ${file}`);
  return value;
};

export const probeVideo = async (file) => {
  const { ffprobe } = requireMedia();
  const output = await run(
    ffprobe,
    [
      "-v", "error",
      "-show_entries", "format=duration,size,bit_rate",
      "-show_entries", "stream=index,codec_type,codec_name,width,height,r_frame_rate,sample_rate,channels",
      "-of", "json",
      file,
    ],
    { stdio: "pipe" },
  );
  const data = JSON.parse(output);
  const video = data.streams?.find((stream) => stream.codec_type === "video");
  const audio = data.streams?.find((stream) => stream.codec_type === "audio");
  return {
    duration: Number.parseFloat(data.format?.duration ?? "0"),
    size: Number.parseInt(data.format?.size ?? "0", 10),
    bitrate: Number.parseInt(data.format?.bit_rate ?? "0", 10),
    video,
    audio,
    raw: data,
  };
};

export const concatParts = async (parts, output) => {
  const { ffmpeg } = requireMedia();
  const list = `${output}.concat.txt`;
  await fs.promises.writeFile(
    list,
    parts.map((part) => `file '${part.replaceAll("'", "'\\''").replaceAll("\\", "/")}'`).join("\n"),
    "utf8",
  );
  await run(ffmpeg, ["-y", "-v", "error", "-f", "concat", "-safe", "0", "-i", list, "-c", "copy", output]);
  await fs.promises.rm(list, { force: true });
};

export const muxAudio = async (video, audio, output) => {
  const { ffmpeg } = requireMedia();
  await run(ffmpeg, [
    "-y", "-v", "error",
    "-i", video,
    "-i", audio,
    "-map", "0:v:0",
    "-map", "1:a:0",
    "-c:v", "copy",
    "-c:a", "aac",
    "-b:a", "256k",
    "-shortest",
    "-movflags", "+faststart",
    output,
  ]);
};

export const loudness = async (file) => {
  const { ffmpeg } = requireMedia();
  const output = await run(ffmpeg, ["-hide_banner", "-nostats", "-i", file, "-filter_complex", "ebur128=peak=true", "-f", "null", "-"], {
    stdio: "pipe",
  }).catch((error) => error.output ?? "");
  const integrated = [...String(output).matchAll(/I:\s+(-?[\d.]+) LUFS/g)].at(-1);
  const truePeak = [...String(output).matchAll(/Peak:\s+(-?[\d.]+) dBFS/g)].at(-1);
  return {
    lufs: integrated ? Number.parseFloat(integrated[1]) : null,
    truePeak: truePeak ? Number.parseFloat(truePeak[1]) : null,
  };
};

export const blackFrames = async (file) => {
  const { ffmpeg } = requireMedia();
  const output = await run(
    ffmpeg,
    ["-hide_banner", "-nostats", "-i", file, "-vf", "blackdetect=d=0.6:pix_th=0.06", "-an", "-f", "null", "-"],
    { stdio: "pipe" },
  ).catch((error) => error.output ?? "");
  return String(output)
    .split(/\r?\n/)
    .filter((line) => line.includes("black_start"))
    .slice(0, 8);
};

export const renderTip = () => warn("Первый рендер скачивает headless-браузер Remotion (~150 МБ). Дальше он переиспользуется.");
