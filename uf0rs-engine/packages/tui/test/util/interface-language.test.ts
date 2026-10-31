import { expect, test } from "bun:test"
import fs from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import { loadInterfaceLanguage, saveInterfaceLanguage } from "../../src/util/interface-language"

test("interface language is absent on first launch and persists after selection", async () => {
  const home = await fs.mkdtemp(path.join(os.tmpdir(), "wopps-language-"))
  try {
    expect(await loadInterfaceLanguage(home)).toBeUndefined()
    for (const language of ["ru", "en", "fr"] as const) {
      await saveInterfaceLanguage(home, language)
      expect(await loadInterfaceLanguage(home)).toBe(language)
    }
  } finally {
    await fs.rm(home, { recursive: true, force: true })
  }
})

test("invalid saved interface language is reported instead of silently ignored", async () => {
  const home = await fs.mkdtemp(path.join(os.tmpdir(), "wopps-language-"))
  try {
    await fs.writeFile(path.join(home, "interface.json"), '{"language":"de"}\n')
    await expect(loadInterfaceLanguage(home)).rejects.toThrow("unsupported language")
  } finally {
    await fs.rm(home, { recursive: true, force: true })
  }
})
