#!/usr/bin/env bun
import os from "node:os"
import path from "node:path"
import fs from "node:fs/promises"
import { migrateLegacyOpenRouterSettings } from "./legacy-config"
import { diagnose, installApp, printDiagnosis, uninstallApp, updateApp } from "../../../../src/installer.js"
import { version } from "../../../../src/version.js"

declare const __UF0RS_SOURCE_DIR__: string | undefined
declare const __UF0RS_STANDALONE__: boolean | undefined

const home = process.env.UF0RS_HOME || path.join(os.homedir(), ".uf0rs")
const sourceRoot = typeof __UF0RS_SOURCE_DIR__ !== "undefined"
  ? __UF0RS_SOURCE_DIR__
  : path.resolve(path.dirname(process.argv[1] || process.cwd()), "../../../../")
process.env.XDG_CONFIG_HOME ??= home
process.env.XDG_DATA_HOME ??= home
process.env.XDG_CACHE_HOME ??= home
process.env.XDG_STATE_HOME ??= home
process.env.UF0RS_CONFIG_DIR ??= home
process.env.UF0RS_CLIENT ??= "WOPPS by UF0RS STUDIO"
process.env.UF0RS_DISABLE_AUTOUPDATE ??= "1"

async function ensureComputerTools() {
  const configPath = path.join(home, "uf0rs.json")
  try {
    await fs.access(configPath)
    return
  } catch (error) {
    if (!(error instanceof Error) || !("code" in error) || error.code !== "ENOENT") throw error
  }
  const script = process.argv[1]?.endsWith(".ts") ? process.argv[1] : undefined
  const command = script
    ? [process.execPath, script, "pc-mcp-server"]
    : [process.execPath, "pc-mcp-server"]
  const config = {
    mcp: {
      "uf0rs-computer": {
        type: "local",
        command,
        timeout: { startup: 10000, catalog: 15000, execution: 120000 },
      },
    },
  }
  await fs.mkdir(home, { recursive: true })
  await fs.writeFile(configPath, `${JSON.stringify(config, null, 2)}\n`, { encoding: "utf8", flag: "wx" })
}

async function maintenance(args: string[]) {
  const [command, ...rest] = args
  if (command === "--help" || command === "-h" || command === "help") {
    console.log(`WOPPS by UF0RS STUDIO ${version} — terminal agent

Usage:
  uf0rs [project-path]           Open a project (defaults to the current directory)
  uf0rs .                         Open the current directory
  uf0rs --resume                  Continue the most recent session
  uf0rs --auto                    Start with automatic permission approval
  uf0rs models                    Choose a model or configure a provider
  uf0rs install [--source-dir <folder>] Install the standalone CLI for this user
  uf0rs update [source-folder]    Update from a release or local source
  uf0rs uninstall                 Remove WOPPS from this user
  uf0rs doctor [--json]           Diagnose the installation
  uf0rs --version                 Print the version

In the TUI, type / to open the command palette. Local project actions require permission by default.`)
    return true
  }
  if (command === "--version" || command === "-v") {
    console.log(version)
    return true
  }
  if (command === "install") {
    let sourceDir: string | undefined
    if (rest.length) {
      if (rest.length !== 2 || rest[0] !== "--source-dir")
        throw new Error("Usage: uf0rs install [--source-dir <folder>]")
      sourceDir = path.resolve(rest[1]!)
      if (!(await fs.stat(sourceDir)).isDirectory()) throw new Error(`Not a source directory: ${sourceDir}`)
    }
    const standalone = typeof __UF0RS_STANDALONE__ !== "undefined" && __UF0RS_STANDALONE__
    const result = await installApp({
      binaryPath: standalone ? process.execPath : undefined,
      sourceDir: sourceDir || sourceRoot,
    })
    console.log(`WOPPS ${version} ${result.deferredWindowsUpdate ? "installation scheduled" : "installed successfully"}.`)
    console.log(`Executable: ${result.executable}`)
    console.log(`Added to user PATH: ${result.binDir}`)
    if (result.deferredWindowsUpdate) {
      console.log("The previous UF0RS process is still using the executable. Close it to finish replacing the version.")
    }
    return true
  }
  if (command === "update" || command === "upgrade") {
    if (rest.length > 1) throw new Error("update accepts one source-folder argument.")
    await updateApp(rest[0] ? { sourceDir: path.resolve(rest[0]) } : {})
    return true
  }
  if (command === "uninstall") {
    if (rest.length) throw new Error("uninstall does not accept arguments.")
    await uninstallApp({ deferWindowsCleanup: process.env.UF0RS_CMD_UNINSTALL !== "1" })
    return true
  }
  if (command === "doctor") {
    const result = await diagnose()
    if (rest.length === 1 && rest[0] === "--json") console.log(JSON.stringify(result, null, 2))
    else if (rest.length) throw new Error("Usage: uf0rs doctor [--json]")
    else printDiagnosis(result)
    if (!result.installed || !result.pathRegistered) process.exitCode = 1
    return true
  }
  return false
}

function normalizeProjectArgument() {
  const args = process.argv.slice(2)
  const commands = new Set([
    "upgrade",
    "update",
    "uninstall",
    "acp",
    "api",
    "debug",
    "auth",
    "mcp",
    "plugin",
    "models",
    "stats",
    "mini",
    "run",
    "session",
    "service",
    "reload",
    "pair",
    "serve",
  ])
  const valueFlags = new Set(["--server", "--directory", "-d", "--session", "-s", "--prompt"])
  let index = 0
  while (index < args.length && args[index]?.startsWith("-")) {
    const flag = args[index]
    index += valueFlags.has(flag) ? 2 : 1
  }
  const candidate = args[index]
  if (!candidate || candidate.startsWith("-") || commands.has(candidate)) return
  args.splice(index, 1, "--directory", candidate)
  process.argv.splice(2, process.argv.length - 2, ...args)
}

async function main() {
  if (await maintenance(process.argv.slice(2))) return
  if (process.argv[2] === "pc-mcp-server") {
    await import("./uf0rs-pc-mcp")
    return
  }
  if (process.argv[2] === "--resume") process.argv.splice(2, 1, "--continue")
  normalizeProjectArgument()
  await ensureComputerTools()
  if (await migrateLegacyOpenRouterSettings(home)) {
    console.log("Imported your saved OpenRouter settings.")
  }
  await import("./index")
}

await main().catch((error) => {
  console.error(`WOPPS: ${error.message}`)
  process.exitCode = 1
})
