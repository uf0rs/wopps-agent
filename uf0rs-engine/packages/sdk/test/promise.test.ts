import { expect, test } from "bun:test"
import { mkdir } from "node:fs/promises"
import { join } from "node:path"
import { tmpdir } from "../../core/test/fixture/tmpdir"
import { WOPPS, Session } from "../src"

test("Promise host uses the embedded router", async () => {
  await using directory = await tmpdir("uf0rs-promise-sdk-")
  const config = join(directory.path, "config")
  await mkdir(config)
  const uf0rs = await WOPPS.create({
    events: { persist: true },
    config: { directory: config, project: false, content: "{}" },
  })

  try {
    const location = { directory: directory.path }
    const session = await uf0rs.sessions.create({ location })
    const selected = await uf0rs.sessions.get({ sessionID: session.id })
    const page = await uf0rs.sessions.list({ directory: directory.path })
    const events = Array.fromAsync(uf0rs.experimental.session.log({ sessionID: session.id }))

    expect(selected.id).toBe(session.id)
    expect(page.data.some((item) => item.id === session.id)).toBe(true)
    expect((await events).some((event) => event.type === "session.created")).toBe(true)

    const missingSessionID = Session.ID.create()
    const missing = await uf0rs.sessions.get({ sessionID: missingSessionID }).catch((error: unknown) => error)
    expect(missing).toMatchObject({ _tag: "SessionNotFoundError", sessionID: missingSessionID })
  } finally {
    await uf0rs.close()
    await uf0rs.close()
  }
})

test("Promise event streams support cancellation", async () => {
  await using directory = await tmpdir("uf0rs-promise-stream-")
  const config = join(directory.path, "config")
  await mkdir(config)
  {
    await using uf0rs = await WOPPS.create({ config: { directory: config, project: false, content: "{}" } })
    const controller = new AbortController()
    const events = uf0rs.events.subscribe({ signal: controller.signal })[Symbol.asyncIterator]()
    expect(await events.next()).toMatchObject({ value: { type: "server.connected" }, done: false })
    const pending = events.next()
    controller.abort()
    // A caller abort ends only this subscriber; client tests pin closing the shared transport after the last one.
    expect(await pending).toEqual({ done: true, value: undefined })
    await events.return?.()
  }
})

test("closing cancels active Promise event streams", async () => {
  await using directory = await tmpdir("uf0rs-promise-stream-close-")
  const config = join(directory.path, "config")
  await mkdir(config)
  const uf0rs = await WOPPS.create({ config: { directory: config, project: false, content: "{}" } })
  const events = uf0rs.events.subscribe()[Symbol.asyncIterator]()
  expect(await events.next()).toMatchObject({ value: { type: "server.connected" }, done: false })
  const pending = events.next()

  await uf0rs.close()
  const error = await pending.catch((error: unknown) => error)
  expect(error).toMatchObject({ name: "ClientError", reason: "Transport" })
})
