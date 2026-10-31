import { spawnSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import packageJson from "../package.json" with { type: "json" };

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const engineRoot = path.join(root, "uf0rs-engine");
const cliRoot = path.join(engineRoot, "packages", "cli");
const outputRoot = path.join(root, "dist");
const engineOut = path.join(outputRoot, "engine");
const args = process.argv.slice(2);
const targetIndex = args.indexOf("--target");
const requestedTarget = targetIndex >= 0 ? args[targetIndex + 1] : undefined;
const targets = {
  "node22-win-x64": "uf0rs-windows-x64",
  "node22-win-arm64": "uf0rs-windows-arm64",
  "node22-linux-x64": "uf0rs-linux-x64",
  "node22-linux-arm64": "uf0rs-linux-arm64",
  "node22-macos-x64": "uf0rs-darwin-x64",
  "node22-macos-arm64": "uf0rs-darwin-arm64",
};

if (targetIndex >= 0 && !targets[requestedTarget]) {
  throw new Error(`Unsupported target: ${requestedTarget}. Supported targets: ${Object.keys(targets).join(", ")}`);
}

function runBun(commandArgs, cwd, env = process.env) {
  const command = process.platform === "win32" ? "npm.cmd" : "npm";
  const result = spawnSync(
    command,
    ["exec", "--yes", "--package=bun@1.4.4", "--", "bun", ...commandArgs],
    { cwd, env, stdio: "inherit", windowsHide: true, shell: process.platform === "win32" },
  );
  if (result.error) throw new Error(`Unable to run Bun: ${result.error.message}`);
  if (result.status !== 0) throw new Error(`Bun ${commandArgs[0]} failed with exit code ${result.status}.`);
}

runBun(
  ["install", "--cwd", engineRoot, "--filter", "@opencode/cli", "--filter", "@opencode/app", "--frozen-lockfile"],
  root,
);

const buildArgs = ["script/build.ts", "--outdir=../../../dist/engine"];
const env = { ...process.env };
delete env.OPENCODE_TARGET;
if (requestedTarget) {
  // build.ts prefixes the binary name itself (targetName => `uf0rs-<os>-<arch>`), so only the
  // platform part is expected here; passing the full id fails with "Unknown build target".
  env.OPENCODE_TARGET = targets[requestedTarget].replace(/^uf0rs-/, "");
} else if (!args.includes("--all")) {
  buildArgs.push("--single", "--skip-install");
}
runBun(buildArgs, cliRoot, env);

const releaseTargets = [
  { id: "uf0rs-windows-x64", platform: "win", arch: "x64" },
  { id: "uf0rs-windows-arm64", platform: "win", arch: "arm64" },
  { id: "uf0rs-linux-x64", platform: "linux", arch: "x64" },
  { id: "uf0rs-linux-arm64", platform: "linux", arch: "arm64" },
  { id: "uf0rs-darwin-x64", platform: "macos", arch: "x64" },
  { id: "uf0rs-darwin-arm64", platform: "macos", arch: "arm64" },
];
const hostPlatform = process.platform === "win32" ? "win" : process.platform === "darwin" ? "macos" : "linux";

function isHostTarget(target) {
  return target.platform === hostPlatform && target.arch === process.arch;
}

async function copyTarget(target, installAsCurrent = false) {
  const platformDirectory = target.id.replace(/^uf0rs-/, "");
  const source = path.join(
    engineOut,
    `cli-${platformDirectory}`,
    "bin",
    target.platform === "win" ? "uf0rs.exe" : "uf0rs",
  );
  const destinationDirectory = path.join(outputRoot, "releases", `${target.platform}-${target.arch}`);
  const destination = path.join(destinationDirectory, target.platform === "win" ? "uf0rs.exe" : "uf0rs");
  await fs.access(source);
  await fs.mkdir(destinationDirectory, { recursive: true });
  await fs.copyFile(source, destination);
  if (target.platform !== "win") await fs.chmod(destination, 0o755);
  if (installAsCurrent) {
    const finalBinary = path.join(outputRoot, target.platform === "win" ? "uf0rs.exe" : "uf0rs");
    await fs.copyFile(source, finalBinary);
    if (target.platform !== "win") await fs.chmod(finalBinary, 0o755);
    const { size } = await fs.stat(finalBinary);
    console.log(`Built ${finalBinary} (${(size / 1024 / 1024).toFixed(1)} MiB, UF0RS AI ${packageJson.version}).`);
  } else {
    console.log(`Built ${destination}.`);
  }
}

await fs.mkdir(outputRoot, { recursive: true });
if (args.includes("--all")) {
  const hostTarget = releaseTargets.find(isHostTarget);
  for (const target of releaseTargets) await copyTarget(target, target === hostTarget);
} else {
  const selected = requestedTarget
    ? releaseTargets.find((target) => target.id === targets[requestedTarget])
    : releaseTargets.find(isHostTarget);
  if (!selected) throw new Error("The requested build target is not supported.");
  await copyTarget(selected, isHostTarget(selected));
}
