import path from "node:path"
import { UF0RS_CHANNEL } from "./version"

export function databasePath(data: string) {
  const filename =
    process.env.UF0RS_DB ??
    (["latest", "dev", "beta", "next", "prod"].includes(UF0RS_CHANNEL) ||
    process.env.UF0RS_DISABLE_CHANNEL_DB === "1" ||
    process.env.UF0RS_DISABLE_CHANNEL_DB === "true"
      ? "uf0rs.db"
      : `uf0rs-${UF0RS_CHANNEL.replace(/[^a-zA-Z0-9._-]/g, "-")}.db`)
  return filename === ":memory:" ? filename : path.resolve(data, filename)
}
