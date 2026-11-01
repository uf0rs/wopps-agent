import { describe, expect } from "bun:test"
import { Effect, Layer } from "effect"
import { Database } from "@uf0rs/core/database/database"
import { AppNodeBuilder } from "@uf0rs/core/effect/app-node-builder"
import { LayerNode } from "@uf0rs/util/effect/layer-node"
import { Bus } from "@uf0rs/core/bus"
import { Location } from "@uf0rs/core/location"
import { Project } from "@uf0rs/core/project"
import { AbsolutePath } from "@uf0rs/core/schema"
import { Session } from "@uf0rs/core/session"
import { SessionProjector } from "@uf0rs/core/session/projector"
import { SessionExecution } from "@uf0rs/core/session/execution"
import { SessionStore } from "@uf0rs/core/session/store"
import { testEffect } from "./lib/effect"
import { globalProjectNode } from "./lib/project"

const location = Location.Ref.make({ directory: AbsolutePath.make("/project") })
const awaited: Session.ID[] = []
const execution = Layer.mock(SessionExecution.Service, {
  awaitIdle: (sessionID) => Effect.sync(() => awaited.push(sessionID)),
})
const it = testEffect(
  AppNodeBuilder.build(
    LayerNode.group([Database.node, Bus.node, SessionProjector.node, SessionStore.node, Session.node]),
    [Project.node.replace(globalProjectNode), SessionExecution.node.replace(execution)],
  ),
)

describe("Session.wait", () => {
  it.effect("delegates to SessionExecution.awaitIdle", () =>
    Effect.gen(function* () {
      awaited.length = 0
      const sessions = yield* Session.Service
      const session = yield* sessions.create({ location })

      yield* sessions.wait(session.id)

      expect(awaited).toEqual([session.id])
    }),
  )
})
