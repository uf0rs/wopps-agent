import { expect, setDefaultTimeout } from "bun:test"
import { Agent } from "@uf0rs/core/agent"
import { Bus } from "@uf0rs/core/bus"
import { Model } from "@uf0rs/core/model"
import { Provider } from "@uf0rs/core/provider"
import { Session } from "@uf0rs/core/session"
import { SessionEvent } from "@uf0rs/core/session/event"
import { SessionExecution } from "@uf0rs/core/session/execution"
import { SessionMessage } from "@uf0rs/core/session/message"
import { Money } from "@uf0rs/schema/money"
import { makeGlobalNode } from "@uf0rs/util/effect/app-node"
import { Effect, Layer } from "effect"
import { tmpdir } from "../../core/test/fixture/tmpdir"
import { it } from "../../core/test/lib/effect"
import { ServerFetch } from "../src/fetch"

setDefaultTimeout(30_000)

it.live("serves turn diffs by user message with range validation", () =>
  Effect.gen(function* () {
    const tmp = yield* Effect.acquireDisposable(Effect.promise(() => tmpdir("uf0rs-session-diff-")))
    const ids = { user: SessionMessage.ID.create(), assistant: SessionMessage.ID.create() }
    // Deliver the prompt and one step the way the runner would, without a model.
    const execution = Layer.effect(
      SessionExecution.Service,
      Effect.gen(function* () {
        const bus = yield* Bus.Service
        return SessionExecution.Service.of({
          active: Effect.succeed(new Set()),
          isActive: () => Effect.succeed(false),
          resume: () => Effect.void,
          wake: (sessionID) =>
            Effect.gen(function* () {
              yield* bus.publish(SessionEvent.InboxDelivered, { sessionID, inboxID: ids.user })
              yield* bus.publish(SessionEvent.Step.Started, {
                sessionID,
                assistantMessageID: ids.assistant,
                agent: Agent.defaultID,
                model: { id: Model.ID.make("model"), providerID: Provider.ID.make("provider") },
                started: 0,
              })
              yield* bus.publish(SessionEvent.Step.Ended, {
                sessionID,
                assistantMessageID: ids.assistant,
                finish: "stop",
                cost: Money.USD.zero,
                tokens: { input: 0, output: 0, reasoning: 0, cache: { read: 0, write: 0 } },
              })
            }),
          interrupt: () => Effect.succeed(false),
          awaitIdle: () => Effect.void,
        })
      }),
    )
    const handler = yield* ServerFetch.make(
      {
        app: { version: "test-version" },
        database: { path: ":memory:" },
        fs: { filewatcher: false },
        models: { fetch: false },
      },
      {
        overrides: [
          SessionExecution.node.replace(
            makeGlobalNode({ service: SessionExecution.Service, layer: execution, deps: [Bus.node] }),
          ),
        ],
      },
    )
    const request = (path: string, body?: unknown) =>
      Effect.promise(async () => {
        const response = await handler(
          new Request(`http://uf0rs.local${path}`, {
            method: body === undefined ? "GET" : "POST",
            headers: body === undefined ? undefined : { "content-type": "application/json" },
            body: body === undefined ? undefined : JSON.stringify(body),
          }),
        )
        return { status: response.status, body: (await response.json()) as Record<string, unknown> }
      })
    const created = yield* request("/api/session", { location: { directory: tmp.path } })
    const sessionID = Session.ID.make((created.body.data as { id: string }).id)
    const diff = (query = "") => request(`/api/session/${sessionID}/diff${query}`)

    expect(yield* diff()).toEqual({ status: 200, body: { data: [] } })
    expect((yield* request(`/api/session/${sessionID}/prompt`, { id: ids.user, text: "prompt" })).status).toBe(200)
    // Not a git repository, so steps record no snapshots and the turn has no diff.
    expect(yield* diff(`?from=${ids.user}&context=3`)).toEqual({ status: 200, body: { data: [] } })
    expect(yield* diff(`?from=${ids.assistant}`)).toMatchObject({
      status: 400,
      body: { _tag: "InvalidRequestError", field: "from" },
    })
    expect(yield* diff(`?from=${SessionMessage.ID.create()}`)).toMatchObject({
      status: 404,
      body: { _tag: "MessageNotFoundError" },
    })
    expect((yield* request(`/api/session/${Session.ID.create()}/diff`)).status).toBe(404)
  }),
)
