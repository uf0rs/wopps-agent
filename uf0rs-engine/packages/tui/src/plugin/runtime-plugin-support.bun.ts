import { ensurePluginRuntime, provides } from "@uf0rs/plugin/runtime"
import { Plugin, PluginContextProvider, usePlugin } from "@uf0rs/plugin/tui"
import { ensureRuntimePluginSupport } from "@opentui/solid/runtime-plugin-support/configure"

ensurePluginRuntime()
ensureRuntimePluginSupport({
  additional: {
    "@uf0rs/plugin/tui": { Plugin, PluginContextProvider, usePlugin },
  },
  preserve: provides,
})
