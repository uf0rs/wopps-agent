#!/usr/bin/env node
/**
 * WOPPS Montage CLI
 *
 * Deterministic pipeline behind the /montage command:
 *   brief + scenes -> voice -> timeline -> score + sfx -> mix -> render -> mp4
 *
 * Every stage is content-hashed, so re-running a build only redoes what changed.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  ENGINE,
  HOME,
  SFX_DIR,
  capture,
  clamp,
  ensureDir,
  exists,
  fail,
  hashFile,
  log,
  ok,
  paint,
  parseArgs,
  readJson,
  relative,
  run,
  sha1,
  sha256,
  step,
  table,
  warn,
  writeJson,
} from "./lib/util.mjs";
import { concatParts, loudness, blackFrames, muxAudio, probeDuration, probeVideo, requireMedia, resolveMedia } from "./lib/media.mjs";
import { buildTimeline, estimateSeconds, normalizeScenes, scenesOf, toSrt } from "./lib/timeline.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PYTHON_DIR = path.join(ROOT, "python");
const KIT_ENGINE = path.join(ROOT, "engine");
const PYTHON = process.env.MONTAGE_PYTHON || (process.platform === "win32" ? "python" : "python3");
const NPM = process.platform === "win32" ? "npm.cmd" : "npm";

const ASPECTS = {
  "16:9": [1920, 1080],
  "9:16": [1080, 1920],
  "1:1": [1080, 1080],
  "4:5": [1080, 1350],
  "4k": [3840, 2160],
};

const ENERGY = {
  title: 0.25,
  statement: 0.35,
  bullets: 0.55,
  terminal: 0.7,
  code: 0.65,
  window: 0.6,
  screenshot: 0.6,
  stats: 0.8,
  compare: 0.6,
  steps: 0.6,
  montage: 0.95,
  quote: 0.2,
  outro: 0.5,
};

const PROFILES = {
  draft: { scale: 0.5, crf: 30, preset: "veryfast", segments: 2, suffix: "draft", jpeg: 82 },
  final: { scale: 1, crf: 16, preset: "medium", segments: 3, suffix: "final", jpeg: 94 },
};

// ---------------------------------------------------------------- helpers

const projectPaths = (dir) => {
  const project = path.resolve(dir);
  return {
    dir: project,
    brief: path.join(project, "brief.json"),
    scenes: path.join(project, "scenes.json"),
    props: path.join(project, "project.json"),
    state: path.join(project, ".montage", "state.json"),
    vo: path.join(project, ".montage", "vo"),
    voWav: path.join(project, ".montage", "vo_wav"),
    cache: path.join(project, ".montage", "cache"),
    out: path.join(project, "out"),
    subtitles: path.join(project, "subtitles.srt"),
    publicDir: path.join(ENGINE, "public", "projects"),
  };
};

const loadState = async (paths) => (exists(paths.state) ? readJson(paths.state) : {});
const saveState = async (paths, state) => writeJson(paths.state, state);

const pythonModule = async (module) => {
  const output = await capture(PYTHON, ["-c", `import ${module}; print(getattr(${module}, "__version__", "ok"))`], {}).catch(
    () => null,
  );
  return output ? output.trim().split(/\r?\n/).at(-1) : null;
};

const lastJson = (output) => {
  const line = String(output)
    .split(/\r?\n/)
    .filter((item) => item.trim().startsWith("{"))
    .at(-1);
  if (!line) throw new Error(`не удалось прочитать JSON из ответа скрипта:\n${output}`);
  return JSON.parse(line);
};

const runPython = async (script, payload, options = {}) => {
  const temp = path.join(HOME, "jobs", `${Date.now()}-${path.basename(script, ".py")}.json`);
  await writeJson(temp, payload);
  try {
    return await run(PYTHON, [path.join(PYTHON_DIR, script), temp], { cwd: ROOT, stdio: options.stdio ?? "pipe" }).catch(
      (error) => {
        const detail = String(error.output ?? "").trim().split(/\r?\n/).slice(-12).join("\n");
        throw new Error(`${script} упал:\n${detail || error.message}`);
      },
    );
  } finally {
    if (options.keep !== true) await fs.promises.rm(temp, { force: true }).catch(() => {});
  }
};

const remotion = () => {
  const manifest = path.join(ENGINE, "node_modules", "@remotion", "cli", "package.json");
  if (!exists(manifest)) return null;
  const pkg = JSON.parse(fs.readFileSync(manifest, "utf8"));
  const bin = typeof pkg.bin === "string" ? pkg.bin : pkg.bin?.remotion;
  if (!bin) return null;
  const cli = path.join(ENGINE, "node_modules", "@remotion", "cli", bin);
  return [process.execPath, cli];
};

const engineReady = () => Boolean(remotion()) && exists(path.join(ENGINE, "src", "index.ts"));

const ensureEngine = () => {
  if (!engineReady()) {
    throw new Error(
      "движок монтажа не установлен. Выполните `montage setup` один раз (ставит Remotion и ffmpeg в кэш).",
    );
  }
  requireMedia();
};

const hashDir = async (dir) => {
  const files = [];
  const walk = async (current) => {
    for (const item of await fs.promises.readdir(current, { withFileTypes: true })) {
      const full = path.join(current, item.name);
      if (item.isDirectory()) await walk(full);
      else files.push(full);
    }
  };
  await walk(dir);
  const digest = sha1(
    (
      await Promise.all(
        files.sort().map(async (file) => `${relative(dir, file)}:${await hashFile(file)}`),
      )
    ).join("|"),
  );
  return digest;
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// ---------------------------------------------------------------- setup

const syncEngine = async () => {
  await ensureDir(ENGINE);
  const engineHashFile = path.join(ENGINE, ".source");
  const sourceHash = await hashDir(path.join(KIT_ENGINE, "src"));
  const current = exists(engineHashFile) ? (await fs.promises.readFile(engineHashFile, "utf8")).trim() : "";
  const needCopy = current !== sourceHash || !exists(path.join(ENGINE, "package.json"));
  if (needCopy) {
    await fs.promises.cp(KIT_ENGINE, ENGINE, {
      recursive: true,
      force: true,
      filter: (src) => !src.includes(`${path.sep}node_modules`) && !src.includes(`${path.sep}public${path.sep}projects`),
    });
    await fs.promises.writeFile(engineHashFile, sourceHash, "utf8");
  }
  return { copied: needCopy, sourceHash };
};

const cmdSetup = async () => {
  log(paint("bold", "\nWOPPS Montage · установка движка\n"));
  step(`кэш: ${HOME}`);
  const sync = await syncEngine();
  ok(sync.copied ? "движок синхронизирован" : "движок уже актуален");

  if (!exists(path.join(ENGINE, "node_modules", "remotion"))) {
    step("npm install (Remotion, ffmpeg-static, ffprobe-static) — один раз, ~2-4 мин");
    await run(NPM, ["install", "--no-audit", "--no-fund"], { cwd: ENGINE });
  }
  ok("зависимости на месте");

  const cli = remotion();
  if (cli) {
    step("headless-браузер Remotion");
    await run(cli[0], [...cli.slice(1), "browser", "ensure"], { cwd: ENGINE }).catch(() => {
      warn("браузер не подтвердился сейчас — Remotion докачает его при первом рендере");
    });
  }

  const numpy = await pythonModule("numpy");
  const edge = await pythonModule("edge_tts");
  if (numpy && edge) ok(`python-аудио готово (numpy ${numpy})`);
  else
    warn(
      `python-аудио не готово: numpy=${numpy ?? "нет"}, edge-tts=${edge ?? "нет"}. Установите: ${PYTHON} -m pip install numpy edge-tts`,
    );
  ok("готово. Дальше: /montage в новой сессии или `montage init <папка>`");
};

const cmdDoctor = async () => {
  log(paint("bold", "\nWOPPS Montage · диагностика\n"));
  const media = resolveMedia();
  const cli = remotion();
  const rows = [];
  rows.push(["node", process.version, process.execPath]);
  rows.push(["платформа", `${process.platform}/${process.arch}`, `CPU ${os.cpus().length} потоков`]);
  rows.push(["движок", cli ? paint("green", "установлен") : paint("yellow", "нет") + " — montage setup", ENGINE]);
  rows.push(["ffmpeg", media.ffmpeg ? paint("green", "ok") : paint("red", "нет"), media.source ?? ""]);
  rows.push(["ffprobe", media.ffprobe ? paint("green", "ok") : paint("red", "нет"), ""]);
  const python = await capture(PYTHON, ["--version"], {}).catch(() => null);
  rows.push(["python", python ? paint("green", python.trim()) : paint("yellow", "нет"), "нужен для голоса/музыки"]);
  const numpy = python ? await pythonModule("numpy") : null;
  const edge = python ? await pythonModule("edge_tts") : null;
  rows.push(["numpy", numpy ? paint("green", numpy) : paint("yellow", "нет"), "музыка и сведение"]);
  rows.push(["edge-tts", edge ? paint("green", edge) : paint("yellow", "нет"), "бесплатный нейроголос"]);
  rows.push(["шрифты", exists(path.join(ENGINE, "public", "fonts", "Unbounded.ttf")) ? paint("green", "ok") : paint("yellow", "нет"), "cyrillic"]);
  table(rows);
  log("");
};

// ---------------------------------------------------------------- init / plan

const STARTER_SCENES = (title, sub) => [
  {
    id: "s01",
    type: "title",
    kicker: "WOPPS",
    headline: title,
    sub,
    bg: "glow",
  },
  {
    id: "s02",
    type: "statement",
    lines: [title],
    sub: "Замените сцены в scenes.json — движок сам посчитает тайминг",
    bg: "particles",
    vo: "",
  },
  {
    id: "s03",
    type: "outro",
    headline: "Готово.",
    sub: "Один brief — один MP4 со звуком и субтитрами",
    cta: "/montage",
    bg: "nebula",
  },
];

const cmdInit = async (positional, flags) => {
  const dir = positional[0] ?? "montage-project";
  const paths = projectPaths(dir);
  if (exists(paths.brief) && !flags.force) {
    fail(`${paths.brief} уже существует. Возьмите --force, чтобы перезаписать.`);
    return;
  }
  await ensureDir(paths.dir);

  const brief = flags.brief
    ? await readJson(path.resolve(String(flags.brief)))
    : {
        slug: path.basename(paths.dir),
        title: String(flags.title ?? "Новый ролик"),
        subtitle: String(flags.subtitle ?? ""),
        lang: String(flags.lang ?? "ru"),
        aspect: String(flags.aspect ?? "16:9"),
        fps: Number(flags.fps ?? 30),
        seconds: Number(flags.seconds ?? 60),
        audience: "",
        style: "",
        brand: { name: String(flags.brand ?? "WOPPS"), accent: String(flags.accent ?? "#28E9FF") },
        theme: String(flags.theme ?? "dark"),
        voice: String(flags.voice ?? (String(flags.lang ?? "ru") === "en" ? "en-US-GuyNeural" : "ru-RU-DmitryNeural")),
        voiceRate: String(flags.rate ?? "+6%"),
        music: { mood: String(flags.music ?? "tech"), enabled: flags.music !== "none" },
      };

  if (!brief.aspect || !ASPECTS[brief.aspect]) {
    fail(`aspect должен быть одним из: ${Object.keys(ASPECTS).join(", ")}`);
    return;
  }
  brief.fps = Number(brief.fps ?? 30);
  brief.brand = brief.brand ?? { name: "WOPPS" };
  brief.music = brief.music ?? { mood: "tech", enabled: true };
  brief.title = brief.title ?? path.basename(paths.dir);

  await writeJson(paths.brief, brief);
  if (flags.scenes) {
    await fs.promises.copyFile(path.resolve(String(flags.scenes)), paths.scenes);
  } else if (!exists(paths.scenes)) {
    await writeJson(paths.scenes, { slug: brief.slug ?? path.basename(paths.dir), scenes: STARTER_SCENES(brief.title, brief.subtitle) });
  }
  await ensureDir(paths.out);
  ok(`проект: ${paths.dir}`);
  log(paint("dim", "  1) отредактируйте scenes.json  2) montage build . --profile draft"));
};

const cmdPlan = async (positional) => {
  const dir = positional[0] ?? ".";
  const paths = projectPaths(dir);
  const brief = exists(paths.brief) ? await readJson(paths.brief) : null;
  log(paint("bold", "\nФормат сцен\n"));
  log(
    `{
  "scenes": [
    { "id": "s01", "type": "title",      "kicker": "WOPPS", "headline": "Заголовок", "sub": "Подзаголовок", "bg": "glow", "vo": "Текст озвучки" },
    { "id": "s02", "type": "statement",  "lines": ["МЫСЛЬ", "В ДВЕ СТРОКИ"], "sub": "...", "vo": "..." },
    { "id": "s03", "type": "bullets",    "title": "Заголовок", "items": [{ "title": "Пункт", "text": "Пояснение" }] },
    { "id": "s04", "type": "terminal",   "cwd": "~/project", "commands": [{ "cmd": "npm run build", "out": ["ok 1240 ms"] }] },
    { "id": "s05", "type": "code",       "file": "src/app.ts", "lines": [{ "text": "const x = 1", "kind": "add" }] },
    { "id": "s06", "type": "window",     "url": "app.local", "cards": [{ "title": "Метрика", "text": "…", "meta": "today" }] },
    { "id": "s07", "type": "screenshot", "screenshot": "assets/ui.png", "callouts": ["живой интерфейс"] },
    { "id": "s08", "type": "stats",      "title": "Цифры", "items": [{ "label": "сцен", "value": 16 }] },
    { "id": "s09", "type": "compare",    "left": { "title": "Было", "items": ["…"], "tone": "bad" }, "right": { "title": "Стало", "items": ["…"], "tone": "good" } },
    { "id": "s10", "type": "steps",      "title": "Как это работает", "items": [{ "title": "Шаг", "text": "…" }] },
    { "id": "s11", "type": "montage",    "cards": [{ "tag": "01", "title": "Карточка", "text": "…" }] },
    { "id": "s12", "type": "quote",      "text": "Цитата", "author": "Автор" },
    { "id": "s13", "type": "outro",      "headline": "Финал", "sub": "…", "cta": "/montage" }
  ]
}`,
  );
  log(paint("dim", "\nbg: flat | grid | particles | glow | floor | nebula · duration — секунды, если нет vo"));
  log(paint("dim", "vo — строка или массив строк; тайминг сцен считается по реальной длине голоса.\n"));
  if (brief) log(paint("dim", `контекст: ${brief.title} · ${brief.aspect} · ${brief.fps} fps · ${brief.lang}`));
};

// ---------------------------------------------------------------- build

const voiceLines = (scenes) =>
  scenes.flatMap((scene) =>
    scenesOf(scene).map((text, index) => ({
      id: `${scene.id}-l${String(index + 1).padStart(2, "0")}`,
      text,
    })),
  );

const cmdBuild = async (positional, flags) => {
  const paths = projectPaths(positional[0] ?? ".");
  if (!exists(paths.brief) || !exists(paths.scenes)) {
    fail(`не найден brief.json/scenes.json в ${paths.dir}. Сначала \`montage init ${positional[0] ?? "."}\`.`);
    return;
  }
  await syncEngine();
  ensureEngine();
  const started = Date.now();
  const brief = await readJson(paths.brief);
  const scenesFile = await readJson(paths.scenes);
  const rawScenes = Array.isArray(scenesFile) ? scenesFile : scenesFile.scenes;
  if (!Array.isArray(rawScenes) || rawScenes.length === 0) throw new Error("scenes.json пуст");

  const fps = Number(brief.fps ?? 30);
  const profileName = String(flags.profile ?? "draft");
  const profile = PROFILES[profileName];
  if (!profile) throw new Error(`profile: draft | final`);
  const [width, height] = ASPECTS[brief.aspect ?? "16:9"] ?? ASPECTS["16:9"];
  const scenes = normalizeScenes(rawScenes, fps);
  const slug = String(brief.slug ?? path.basename(paths.dir)).replace(/[^\w.-]+/g, "-");
  const state = await loadState(paths);
  const force = Boolean(flags.force);
  const wantVoice = !flags["no-voice"] && voiceLines(scenes).length > 0;
  const musicEnabled = !flags["no-music"] && brief.music?.enabled !== false;

  await ensureDir(paths.vo);
  await ensureDir(paths.voWav);
  await ensureDir(paths.cache);
  await ensureDir(paths.out);

  // 1. voice
  let measured = {};
  if (wantVoice) {
    const lines = voiceLines(scenes);
    const voice = brief.voice ?? "ru-RU-DmitryNeural";
    const rate = brief.voiceRate ?? "+6%";
    const voiceHash = sha1(JSON.stringify({ lines, voice, rate }));
    log("");
    step(`голос: ${lines.length} реплик · ${voice} · ${rate}`);
    const result = lastJson(
      await runPython("voice.py", {
        out: paths.vo,
        voice,
        rate,
        lines: lines.map((line) => ({ ...line, sha: state.voice?.lineShas?.[line.id] })),
      }),
    );
    state.voice = { hash: voiceHash, lineShas: Object.fromEntries(result.results.filter((item) => item.sha).map((item) => [item.id, item.sha])) };
    if (!result.ok) {
      const detail = result.failed.map((item) => `${item.id}: ${item.error ?? "нет файла"}`).join("; ");
      warn(`часть реплик не озвучилась (${detail}) — для них возьму оценку по тексту`);
    }
    if (process.env.MONTAGE_DEBUG) log(paint("dim", JSON.stringify(result).slice(0, 600)));
    ok(`голос готов (${result.count} файлов)`);

    step("измеряю длительности по факту (ffprobe)");
    const byId = {};
    for (const line of lines) {
      const file = path.join(paths.vo, `${line.id}.mp3`);
      if (!exists(file)) continue;
      try {
        byId[line.id] = await probeDuration(file);
      } catch {
        warn(`не удалось измерить ${line.id} — оценка по тексту`);
      }
    }
    measured = {};
    for (const scene of scenes) {
      measured[scene.id] = scenesOf(scene).map((text, index) => {
        const id = `${scene.id}-l${String(index + 1).padStart(2, "0")}`;
        return byId[id] ?? estimateSeconds(text);
      });
    }
    ok("тайминг снят с реального голоса");
  } else {
    state.voice = { hash: "silent", lineShas: {} };
    warn("озвучка отключена — длительности сцен берутся из сцен/оценки");
  }

  // 2. timeline
  step("таймлайн и субтитры");
  const timeline = buildTimeline(
    scenes.map((scene) => ({ ...scene, duration: Number(scene.duration ?? 0) || undefined })),
    { fps, voice: measured },
  );
  await fs.promises.writeFile(paths.subtitles, toSrt(timeline.captions), "utf8");
  ok(`${timeline.scenes.length} сцен · ${(timeline.totalSeconds / 60).toFixed(2)} мин · ${timeline.totalFrames} кадров`);

  // 3. score
  let scoreFile = null;
  if (musicEnabled) {
    step("оригинальная музыка (numpy)");
    const musicHash = sha1(
      JSON.stringify({
        totalSeconds: timeline.totalSeconds,
        mood: brief.music?.mood ?? "tech",
        scenes: timeline.scenes.map((scene) => [scene.start, scene.end, ENERGY[scene.type] ?? 0.6]),
      }),
    );
    scoreFile = path.join(paths.cache, "score.wav");
    if (force || !exists(scoreFile) || state.music !== musicHash) {
      const output = await runPython("music.py", {
        out: scoreFile,
        totalSeconds: timeline.totalSeconds,
        sampleRate: 48000,
        mood: brief.music?.mood ?? "tech",
        scenes: timeline.scenes.map((scene) => ({
          start: scene.start,
          end: scene.end,
          energy: Number(scene.energy ?? ENERGY[scene.type] ?? 0.6),
          mood: scene.mood ?? (scene.type === "quote" || scene.type === "outro" ? "warm" : "tech"),
        })),
      });
      lastJson(output);
      state.music = musicHash;
    }
    ok(`копнулись в score.wav ${exists(scoreFile) ? "" : "(нет)"}`);
  } else {
    state.music = "off";
    warn("музыка отключена");
  }

  // 4. sfx pack (generated once, reused for every project)
  step("библиотека SFX");
  await ensureDir(SFX_DIR);
  const sfxMarker = path.join(SFX_DIR, ".ready");
  if (!exists(sfxMarker)) {
    await runPython("sfx.py", { out: SFX_DIR, sampleRate: 48000 });
    await fs.promises.writeFile(sfxMarker, new Date().toISOString(), "utf8");
  }
  ok("SFX на месте");

  // 5. mix
  const mixFile = path.join(paths.cache, "mix.wav");
  const mixHash = sha1(
    JSON.stringify({
      timeline: timeline.scenes,
      captions: timeline.captions.length,
      voice: state.voice?.hash,
      music: state.music,
      sfx: exists(sfxMarker),
    }),
  );
  if (force || !exists(mixFile) || state.mix !== mixHash) {
    step("сведение: голос + музыка + SFX, сайдчейн-дакинг");
    const output = await runPython("mix.py", {
      out: mixFile,
      sampleRate: 48000,
      ffmpeg: requireMedia().ffmpeg,
      timeline,
      voDir: wantVoice ? paths.vo : null,
      sfxDir: SFX_DIR,
      score: scoreFile,
      voCache: paths.voWav,
    });
    lastJson(output);
    state.mix = mixHash;
  }
  ok("микс готов");

  // 6. assets into the engine public dir
  step("ассеты и input props");
  const publicDir = path.join(paths.publicDir, slug);
  await ensureDir(publicDir);
  if (exists(mixFile)) await fs.promises.copyFile(mixFile, path.join(publicDir, "mix.wav"));
  const rewritten = [];
  for (const scene of scenes) {
    const next = { ...scene };
    if (typeof scene.screenshot === "string" && !/^https?:/i.test(scene.screenshot)) {
      const source = path.resolve(paths.dir, scene.screenshot);
      if (exists(source)) {
        const name = path.basename(source);
        await fs.promises.copyFile(source, path.join(publicDir, name));
        next.screenshot = `projects/${slug}/${name}`;
      } else {
        warn(`скриншот не найден: ${scene.screenshot}`);
      }
    }
    rewritten.push(next);
  }

  const durations = Object.fromEntries(timeline.scenes.map((scene) => [scene.id, scene.durationFrames]));
  const starts = Object.fromEntries(timeline.scenes.map((scene) => [scene.id, scene.startFrame]));
  const props = {
    slug,
    title: brief.title ?? slug,
    width,
    height,
    fps,
    brand: { name: brief.brand?.name ?? "WOPPS", accent: brief.brand?.accent ?? "#28E9FF", tagline: brief.brand?.tagline ?? "" },
    palette: brief.theme === "light" ? { bg: "#F4F6FB", bgSoft: "#E8EDF7" } : brief.palette,
    hud: brief.hud !== false,
    captions: brief.captions !== false,
    audio: exists(mixFile) ? `projects/${slug}/mix.wav` : undefined,
    totalFrames: timeline.totalFrames,
    totalSeconds: timeline.totalSeconds,
    captionsData: timeline.captions,
    scenes: rewritten.map((scene) => ({
      ...scene,
      duration: durations[scene.id],
      at: starts[scene.id],
    })),
  };
  await writeJson(paths.props, props);
  await writeJson(path.join(paths.dir, "timeline.json"), timeline);
  ok(`${props.scenes.length} сцен отданы движку`);

  // 7. render
  step(`рендер (${profileName}): ${width * profile.scale}×${height * profile.scale}, crf ${profile.crf}`);
  const engineHash = exists(path.join(ENGINE, ".source"))
    ? (await fs.promises.readFile(path.join(ENGINE, ".source"), "utf8")).trim()
    : "source";
  const renderHash = sha256(JSON.stringify({ props, profile, engineHash }));
  const renderDir = path.join(paths.out, `render-${profileName}`);
  const videoFile = path.join(paths.out, `video-${profileName}.mp4`);
  const needsRender = force || state[`render:${profileName}`] !== renderHash || !exists(videoFile);

  if (needsRender) {
    await fs.promises.rm(renderDir, { recursive: true, force: true });
    await ensureDir(renderDir);
    const cli = remotion();
    const cores = Math.max(1, os.cpus().length);
    const segments = clamp(Number(flags.segments ?? profile.segments), 1, 6);
    const concurrency = clamp(Math.floor(cores / segments), 1, 16);
    const ranges = [];
    const per = Math.ceil(timeline.totalFrames / segments);
    for (let index = 0; index < segments; index += 1) {
      const from = index * per;
      const to = Math.min(timeline.totalFrames - 1, from + per - 1);
      if (from <= to) ranges.push([from, to]);
    }

    const startedRender = Date.now();
    await Promise.all(
      ranges.map(async ([from, to], index) => {
        const part = path.join(renderDir, `part-${String(index + 1).padStart(2, "0")}.mp4`);
        const args = [
          ...cli.slice(1),
          "render",
          "src/index.ts",
          "Montage",
          part,
          `--props=${paths.props}`,
          `--frames=${from}-${to}`,
          `--concurrency=${concurrency}`,
          "--codec=h264",
          `--crf=${profile.crf}`,
          "--pixel-format=yuv420p",
          `--x264-preset=${profile.preset}`,
          `--jpeg-quality=${profile.jpeg}`,
          "--log=error",
          "--overwrite",
        ];
        if (profile.scale !== 1) args.push(`--scale=${profile.scale}`);
        if (process.env.MONTAGE_DEBUG) args.push("--log=verbose");
        await run(cli[0], args, { cwd: ENGINE });
      }),
    );

    const parts = ranges.map((_, index) => path.join(renderDir, `part-${String(index + 1).padStart(2, "0")}.mp4`));
    if (parts.length > 1) await concatParts(parts, videoFile);
    else await fs.promises.copyFile(parts[0], videoFile);
    state[`render:${profileName}`] = renderHash;
    ok(`видео готово за ${((Date.now() - startedRender) / 1000).toFixed(1)} с`);
  } else {
    ok("видео не изменилось — беру из кэша");
  }

  // 8. mux
  const output = path.join(paths.out, `${profile.suffix}.mp4`);
  step("склейка со звуком");
  if (exists(path.join(publicDir, "mix.wav"))) await muxAudio(videoFile, path.join(publicDir, "mix.wav"), output);
  else await fs.promises.copyFile(videoFile, output);
  await saveState(paths, state);

  const info = await probeVideo(output);
  ok(
    `${paint("bold", relative(process.cwd(), output))} · ${(info.duration / 60).toFixed(2)} мин · ${Math.round(info.size / 1024 / 1024)} МБ · ${((Date.now() - started) / 1000).toFixed(0)} с всего`,
  );
  if (profileName === "draft") log(paint("dim", "  посмотрели, поправили scenes.json → montage build . --profile final"));

  // 9. quick QA on the finished file
  const level = await loudness(output).catch(() => ({ lufs: null, truePeak: null }));
  if (level.lufs !== null) log(paint("dim", `  громкость: ${level.lufs} LUFS · true peak ${level.truePeak} dBTP`));
};

const cmdPoster = async (positional, flags) => {
  const paths = projectPaths(positional[0] ?? ".");
  await syncEngine();
  ensureEngine();
  if (!exists(paths.props)) throw new Error("сначала соберите проект: montage build . --profile draft");
  const props = await readJson(paths.props);
  const frame = Number(flags.frame ?? Math.round(props.totalFrames * 0.12));
  const output = path.resolve(String(flags.out ?? path.join(paths.out, "poster.png")));
  await ensureDir(path.dirname(output));
  const cli = remotion();
  step(`кадр ${frame} → ${relative(process.cwd(), output)}`);
  await run(
    cli[0],
    [
      ...cli.slice(1),
      "still",
      "src/index.ts",
      "Montage",
      output,
      `--props=${paths.props}`,
      `--frame=${clamp(frame, 0, props.totalFrames - 1)}`,
      "--image-format=png",
      "--log=error",
      "--overwrite",
    ],
    { cwd: ENGINE },
  );
  ok("обложка готова");
};

// ---------------------------------------------------------------- qa / status / clean / studio

const cmdQa = async (positional, flags) => {
  const paths = projectPaths(positional[0] ?? ".");
  const file = path.resolve(String(flags.file ?? path.join(paths.out, "final.mp4")));
  if (!exists(file)) {
    fail(`нет файла ${file}. Сначала соберите финал.`);
    return;
  }
  const info = await probeVideo(file);
  const level = await loudness(file);
  const blacks = await blackFrames(file);
  const report = {
    file,
    seconds: Number(info.duration.toFixed(3)),
    sizeMB: Number((info.size / 1024 / 1024).toFixed(1)),
    video: info.video
      ? {
          codec: info.video.codec_name,
          width: info.video.width,
          height: info.video.height,
          fps: info.video.r_frame_rate,
        }
      : null,
    audio: info.audio ? { codec: info.audio.codec_name, rate: info.audio.sample_rate, channels: info.audio.channels } : null,
    loudness: level,
    blackFrames: blacks,
  };
  await writeJson(path.join(paths.out, "qa.json"), report);
  log(paint("bold", "\nПриёмка\n"));
  table([
    ["длительность", `${(info.duration / 60).toFixed(2)} мин`, `${info.duration.toFixed(1)} с`],
    ["размер", `${report.sizeMB} МБ`, ""],
    ["видео", info.video ? `${info.video.codec_name} ${info.video.width}×${info.video.height} ${info.video.r_frame_rate}` : "нет", ""],
    ["звук", report.audio ? `${report.audio.codec} ${report.audio.rate} Гц ${report.audio.channels} канала` : "нет", ""],
    ["громкость", level.lufs === null ? "н/д" : `${level.lufs} LUFS`, level.truePeak === null ? "" : `true peak ${level.truePeak} dBTP`],
    ["чёрные кадры", blacks.length ? paint("yellow", String(blacks.length)) : paint("green", "нет"), ""],
  ]);
  log(paint("dim", `\nотчёт: ${relative(process.cwd(), path.join(paths.out, "qa.json"))}\n`));
};

const cmdStatus = async (positional) => {
  const paths = projectPaths(positional[0] ?? ".");
  if (!exists(paths.brief)) {
    fail(`нет проекта в ${paths.dir}`);
    return;
  }
  const brief = await readJson(paths.brief);
  const state = await loadState(paths);
  const timeline = exists(paths.props) ? await readJson(paths.props) : null;
  log(paint("bold", `\n${brief.title ?? path.basename(paths.dir)}`));
  log(paint("dim", `${brief.aspect} · ${brief.fps} fps · ${brief.voice} · ${brief.music?.mood ?? "tech"}`));
  if (timeline) {
    log("");
    table(
      timeline.scenes.map((scene, index) => [
        `${String(index + 1).padStart(2, "0")} ${scene.type}`,
        `${(scene.duration / timeline.fps).toFixed(1)} с`,
        scene.headline ?? scene.title ?? "",
      ]),
    );
    log(paint("dim", `\nитого ${(timeline.totalSeconds / 60).toFixed(2)} мин · ${timeline.totalFrames} кадров`));
  }
  const files = [
    ["draft", path.join(paths.out, "draft.mp4")],
    ["final", path.join(paths.out, "final.mp4")],
    ["субтитры", paths.subtitles],
  ].filter(([, file]) => exists(file));
  if (files.length) {
    log("");
    for (const [label, file] of files) log(`  ${label.padEnd(10)} ${relative(process.cwd(), file)}`);
  }
  log(paint("dim", `\nсостояние: ${Object.keys(state).filter((key) => !key.includes(":")).join(", ") || "пусто"}\n`));
};

const cmdClean = async (positional, flags) => {
  const paths = projectPaths(positional[0] ?? ".");
  await fs.promises.rm(path.join(paths.out, "render-draft"), { recursive: true, force: true });
  await fs.promises.rm(path.join(paths.out, "render-final"), { recursive: true, force: true });
  await fs.promises.rm(paths.voWav, { recursive: true, force: true });
  if (flags.all) {
    await fs.promises.rm(path.join(paths.dir, ".montage"), { recursive: true, force: true });
    await fs.promises.rm(paths.out, { recursive: true, force: true });
  }
  if (flags.video) {
    await fs.promises.rm(path.join(paths.out, "draft.mp4"), { force: true });
    await fs.promises.rm(path.join(paths.out, "final.mp4"), { force: true });
  }
  ok("очищено");
};

const cmdStudio = async (positional) => {
  const paths = projectPaths(positional[0] ?? ".");
  await syncEngine();
  ensureEngine();
  if (!exists(paths.props)) throw new Error("сначала соберите черновик: montage build . --profile draft");
  const cli = remotion();
  step("Remotion Studio: http://localhost:3000");
  await run(cli[0], [...cli.slice(1), "studio", "src/index.ts", `--props=${paths.props}`], { cwd: ENGINE });
};

const HELP = `
${paint("bold", "WOPPS Montage")} — монтаж кодом из одной фразы

${paint("bold", "Команды")}
  montage setup                         один раз: Remotion + ffmpeg в кэш ~/.cache/uf0rs/montage
  montage doctor                        что установлено, чего не хватает
  montage init <папка> [--brief file]   создать проект (brief.json + scenes.json)
  montage plan [<папка>]                показать формат сцен и bg/типы
  montage build <папка> [флаги]         весь пайплайн: голос → таймлайн → музыка → рендер → mp4
  montage status <папка>                сцены, тайминги, готовые файлы
  montage qa <папка>                    приёмка: кодеки, громкость, чёрные кадры
  montage poster <папка> [--frame N]    кадр-обложка PNG (для превью/YouTube)
  montage studio <папка>                живое превью в браузере
  montage clean <папка> [--all]         убрать кэш и/или результаты

${paint("bold", "Флаги build")}
  --profile draft|final     draft = 0.5× и crf 30 (быстро), final = 1080p crf 16
  --no-voice / --no-music   визуальный прогон без звука
  --segments N              параллельные куски рендера (по умолчанию 2/3)
  --force                   пересобрать всё, игнорируя кэш

${paint("bold", "Первый раз")}
  montage setup
  montage init my-video --title "Запуск продукта" --seconds 60
  montage build my-video --profile draft
`;

const main = async () => {
  const { positional, flags } = parseArgs(process.argv.slice(2));
  const command = positional.shift() ?? "help";
  try {
    if (command === "setup") return await cmdSetup();
    if (command === "doctor") return await cmdDoctor();
    if (command === "init" || command === "new") return await cmdInit(positional, flags);
    if (command === "plan") return await cmdPlan(positional);
    if (command === "build" || command === "render") return await cmdBuild(positional, flags);
    if (command === "qa") return await cmdQa(positional, flags);
    if (command === "status") return await cmdStatus(positional);
    if (command === "poster") return await cmdPoster(positional, flags);
    if (command === "clean") return await cmdClean(positional, flags);
    if (command === "studio") return await cmdStudio(positional);
    if (command === "help" || command === "--help" || command === "-h") {
      console.log(HELP);
      return;
    }
    fail(`неизвестная команда: ${command}`);
    console.log(HELP);
  } catch (error) {
    fail(error.message);
    if (process.env.MONTAGE_DEBUG) console.error(error);
    process.exitCode = 1;
  }
};

await main();
