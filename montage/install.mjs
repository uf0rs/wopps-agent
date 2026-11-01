#!/usr/bin/env node
/**
 * Install (or refresh) the WOPPS Montage kit.
 * After this, `/montage` is available in every new session.
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import { installMontage, montageConfigDirs } from "../src/montage.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

try {
  const result = await installMontage({ sourceDir: root });
  console.log("\n✓ WOPPS Montage установлен");
  console.log(`  студия:  ${result.kit}`);
  console.log(`  команда: /montage`);
  console.log(`  скиллы:  montage-director, montage-scenes, montage-sound, montage-pipeline, montage-qa`);
  console.log(`  конфиги: ${result.configDirs.map((dir) => path.relative(process.cwd(), dir) || ".").join(", ")}`);
  console.log(`\n  дальше:  новая сессия WOPPS → /montage\n`);
  console.log(`  проверить: node "${path.join(result.kit, "bin", "montage.mjs")}" doctor\n`);
} catch (error) {
  console.error(`✗ установка не удалась: ${error.message}`);
  process.exitCode = 1;
}
