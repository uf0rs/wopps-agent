import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { installMontage, montageConfigDirs, montageKitDir } from "../src/montage.js";

const repo = path.resolve(import.meta.dirname, "..");

test("montage config dirs cover home, XDG and the default fallback", () => {
  const dirs = montageConfigDirs();
  assert.ok(dirs.some((dir) => dir.endsWith(path.join(".uf0rs"))));
  assert.ok(dirs.some((dir) => dir.endsWith(path.join(".config", "uf0rs"))));
  assert.equal(new Set(dirs).size, dirs.length);
  assert.ok(montageKitDir().endsWith(path.join(".config", "uf0rs", "montage")));
});

test("installMontage deploys the command, agent, skills and studio kit", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "wopps-montage-"));
  const kitDir = path.join(root, "kit");
  const configDir = path.join(root, "config");

  const result = await installMontage({ sourceDir: repo, kitDir, configDirs: [configDir] });

  assert.equal(result.kit, kitDir);
  assert.deepEqual(result.configDirs, [configDir]);
  for (const file of [
    path.join(kitDir, "bin", "montage.mjs"),
    path.join(kitDir, "engine", "src", "Root.tsx"),
    path.join(kitDir, "python", "mix.py"),
    path.join(kitDir, "installed.json"),
    path.join(configDir, "command", "montage.md"),
    path.join(configDir, "agent", "montage.md"),
    path.join(configDir, "skill", "montage-scenes", "SKILL.md"),
  ]) {
    assert.ok((await fs.stat(file)).isFile(), `missing ${file}`);
  }

  const command = await fs.readFile(path.join(configDir, "command", "montage.md"), "utf8");
  assert.match(command, /^---\r?\n[\s\S]*agent: montage/);
  assert.match(command, /\$ARGUMENTS/);

  await fs.rm(root, { recursive: true, force: true });
});
