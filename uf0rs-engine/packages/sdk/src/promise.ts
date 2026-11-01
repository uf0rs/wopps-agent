export * as PromiseSdk from "./promise"

import { WOPPS, type WOPPSClient } from "@uf0rs/client"
import type { Plugin } from "@uf0rs/plugin"
import { Session } from "@uf0rs/schema/session"
import { Effect, Schema } from "effect"
import { EmbeddedHost } from "./internal/host"

export interface InstanceConfiguration {
  readonly plugins: ReadonlyArray<Plugin.Plugin>
}

export interface InstanceOptions {
  /** Select a sharing key within the Session's current Location. Must not initialize plugins. */
  readonly key: (session: typeof Session.Info.Encoded) => string
  /** Reconstruct configuration on a cache miss, including after a host restart. */
  readonly configure: (key: string) => InstanceConfiguration | Promise<InstanceConfiguration>
}

export interface CreateOptions
  extends Omit<EmbeddedHost.CreateOptions, "plugins" | "workspaceProviders" | "instances"> {
  readonly plugins?: ReadonlyArray<Plugin.Plugin>
  readonly instances?: InstanceOptions
}

export type Interface = Omit<WOPPSClient, "plugin"> & {
  readonly sessions: WOPPSClient["session"]
  readonly events: WOPPSClient["event"]
  readonly plugin: ((plugin: Plugin.Plugin) => Promise<void>) & WOPPSClient["plugin"]
  readonly close: () => Promise<void>
  readonly [Symbol.asyncDispose]: () => Promise<void>
}

export async function create(options: CreateOptions = {}, embed: EmbeddedHost.EmbedOptions = {}): Promise<Interface> {
  const { plugins, instances, ...hostOptions } = options
  const host = await Effect.runPromise(
    EmbeddedHost.create(
      {
        ...hostOptions,
        plugins: await adaptPlugins(plugins),
        instances: instances
          ? {
              key: (session) => instances.key(Schema.encodeSync(Session.Info)(session)),
              configure: (key) =>
                Effect.gen(function* () {
                  const { PluginPromise } = yield* Effect.promise(() => import("@uf0rs/core/plugin/promise"))
                  const configuration = yield* Effect.tryPromise(async () => instances.configure(key))
                  return { plugins: configuration.plugins.map(PluginPromise.fromPromise) }
                }),
            }
          : undefined,
      },
      embed,
    ),
  )
  const client = WOPPS.make({ baseUrl: "http://uf0rs.local", fetch: host.fetch })
  const register = async (plugin: Plugin.Plugin) => {
    const { PluginPromise } = await import("@uf0rs/core/plugin/promise")
    return host.runtime.runPromise(host.plugins.register(PluginPromise.fromPromise(plugin)))
  }
  return {
    ...client,
    sessions: client.session,
    events: client.event,
    plugin: Object.assign(register, client.plugin),
    close: host.close,
    [Symbol.asyncDispose]: host.close,
  }
}

async function adaptPlugins(plugins: ReadonlyArray<Plugin.Plugin> | undefined) {
  if (!plugins?.length) return undefined
  const { PluginPromise } = await import("@uf0rs/core/plugin/promise")
  return plugins.map(PluginPromise.fromPromise)
}
