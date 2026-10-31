import fs from "node:fs/promises"
import path from "node:path"
import { createSignal } from "solid-js"

export const interfaceLanguages = ["ru", "en", "fr"] as const
export type InterfaceLanguage = (typeof interfaceLanguages)[number]

const [activeInterfaceLanguage, setActiveInterfaceLanguage] = createSignal<InterfaceLanguage>("en")

export function useInterfaceLanguage() {
  return activeInterfaceLanguage
}

export function setCurrentInterfaceLanguage(language: InterfaceLanguage) {
  setActiveInterfaceLanguage(language)
}

function isInterfaceLanguage(value: unknown): value is InterfaceLanguage {
  return typeof value === "string" && (interfaceLanguages as readonly string[]).includes(value)
}

export async function loadInterfaceLanguage(home: string): Promise<InterfaceLanguage | undefined> {
  const file = path.join(home, "interface.json")
  let contents: string
  try {
    contents = await fs.readFile(file, "utf8")
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") return undefined
    throw error
  }

  let stored: unknown
  try {
    stored = JSON.parse(contents)
  } catch (error) {
    throw new Error(`Could not read WOPPS interface settings at ${file}: ${error instanceof Error ? error.message : String(error)}`)
  }
  if (!stored || typeof stored !== "object" || !("language" in stored) || !isInterfaceLanguage(stored.language)) {
    throw new Error(`WOPPS interface settings at ${file} contain an unsupported language.`)
  }
  return stored.language
}

export async function saveInterfaceLanguage(home: string, language: InterfaceLanguage) {
  const file = path.join(home, "interface.json")
  await fs.mkdir(home, { recursive: true })
  await fs.writeFile(file, `${JSON.stringify({ language }, null, 2)}\n`, { encoding: "utf8", mode: 0o600 })
}
