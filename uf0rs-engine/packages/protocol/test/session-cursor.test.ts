import { expect, test } from "bun:test"
import { Session } from "@uf0rs/schema/session"
import { SessionsCursor } from "../src/groups/session.js"

test("SessionsCursor remains the canonical session list cursor", () => {
  expect(SessionsCursor).toBe(Session.ListCursor)
})
