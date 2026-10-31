import { createSignal } from "solid-js"
import { useConfig } from "../config"
import { useArgs } from "./args"
import { createSimpleContext } from "./helper"

export type PermissionMode = "prompt" | "autoaccept"

export const { use: usePermission, provider: PermissionProvider } = createSimpleContext({
  name: "Permission",
  init: () => {
    const args = useArgs()
    const config = useConfig()
    const [override, setOverride] = createSignal<PermissionMode>()
    return {
      get mode(): PermissionMode {
        return override() ?? (args.auto ? "autoaccept" : config.data.session.permissions)
      },
      setMode(mode: PermissionMode) {
        setOverride(mode)
      },
      toggle() {
        setOverride(this.mode === "autoaccept" ? "prompt" : "autoaccept")
      },
    }
  },
})
