import { expect, test } from "bun:test"
import { epilogue } from "../../src/util/presentation"

const rows = (text: string | undefined) =>
  Bun.stripANSI(text ?? "")
    .split("\n")
    .filter((line) => /^\s{2}(?:Run|Session|Continue)\s/.test(line))

test("prints nothing without a session or update", () => {
  expect(epilogue({})).toBeUndefined()
})

test("formats session continuation summary", () => {
  expect(rows(epilogue({ session: { title: "A session", sessionID: "ses_123" } }))).toEqual([
    "  Session   A session",
    "  Continue  uf0rs -s ses_123",
  ])
})

test("tells the user to start UF0RS AI again after an update", () => {
  expect(rows(epilogue({ updatedVersion: "2.0.0" }))).toEqual(["  Run uf0rs to use 2.0.0"])
})

test("keeps the session continuation after an update", () => {
  expect(rows(epilogue({ session: { title: "A session", sessionID: "ses_123" }, updatedVersion: "2.0.0" }))).toEqual([
    "  Run uf0rs to use 2.0.0",
    "  Session   A session",
    "  Continue  uf0rs -s ses_123",
  ])
})
