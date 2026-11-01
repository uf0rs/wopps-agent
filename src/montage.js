import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

/**
 * Locations the engine reads configuration from:
 *  - ~/.uf0rs is discovered while walking up from any project under the home directory,
 *  - XDG_CONFIG_HOME/uf0rs is the global config root (WOPPS honours XDG),
 *  - ~/.config/uf0rs is the fallback global root when XDG is unset.
 */
export function montageConfigDirs() {
  const xdg = process.env.XDG_CONFIG_HOME || path.join(os.homedir(), ".config");
  return [
    ...new Set([
      path.join(os.homedir(), ".uf0rs"),
      path.join(xdg, "uf0rs"),
      path.join(os.homedir(), ".config", "uf0rs"),
    ]),
  ];
}

/** Stable home for the studio kit; the `/montage` command points here. */
export function montageKitDir() {
  return path.join(os.homedir(), ".config", "uf0rs", "montage");
}

const SKIP = new Set(["node_modules", ".git", "out", ".montage", "jobs"]);

async function copyTree(source, target) {
  await fs.mkdir(target, { recursive: true });
  for (const entry of await fs.readdir(source, { withFileTypes: true })) {
    if (SKIP.has(entry.name)) continue;
    const from = path.join(source, entry.name);
    const to = path.join(target, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "projects") continue;
      await copyTree(from, to);
      continue;
    }
    await fs.copyFile(from, to);
  }
}

/**
 * Deploys the montage kit: the studio (CLI, engine, python) into a stable folder and
 * the `/montage` command, agent and skills into every WOPPS config directory.
 * Existing agents, sessions and unrelated config files are left untouched.
 */
export async function installMontage({ sourceDir, kitDir = montageKitDir(), configDirs = montageConfigDirs() } = {}) {
  if (!sourceDir) throw new Error("installMontage: sourceDir is required");
  const kit = path.join(sourceDir, "montage");
  await fs.access(path.join(kit, "bin", "montage.mjs"));

  await fs.rm(kitDir, { recursive: true, force: true });
  await copyTree(kit, kitDir);

  const installed = [];
  for (const configDir of configDirs) {
    await fs.mkdir(configDir, { recursive: true });
    for (const [from, to] of [
      [path.join(kit, "config", "command", "montage.md"), path.join(configDir, "command", "montage.md")],
      [path.join(kit, "config", "agent", "montage.md"), path.join(configDir, "agent", "montage.md")],
    ]) {
      await fs.mkdir(path.dirname(to), { recursive: true });
      await fs.copyFile(from, to);
    }
    for (const entry of await fs.readdir(path.join(kit, "config", "skill"), { withFileTypes: true })) {
      if (entry.isDirectory()) {
        await copyTree(path.join(kit, "config", "skill", entry.name), path.join(configDir, "skill", entry.name));
      }
    }
    installed.push(configDir);
  }

  const marker = {
    version: 1,
    installedAt: new Date().toISOString(),
    kit: kitDir,
    source: path.resolve(sourceDir),
    configDirs: installed,
  };
  await fs.writeFile(path.join(kitDir, "installed.json"), `${JSON.stringify(marker, null, 2)}\n`, "utf8");

  return { kit: kitDir, configDirs: installed, command: path.join(installed[0], "command", "montage.md") };
}

export async function montageInstalled() {
  const dirs = montageConfigDirs();
  for (const dir of dirs) {
    try {
      await fs.access(path.join(dir, "command", "montage.md"));
      return dir;
    } catch {
      // try the next one
    }
  }
  return null;
}
