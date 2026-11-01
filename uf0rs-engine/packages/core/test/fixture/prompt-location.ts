import type { FileSystem } from "@uf0rs/core/filesystem"
import { Bus } from "@uf0rs/core/bus"
import { Image } from "@uf0rs/core/image"
import { LocationServiceMap } from "@uf0rs/core/location-service-map"
import type { LocationServices } from "@uf0rs/core/location-services"
import { Plugin } from "@uf0rs/core/plugin"
import { PluginHooks } from "@uf0rs/core/plugin/hooks"
import { Skill } from "@uf0rs/core/skill"
import type { Location } from "@uf0rs/schema/location"
import { makeGlobalNode } from "@uf0rs/util/effect/app-node"
import { LayerNode } from "@uf0rs/util/effect/layer-node"
import { Effect, Layer, LayerMap } from "effect"

// Plain-prompt unit fixtures use virtual directories.
export const promptLocationNode = makeGlobalNode({
  service: LocationServiceMap.Service,
  layer: Layer.effect(
    LocationServiceMap.Service,
    Effect.gen(function* () {
      const bus = yield* Bus.Service
      return yield* LayerMap.make(
        (_ref: Location.Ref) =>
          LayerNode.compile(LayerNode.group([PluginHooks.node, Image.node, Skill.node, Plugin.node]), {
            replacements: [
              Bus.node.replace(Layer.succeed(Bus.Service, bus)),
              Plugin.node.replace(Layer.mock(Plugin.Service, { awaitActivation: Effect.void })),
            ],
          }) as unknown as Layer.Layer<LocationServices, FileSystem.DirectoryNotFoundError>,
      )
    }),
  ),
  deps: [Bus.node],
})
