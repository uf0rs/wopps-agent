import { Config } from "effect"

// Every environment variable the CLI reads, in one place. Consumers yield
// these instead of touching process.env so the full surface stays visible,
// typed, and redacted where secret.

// The uf0rs server password: sent by clients connecting to an explicit
// --server, and adopted by a manually run or standalone server. The legacy
// name is still honored.
export const password = Config.Redacted("UF0RS_PASSWORD").pipe(
  Config.orElse(() => Config.Redacted("UF0RS_SERVER_PASSWORD")),
  Config.withDefault(undefined),
)

export function session() {
  return Object.fromEntries(
    Object.entries(process.env).filter(
      (entry): entry is [string, string] =>
        entry[1] !== undefined && entry[0] !== "UF0RS_PASSWORD" && entry[0] !== "UF0RS_SERVER_PASSWORD",
    ),
  )
}

export * as Env from "./env"
