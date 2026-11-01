export * as WOPPSWorkerd from "./workerd"

import { Layer } from "effect"
import type { Config, Scope } from "effect"
import { WorkerdProfile } from "../internal/workerd"
import { WOPPS } from "./uf0rs"

export type Configuration = WorkerdProfile.Configuration

export interface CreateOptions<R = never> extends WorkerdProfile.Options {
  readonly log?: WOPPS.CreateOptions["log"]
  readonly plugins?: WOPPS.CreateOptions["plugins"]
  readonly workspaceProviders?: WOPPS.CreateOptions["workspaceProviders"]
  readonly instances?: WOPPS.CreateOptions<R>["instances"]
}

export const create = <R = never>({ log, plugins, workspaceProviders, instances, ...options }: CreateOptions<R>) => {
  const profile = WorkerdProfile.make(options)
  return WOPPS.create(
    { ...profile.options, log, plugins, workspaceProviders, instances },
    { overrides: profile.replacements },
  )
}

export const layer = <R = never>(
  options: CreateOptions<R>,
): Layer.Layer<WOPPS.Service, Config.ConfigError | Error, Exclude<R, Scope.Scope>> =>
  Layer.effect(WOPPS.Service, create(options))

export type Interface = WOPPS.Interface
export type Requirements = Scope.Scope
