import { execFileSync, spawn, spawnSync } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { version } from "./version.js";

const sourceRoot = typeof __UF0RS_SOURCE_DIR__ === "undefined"
  ? path.resolve(path.dirname(process.argv[1] || process.cwd()), "..")
  : __UF0RS_SOURCE_DIR__;
const shellMarker = "# UF0RS AI PATH";
const shellPathLine = 'case ":$PATH:" in *":$HOME/.local/bin:"*) ;; *) export PATH="$HOME/.local/bin:$PATH" ;; esac # UF0RS AI PATH';

export function getInstallPaths(platform = process.platform, env = process.env) {
  const pathApi = platform === "win32" ? path.win32 : path;
  const home = os.homedir();
  if (platform === "win32") {
    const appData = env.LOCALAPPDATA || pathApi.join(home, "AppData", "Local");
    const binDir = pathApi.join(appData, "Programs", "UF0RS AI");
    return {
      binDir,
      executable: pathApi.join(binDir, "uf0rs.exe"),
      launcher: pathApi.join(binDir, "uf0rs.cmd"),
      dataDir: pathApi.join(appData, "UF0RS AI"),
      manifest: pathApi.join(appData, "UF0RS AI", "install.json"),
      pathValue: env.Path || env.PATH || "",
      pathSeparator: ";",
    };
  }
  const binDir = path.join(home, ".local", "bin");
  const dataDir = path.join(home, ".local", "share", "uf0rs");
  return {
    binDir,
    executable: path.join(binDir, "uf0rs"),
    launcher: null,
    dataDir,
    manifest: path.join(dataDir, "install.json"),
    pathValue: env.PATH || "",
    pathSeparator: ":",
  };
}

function normalizedPath(value, platform) {
  const api = platform === "win32" ? path.win32 : path;
  let normalized = api.normalize(value.trim().replace(/^"(.*)"$/, "$1"));
  const root = platform === "win32" ? api.parse(normalized).root : path.parse(normalized).root;
  while (normalized.length > root.length && /[\\/]/.test(normalized.at(-1))) normalized = normalized.slice(0, -1);
  return platform === "win32" ? normalized.toLowerCase() : normalized;
}

export function addPathEntry(current, entry, platform = process.platform) {
  const separator = platform === "win32" ? ";" : ":";
  const entries = current.split(separator).filter(Boolean);
  const key = normalizedPath(entry, platform);
  if (!entries.some((value) => normalizedPath(value, platform) === key)) entries.unshift(entry);
  return entries.join(separator);
}

export function removePathEntry(current, entry, platform = process.platform) {
  const separator = platform === "win32" ? ";" : ":";
  const key = normalizedPath(entry, platform);
  return current.split(separator).filter((value) => value && normalizedPath(value, platform) !== key).join(separator);
}

function quotePowerShell(value) {
  return `'${value.replace(/'/g, "''")}'`;
}

function runPowerShell(script) {
  const encoded = Buffer.from(script, "utf16le").toString("base64");
  const result = spawnSync("powershell.exe", ["-NoLogo", "-NoProfile", "-NonInteractive", "-EncodedCommand", encoded], {
    encoding: "utf8",
    windowsHide: true,
  });
  if (result.error) throw new Error(`Could not update the Windows user PATH: ${result.error.message}`);
  if (result.status !== 0) throw new Error(`Could not update the Windows user PATH: ${(result.stderr || result.stdout).trim()}`);
}

async function updatePath(entry, operation, paths, platform = process.platform) {
  if (platform === "win32") {
    const action = operation === "add" ? "add" : "remove";
    const delimiter = paths.pathSeparator;
    const target = quotePowerShell(entry);
    const script = [
      "$current = [Environment]::GetEnvironmentVariable('Path', 'User')",
      `$items = @($current -split ${quotePowerShell(delimiter)} | Where-Object { $_ -and $_.Trim() })`,
      `if (${quotePowerShell(action)} -eq 'add') {`,
      `  if (-not ($items | Where-Object { $_.Trim('"').TrimEnd('\\').Equals(${target}.TrimEnd('\\'), [StringComparison]::OrdinalIgnoreCase) })) { $items = @(${target}) + $items }`,
      "} else {",
      `  $items = @($items | Where-Object { -not $_.Trim('"').TrimEnd('\\').Equals(${target}.TrimEnd('\\'), [StringComparison]::OrdinalIgnoreCase) })`,
      "}",
      "[Environment]::SetEnvironmentVariable('Path', ($items -join ';'), 'User')",
    ].join("\n");
    runPowerShell(script);
    return;
  }
  if (platform === "linux" || platform === "darwin") {
    await updateShellPath(entry, operation, platform);
  }
}

