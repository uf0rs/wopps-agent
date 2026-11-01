import { app } from "electron"

type Channel = "local" | "dev" | "beta" | "prod"

const raw = import.meta.env.UF0RS_CHANNEL

export const CHANNEL: Channel = raw === "local" || raw === "dev" || raw === "beta" || raw === "prod" ? raw : "dev"

export const VERSION = app.isPackaged ? app.getVersion() : (process.env.UF0RS_VERSION ?? app.getVersion())

const appNames: Record<string, string> = {
  dev: "WOPPS Dev",
  beta: "WOPPS Beta",
  prod: "WOPPS",
}

const appIDs: Record<string, string> = {
  dev: "ai.uf0rs.desktop.dev",
  beta: "ai.uf0rs.desktop.beta",
  prod: "ai.uf0rs.desktop",
}

// Local renderer/server mode keeps the dev application identity.
export const APP_NAME = app.isPackaged ? appNames[CHANNEL] : "WOPPS Dev"

export const APP_ID = app.isPackaged ? appIDs[CHANNEL] : "ai.uf0rs.desktop.dev"
