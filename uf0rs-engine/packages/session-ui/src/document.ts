import type { FileDiffInfo, SessionMessageInfo, SessionStatus } from "@uf0rs/client/promise"

export type SessionDocument = {
  sessionID: string
  messages: SessionMessageInfo[]
  status: SessionStatus
  diffs: FileDiffInfo[]
}
