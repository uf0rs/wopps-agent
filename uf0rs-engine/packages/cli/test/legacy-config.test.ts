import { afterEach, describe, expect, test } from "bun:test"
import fs from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import { parse } from "jsonc-parser"
import { migrateLegacyOpenRouterSettings } from "../src/legacy-config"

const directories: string[] = []

afterEach(async () => {
  await Promise.all(directories.splice(0).map((directory) => fs.rm(directory, { recursive: true, force: true })))
})

async function settingsDirectory() {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "uf0rs-legacy-config-"))
  directories.push(directory)
  return directory
}

describe("legacy OpenRouter settings migration", () => {
  test("imports the saved key and model without replacing existing TUI configuration", async () => {
    const directory = await settingsDirectory()
    await fs.writeFile(
      path.join(directory, "config.json"),
      JSON.stringify({
        provider: "openrouter",
        model: "particle-ai/particle-1",
        apiKey: "legacy-secret",
        baseUrl: "https://openrouter.ai/api/v1",
      }),
    )
    await fs.writeFile(
      path.join(directory, "uf0rs.json"),
      '{\n  // Keep existing user comments.\n  "mcp": { "local": { "type": "local" } }\n}\n',
    )

    expect(await migrateLegacyOpenRouterSettings(directory)).toBe(true)
    const migrated = await fs.readFile(path.join(directory, "uf0rs.json"), "utf8")
    expect(migrated).toContain("// Keep existing user comments.")
    expect(parse(migrated)).toEqual({
      mcp: { local: { type: "local" } },
      providers: {
        openrouter: {
          settings: {
            apiKey: "legacy-secret",
            baseURL: "https://openrouter.ai/api/v1",
          },
        },
      },
      model: "openrouter/particle-ai/particle-1",
    })
  })

  test("preserves newer model and credential settings", async () => {
    const directory = await settingsDirectory()
    await fs.writeFile(
      path.join(directory, "config.json"),
      JSON.stringify({ provider: "openrouter", model: "old/model", apiKey: "legacy-secret" }),
    )
    await fs.writeFile(
      path.join(directory, "uf0rs.json"),
      JSON.stringify({
        providers: { openrouter: { settings: { apiKey: "new-secret" } } },
        model: "openrouter/new/model",
      }),
    )

    expect(await migrateLegacyOpenRouterSettings(directory)).toBe(false)
    expect(JSON.parse(await fs.readFile(path.join(directory, "uf0rs.json"), "utf8"))).toEqual({
      providers: { openrouter: { settings: { apiKey: "new-secret" } } },
      model: "openrouter/new/model",
    })
  })

  test("repairs provider settings written under the invalid singular key", async () => {
    const directory = await settingsDirectory()
    await fs.writeFile(
      path.join(directory, "config.json"),
      JSON.stringify({ provider: "openrouter", model: "vendor/model", apiKey: "legacy-secret" }),
    )
    await fs.writeFile(
      path.join(directory, "uf0rs.json"),
      JSON.stringify({
        mcp: { local: { type: "local" } },
        provider: { openrouter: { settings: { apiKey: "legacy-secret" } } },
        model: "openrouter/vendor/model",
      }),
    )

    expect(await migrateLegacyOpenRouterSettings(directory)).toBe(true)
    expect(JSON.parse(await fs.readFile(path.join(directory, "uf0rs.json"), "utf8"))).toEqual({
      mcp: { local: { type: "local" } },
      providers: { openrouter: { settings: { apiKey: "legacy-secret" } } },
      model: "openrouter/vendor/model",
    })
  })

  test("does not import credentials for other legacy providers", async () => {
    const directory = await settingsDirectory()
    await fs.writeFile(
      path.join(directory, "config.json"),
      JSON.stringify({ provider: "openai", model: "model", apiKey: "legacy-secret" }),
    )

    expect(await migrateLegacyOpenRouterSettings(directory)).toBe(false)
    await expect(fs.access(path.join(directory, "uf0rs.json"))).rejects.toMatchObject({ code: "ENOENT" })
  })
})
