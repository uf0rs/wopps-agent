import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

export const HOME = process.env.UF0RS_MONTAGE_HOME
  ? path.resolve(process.env.UF0RS_MONTAGE_HOME)
  : path.join(os.homedir(), ".cache", "uf0rs", "montage");

export const ENGINE = path.join(HOME, "engine");
export const SFX_DIR = path.join(HOME, "sfx");
export const COLORS = {
  dim: "\u001b[2m",
  green: "\u001b[32m",
  yellow: "\u001b[33m",
  red: "\u001b[31m",
  cyan: "\u001b[36m",
  bold: "\u001b[1m",
  reset: "\u001b[0m",
};

export const paint = (color, text) => `${COLORS[color]}${text}${COLORS.reset}`;
export const log = (message) => console.log(message);
export const step = (message) => console.log(`${paint("cyan", "▸")} ${message}`);
export const ok = (message) => console.log(`${paint("green", "✓")} ${message}`);
export const warn = (message) => console.log(`${paint("yellow", "!")} ${message}`);
export const fail = (message) => {
  console.error(`${paint("red", "✗")} ${message}`);
  process.exitCode = 1;
};

export const readJson = async (file) => JSON.parse(await fs.promises.readFile(file, "utf8"));
export const writeJson = async (file, value) => {
  await fs.promises.mkdir(path.dirname(file), { recursive: true });
  await fs.promises.writeFile(file, `${JSON.stringify(value, null, 2)}\n`, "utf8");
};
export const exists = (file) => fs.existsSync(file);
export const ensureDir = async (dir) => fs.promises.mkdir(dir, { recursive: true });

export const sha1 = (value) => createHash("sha1").update(value).digest("hex").slice(0, 16);
export const sha256 = (value) => createHash("sha256").update(value).digest("hex").slice(0, 20);
export const hashFile = async (file) =>
  createHash("sha256").update(await fs.promises.readFile(file)).digest("hex").slice(0, 20);

export const run = (command, args, options = {}) =>
  new Promise((resolve, reject) => {
    // .cmd/.bat shims on Windows can only be launched through the shell.
    const shim = process.platform === "win32" && /\.(cmd|bat)$/i.test(command);
    const child = spawn(command, args, {
      stdio: options.stdio ?? "inherit",
      cwd: options.cwd,
      env: { ...process.env, ...options.env },
      windowsHide: true,
      shell: shim,
    });
    let output = "";
    if (child.stdout) child.stdout.on("data", (chunk) => (output += chunk.toString()));
    if (child.stderr) child.stderr.on("data", (chunk) => (output += chunk.toString()));
    child.once("error", reject);
    child.once("close", (code) => {
      if (code === 0) return resolve(output);
      const error = new Error(`${path.basename(command)} exited with code ${code}`);
      error.code = code;
      error.output = output;
      reject(error);
    });
  });

export const capture = async (command, args, options = {}) => {
  const output = await run(command, args, { ...options, stdio: "pipe" });
  return output;
};

export const parseArgs = (argv) => {
  const positional = [];
  const flags = {};
  for (let index = 0; index < argv.length; index += 1) {
    const item = argv[index];
    if (!item.startsWith("--")) {
      positional.push(item);
      continue;
    }
    const [name, inline] = item.slice(2).split("=", 2);
    if (inline !== undefined) {
      flags[name] = inline;
      continue;
    }
    const next = argv[index + 1];
    if (next === undefined || next.startsWith("--")) {
      flags[name] = true;
      continue;
    }
    flags[name] = next;
    index += 1;
  }
  return { positional, flags };
};

export const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

/** Small print table used by doctor/status. */
export const table = (rows) => {
  const width = Math.max(...rows.map(([label]) => label.length));
  for (const [label, value, note] of rows) {
    console.log(`  ${label.padEnd(width)}  ${value}${note ? paint("dim", `  ${note}`) : ""}`);
  }
};

export const relative = (from, to) => path.relative(from, to).split(path.sep).join("/");
