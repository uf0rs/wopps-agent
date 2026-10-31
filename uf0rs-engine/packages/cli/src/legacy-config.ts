import fs from "node:fs/promises"
import path from "node:path"
import { applyEdits, modify, parse, type ParseError } from "jsonc-parser"

type JsonObject = Record<string, unknown>

function isObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

async function readObject(file: string): Promise<JsonObject | undefined> {
  let contents: string
  try {
    contents = await fs.readFile(file, "utf8")
  } catch (error) {
    if (isObject(error) && error.code === "ENOENT") return
    throw error
  }
  const parsed: unknown = JSON.parse(contents)
  if (!isObject(parsed)) throw new Error(`Expected a JSON object in ${file}.`)
  return parsed
}

async function readJsonc(file: string): Promise<{ contents: string; value: JsonObject } | undefined> {
  let contents: string
  try {
    contents = await fs.readFile(file, "utf8")
  } catch (error) {
    if (isObject(error) && error.code === "ENOENT") return
    throw error
  }
  const errors: ParseError[] = []
  const parsed: unknown = parse(contents, errors, { allowTrailingComma: true })
  if (errors.length || !isObject(parsed)) {
    const offset = errors[0]?.offset
    throw new Error(`Cannot migrate OpenRouter settings: invalid JSON configuration at ${file}${offset === undefined ? "" : ` (offset ${offset})`}.`)
  }
  return { contents, value: parsed }
}

export async function migrateLegacyOpenRouterSettings(configDirectory: string): Promise<boolean> {
  const legacyPath = path.join(configDirectory, "config.json")
  const targetPath = path.join(configDirectory, "uf0rs.json")
  const legacy = await readObject(legacyPath)
  if (legacy?.provider !== "openrouter" || typeof legacy.apiKey !== "string" || !legacy.apiKey.trim()) return false

  const target = await readJsonc(targetPath)
  let contents = target?.contents ?? "{}\n"
  const config = target?.value ?? {}
  const providers = config.providers === undefined ? {} : config.providers
  if (!isObject(providers))
    throw new Error(`Cannot migrate OpenRouter settings: "providers" must be an object in ${targetPath}.`)
  const openrouter = providers.openrouter === undefined ? {} : providers.openrouter
  if (!isObject(openrouter))
    throw new Error(`Cannot migrate OpenRouter settings: "providers.openrouter" must be an object in ${targetPath}.`)
  const settings = openrouter.settings === undefined ? {} : openrouter.settings
  if (!isObject(settings))
    throw new Error(`Cannot migrate OpenRouter settings: "providers.openrouter.settings" must be an object in ${targetPath}.`)
  let changed = false

  const formattingOptions = { insertSpaces: true, tabSize: 2 }
  if (typeof settings.apiKey !== "string" || !settings.apiKey.trim()) {
    contents = applyEdits(contents, modify(contents, ["providers", "openrouter", "settings", "apiKey"], legacy.apiKey, { formattingOptions }))
    changed = true
  }
  if (
    (typeof settings.baseURL !== "string" || !settings.baseURL.trim()) &&
    typeof legacy.baseUrl === "string" &&
    legacy.baseUrl.trim()
  ) {
    contents = applyEdits(contents, modify(contents, ["providers", "openrouter", "settings", "baseURL"], legacy.baseUrl, { formattingOptions }))
    changed = true
  }

  if (
    (config.model === undefined || config.model === null || config.model === "") &&
    typeof legacy.model === "string" &&
    legacy.model.trim()
  ) {
    contents = applyEdits(contents, modify(contents, ["model"], `openrouter/${legacy.model}`, { formattingOptions }))
    changed = true
  }
  if (config.provider !== undefined) {
    contents = applyEdits(contents, modify(contents, ["provider"], undefined, { formattingOptions }))
    changed = true
  }
  if (!changed) return false

  await fs.writeFile(targetPath, contents.endsWith("\n") ? contents : `${contents}\n`, {
    encoding: "utf8",
    mode: 0o600,
  })
  return true
}
