import { Option, Schema } from "effect"

declare const UF0RS_VERSION: string
declare const UF0RS_CHANNEL: string
declare const UF0RS_ARTIFACT: string
declare const UF0RS_RELEASE_HIGHLIGHTS: string

const version = typeof UF0RS_VERSION === "string" ? UF0RS_VERSION : "local"
const channel = typeof UF0RS_CHANNEL === "string" ? UF0RS_CHANNEL : "local"
const artifact = typeof UF0RS_ARTIFACT === "string" ? UF0RS_ARTIFACT : "cli"
// Stable release builds embed the release notes' Highlights; every other build has none.
const highlights =
  typeof UF0RS_RELEASE_HIGHLIGHTS === "string"
    ? Option.getOrElse(
        Schema.decodeUnknownOption(
          Schema.fromJsonString(Schema.Array(Schema.Struct({ title: Schema.String, body: Schema.String }))),
        )(UF0RS_RELEASE_HIGHLIGHTS),
        () => [],
      )
    : []

export {
  version as UF0RS_VERSION,
  channel as UF0RS_CHANNEL,
  artifact as UF0RS_ARTIFACT,
  highlights as UF0RS_HIGHLIGHTS,
}
export const UF0RS_LOCAL = channel === "local"