async function updateShellPath(entry, operation, platform = process.platform, { home = os.homedir(), shellName = path.basename(process.env.SHELL || "") } = {}) {
  const files = new Set();
  if (shellName === "fish") {
    files.add(path.join(home, ".config", "fish", "config.fish"));
  } else {
    files.add(path.join(home, ".profile"));
    if (shellName === "bash") files.add(path.join(home, ".bashrc"));
    if (shellName === "zsh") {
      files.add(path.join(home, ".zshrc"));
      if (platform === "darwin") files.add(path.join(home, ".zprofile"));
    }
  }
  const isFish = shellName === "fish";
  const line = isFish
    ? `if not contains "${entry}" $PATH; set -gx PATH "${entry}" $PATH; end ${shellMarker}`
    : entry === path.join(home, ".local", "bin")
      ? shellPathLine
      : `export PATH="${entry.replace(/"/g, '\\"')}:$PATH" ${shellMarker}`;
  for (const file of files) {
    let text = "";
    try {
      text = await fs.readFile(file, "utf8");
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
    const kept = text.split(/\r?\n/).filter((existing) => !existing.includes(shellMarker));
    if (operation === "add") {
      while (kept.length && kept.at(-1) === "") kept.pop();
      kept.push(line);
    } else while (kept.length && kept.at(-1) === "") kept.pop();
    const updated = kept.length ? `${kept.join("\n")}\n` : "";
    if (updated !== text) {
      await fs.mkdir(path.dirname(file), { recursive: true });
      await fs.writeFile(file, updated, "utf8");
    }
  }
}

async function buildFromSource(sourceDir) {
  const script = path.join(sourceDir, "scripts", "build-cli.js");
  await fs.access(script);
  const nodeExecutable = process.pkg ? "node" : process.execPath;
  const result = spawnSync(nodeExecutable, [script], { cwd: sourceDir, stdio: "inherit", windowsHide: true });
  if (result.error) throw new Error(`Could not build WOPPS. Node.js 22+ is required for updates: ${result.error.message}`);
  if (result.status !== 0) throw new Error(`WOPPS build failed with exit code ${result.status}.`);
}

function defaultBinaryPath(sourceDir, platform = process.platform) {
  return path.join(sourceDir, "dist", platform === "win32" ? "uf0rs.exe" : "uf0rs");
}

export function releaseAssetName(platform, architecture) {
  const releasePlatform = platform === "win32" ? "win" : platform === "darwin" ? "macos" : "linux";
  if (platform === "win32") return architecture === "arm64" ? "wopps-ai-win-arm64.exe" : "uf0rs.exe";
  return `wopps-ai-${releasePlatform}-${architecture}${platform === "darwin" ? ".tar.gz" : ""}`;
}

async function replaceExecutable(source, destination, platform) {
  await fs.mkdir(path.dirname(destination), { recursive: true });
  const temporary = `${destination}.${process.pid}.new`;
  await fs.copyFile(source, temporary);
  if (platform !== "win32") await fs.chmod(temporary, 0o755);
  try {
    await fs.rename(temporary, destination);
    return;
  } catch (error) {
    if (platform === "win32" && ["EPERM", "EACCES", "EBUSY"].includes(error.code)) {
      // Windows keeps the image of a running executable locked, but renaming that image is
      // allowed. Move the running copy aside so the next start uses the fresh binary.
      const previous = `${destination}.old`;
      await fs.rm(previous, { force: true });
      await fs.rename(destination, previous);
      try {
        await fs.rename(temporary, destination);
        return;
      } catch (swapError) {
        await fs.rename(previous, destination).catch(() => {});
        error = swapError;
      }
    }
    await fs.rm(temporary, { force: true });
    const replacementError = new Error(`Could not replace ${destination}: ${error.message}. Close UF0RS and retry.`);
    replacementError.code = error.code;
    throw replacementError;
  }
}

/**
 * @param {{
 *   binaryPath?: string,
 *   sourceDir?: string,
 *   paths?: ReturnType<typeof getInstallPaths>,
 *   platform?: NodeJS.Platform,
 *   skipPathUpdate?: boolean
 * }} [options]
 */
export async function installApp({ binaryPath, sourceDir = sourceRoot, paths = getInstallPaths(), platform = process.platform, skipPathUpdate = false } = {}) {
  const source = path.resolve(binaryPath || defaultBinaryPath(sourceDir, platform));
  try {
    await fs.access(source);
  } catch {
    if (!sourceDir) throw new Error(`Executable not found: ${source}`);
    await buildFromSource(sourceDir);
  }
  const actualSource = path.resolve(binaryPath || defaultBinaryPath(sourceDir, platform));
  await fs.access(actualSource);
  await fs.mkdir(paths.binDir, { recursive: true });
  let deferredWindowsUpdate = false;
  try {
    await replaceExecutable(actualSource, paths.executable, platform);
  } catch (error) {
    const existingExecutable = platform === "win32" && await fs.stat(paths.executable).catch(() => null);
    if (!existingExecutable || !["EPERM", "EACCES", "EBUSY"].includes(error.code)) throw error;
    // A running WOPPS instance keeps the destination locked. The caller may delete its own
    // source as soon as install returns, so the background replacement gets a private copy.
    const stagingDir = await fs.mkdtemp(path.join(os.tmpdir(), "uf0rs-install-"));
    const staged = path.join(stagingDir, "uf0rs.exe");
    await fs.copyFile(actualSource, staged);
    await scheduleWindowsUpdate(staged, paths.executable, true);
    deferredWindowsUpdate = true;
  }
  if (platform === "win32" && paths.launcher) {
    await fs.writeFile(paths.launcher, '@echo off\r\n"%~dp0uf0rs.exe" %*\r\n', "utf8");
  }
  await fs.mkdir(paths.dataDir, { recursive: true });
  const manifest = {
    version,
    platform,
    binDir: paths.binDir,
    executable: paths.executable,
    sourceDir: sourceDir ? path.resolve(sourceDir) : null,
    installedAt: new Date().toISOString(),
  };
  await fs.writeFile(paths.manifest, `${JSON.stringify(manifest, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
  if (!skipPathUpdate) await updatePath(paths.binDir, "add", paths, platform);
  process.env.PATH = addPathEntry(process.env.PATH || "", paths.binDir, platform);
  return { ...manifest, launcher: paths.launcher, pathUpdated: !skipPathUpdate, deferredWindowsUpdate };
}

async function readManifest(paths) {
  try {
    return JSON.parse(await fs.readFile(paths.manifest, "utf8"));
  } catch (error) {
    if (error.code === "ENOENT") return null;
    throw new Error(`Could not read installation metadata: ${error.message}`);
  }
}

async function scheduleWindowsDelete(paths) {
  const scriptPath = path.join(os.tmpdir(), `uf0rs-uninstall-${process.pid}.ps1`);
  const script = [
    "$ErrorActionPreference = 'SilentlyContinue'",
    "Start-Sleep -Seconds 2",
    `Remove-Item -LiteralPath ${quotePowerShell(paths.executable)} -Force`,
    ...(paths.launcher ? [`Remove-Item -LiteralPath ${quotePowerShell(paths.launcher)} -Force`] : []),
    `Remove-Item -LiteralPath ${quotePowerShell(paths.binDir)} -Force`,
    "Remove-Item -LiteralPath $PSCommandPath -Force",
  ].join("\r\n");
  await fs.writeFile(scriptPath, script, "utf8");
  const child = spawn("powershell.exe", ["-NoLogo", "-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-File", scriptPath], {
    detached: true,
    stdio: "ignore",
    windowsHide: true,
  });
  child.once("error", (error) => console.error(`Could not schedule executable removal: ${error.message}`));
  await new Promise((resolve, reject) => {
    child.once("spawn", resolve);
    child.once("error", reject);
  });
  child.unref();
}

export async function uninstallApp({
  paths = getInstallPaths(),
  platform = process.platform,
  skipPathUpdate = false,
  deferWindowsCleanup = true,
} = {}) {
  const installed = await readManifest(paths);
  if (!installed && !(await fs.stat(paths.executable).catch(() => null))) {
    throw new Error("WOPPS is not installed in the standard user location.");
  }
  if (!skipPathUpdate) await updatePath(paths.binDir, "remove", paths, platform);
  if (platform === "win32") {
    if (deferWindowsCleanup) await scheduleWindowsDelete(paths);
  } else {
    await fs.rm(paths.executable, { force: true });
    if (paths.launcher) await fs.rm(paths.launcher, { force: true });
    await fs.rmdir(paths.binDir).catch((error) => {
      if (error.code !== "ENOENT" && error.code !== "ENOTEMPTY") throw error;
    });
  }
  await fs.rm(paths.manifest, { force: true });
  console.log("WOPPS was removed. Project history and settings were kept.");
  if (platform === "win32") console.log("The executable will be deleted after this process exits; open a new terminal to refresh PATH.");
  return Boolean(installed);
}

function pathContains(pathValue, entry, platform) {
  const separator = platform === "win32" ? ";" : ":";
  const expected = normalizedPath(entry, platform);
  return pathValue.split(separator).some((item) => item && normalizedPath(item, platform) === expected);
}

export async function diagnose({ paths = getInstallPaths(), platform = process.platform, pathValue = process.env.PATH || "" } = {}) {
  const manifest = await readManifest(paths);
  const binary = await fs.stat(paths.executable).catch(() => null);
  const settingsPath = path.join(os.homedir(), ".uf0rs", "config.json");
  const settings = await fs.stat(settingsPath).catch(() => null);
  return {
    version,
    platform,
    installed: Boolean(manifest && binary?.isFile()),
    executable: paths.executable,
    executableExists: Boolean(binary?.isFile()),
    pathRegistered: pathContains(pathValue, paths.binDir, platform),
    installDirectory: paths.binDir,
    settingsPath,
    settingsExist: Boolean(settings?.isFile()),
    savedSourceAvailable: Boolean(manifest?.sourceDir && await fs.stat(manifest.sourceDir).then((stat) => stat.isDirectory()).catch(() => false)),
    nodeVersion: process.version,
  };
}

export function printDiagnosis(result) {
  console.log(`WOPPS ${result.version} — ${result.installed ? "installed" : "not installed"}`);
  console.log(`Platform: ${result.platform} (${result.nodeVersion})`);
  console.log(`Executable: ${result.executableExists ? "OK" : "MISSING"} — ${result.executable}`);
  console.log(`PATH: ${result.pathRegistered ? "OK" : "NOT REGISTERED"} — ${result.installDirectory}`);
  console.log(`Settings: ${result.settingsExist ? "present" : "not created yet"} — ${result.settingsPath}`);
  if (!result.savedSourceAvailable && result.installed) {
    console.log("Update source: GitHub Releases will be used for updates.");
  }
}

async function scheduleWindowsUpdate(source, destination, removeSource = false) {
  const scriptPath = path.join(os.tmpdir(), `uf0rs-update-${process.pid}.ps1`);
  const script = [
    "$ErrorActionPreference = 'Stop'",
    "Start-Sleep -Seconds 2",
    `$source = ${quotePowerShell(source)}`,
    `$destination = ${quotePowerShell(destination)}`,
    "$updated = $false",
    "for ($i = 0; $i -lt 120; $i++) {",
    "  try { Copy-Item -LiteralPath $source -Destination $destination -Force; $updated = $true; break } catch { Start-Sleep -Seconds 1 }",
    "}",
    `if (-not $updated) { Write-Error 'Could not replace the executable. Close UF0RS and run the update again.'; ${removeSource ? "Remove-Item -LiteralPath $source -Force -ErrorAction SilentlyContinue; Remove-Item -LiteralPath (Split-Path -Parent $source) -Force -ErrorAction SilentlyContinue;" : ""} Remove-Item -LiteralPath $PSCommandPath -Force; exit 1 }`,
    ...(removeSource ? [
      "Remove-Item -LiteralPath $source -Force -ErrorAction SilentlyContinue",
      "Remove-Item -LiteralPath (Split-Path -Parent $source) -Force -ErrorAction SilentlyContinue",
    ] : []),
    "Remove-Item -LiteralPath $PSCommandPath -Force",
  ].join("\r\n");
  await fs.writeFile(scriptPath, script, "utf8");
  const child = spawn("powershell.exe", ["-NoLogo", "-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-File", scriptPath], {
    detached: true,
    stdio: "ignore",
    windowsHide: true,
  });
  child.once("error", async (error) => {
    await fs.rm(scriptPath, { force: true });
    console.error(`Could not schedule executable update: ${error.message}`);
  });
  child.unref();
}

/**
 * @param {{
 *   sourceDir?: string,
 *   paths?: ReturnType<typeof getInstallPaths>,
 *   platform?: NodeJS.Platform
 * }} [options]
 */
export async function updateApp({ sourceDir, paths = getInstallPaths(), platform = process.platform } = {}) {
  const installed = await readManifest(paths);
  if (!installed) throw new Error("WOPPS is not installed. Run the installer first.");
  const savedSource = sourceDir || installed.sourceDir;
  const sourceAvailable = savedSource && await fs.stat(savedSource).then((stat) => stat.isDirectory()).catch(() => false);
  let source = sourceAvailable ? path.resolve(savedSource) : null;
  let binary;
  let downloadedBinary = null;
  let downloadedDirectory = null;
  if (sourceDir && !sourceAvailable) {
    throw new Error(`Update source folder does not exist: ${sourceDir}`);
  }
  if (sourceAvailable) {
    await buildFromSource(source);
    binary = defaultBinaryPath(source, platform);
  } else {
    const architecture = process.arch === "arm64" ? "arm64" : "x64";
    const assetName = releaseAssetName(platform, architecture);
    const downloadUrl = `https://github.com/uf0rs/wopps-ai/releases/latest/download/${assetName}`;
    const response = await fetch(downloadUrl, { headers: { "User-Agent": "WOPPS-AI-Updater" } });
    if (!response.ok) throw new Error(`Could not download the latest WOPPS AI release (${response.status}): ${downloadUrl}`);
    downloadedDirectory = await fs.mkdtemp(path.join(os.tmpdir(), `wopps-ai-update-${process.pid}-`));
    downloadedBinary = path.join(downloadedDirectory, assetName);
    try {
      await fs.writeFile(downloadedBinary, Buffer.from(await response.arrayBuffer()), { mode: 0o700 });
      if (platform === "darwin") {
        execFileSync("tar", ["-xzf", downloadedBinary, "-C", downloadedDirectory], { windowsHide: true });
        binary = path.join(downloadedDirectory, "uf0rs");
      } else {
        binary = downloadedBinary;
      }
    } catch (error) {
      await fs.rm(downloadedDirectory, { recursive: true, force: true });
      throw new Error(`Could not prepare the downloaded WOPPS AI release: ${error.message}`);
    }
  }
  try {
    await fs.access(binary);
    const updatedVersion = execFileSync(binary, ["--version"], { encoding: "utf8", windowsHide: true }).trim();
    if (!/^\d+\.\d+\.\d+(?:[-+][\w.-]+)?$/.test(updatedVersion)) {
      throw new Error(`The updated executable returned an invalid version: ${updatedVersion}`);
    }
    if (platform === "win32") {
      await scheduleWindowsUpdate(binary, paths.executable, Boolean(downloadedBinary));
    } else {
      await replaceExecutable(binary, paths.executable, platform);
    }
    installed.version = updatedVersion;
    installed.sourceDir = source;
    installed.updatedAt = new Date().toISOString();
    await fs.writeFile(paths.manifest, `${JSON.stringify(installed, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
    console.log(`WOPPS AI updated to ${updatedVersion}.`);
    if (platform === "win32") console.log("The executable will be replaced in the background after this process exits.");
  } finally {
    if (downloadedDirectory && platform !== "win32") await fs.rm(downloadedDirectory, { recursive: true, force: true });
  }
}

export const installerInternals = { updateShellPath, readManifest, releaseAssetName };
