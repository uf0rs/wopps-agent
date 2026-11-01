// The module lists only: `gui()` reads them at build time, so this file imports nothing.

/**
 * The modules a plugin's `./gui-experimental` bundle may require that both processes provide, each its own instance.
 * Main maps `@uf0rs/plugin/gui` to the main SDK and a window maps `@uf0rs/plugin/gui/main` to the window SDK:
 * both export the same `Plugin`, `Store`, `Ipc`, `Contract` and `Registry`, so one definition and contract serve both
 * processes. `@uf0rs/plugin/rpc` is here because a plugin's `./rpc` contract imports it, and its GUI imports that
 * contract.
 */
export const pluginSharedModules = [
  "effect",
  "@uf0rs/plugin/gui",
  "@uf0rs/plugin/gui/main",
  "@uf0rs/plugin/rpc",
  "@uf0rs/schema/rpc",
  "@uf0rs/client",
  "@uf0rs/client/effect",
] as const

/**
 * The modules only a window provides to a plugin's `./gui-experimental` bundle; main gives the bundle an inert
 * placeholder.
 */
export const pluginWindowModules = [
  "solid-js",
  "solid-js/web",
  "solid-js/store",
  "@uf0rs/plugin/gui/file",
  "@uf0rs/plugin/gui/review",
  "@uf0rs/plugin/gui/browser",
  "@uf0rs/client/solid",
] as const

/** A module name in `pluginSharedModules` or `pluginWindowModules`. */
export type PluginModule = (typeof pluginSharedModules)[number] | (typeof pluginWindowModules)[number]
