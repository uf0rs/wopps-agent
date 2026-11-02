import { Effect } from "effect"
import { define } from "@uf0rs/plugin/effect/plugin"

export const NvidiaPlugin = define({
  id: "uf0rs.provider.nvidia",
  effect: Effect.fn(function* (ctx) {
    yield* ctx.provider.transform((evt) => {
      for (const item of evt.list()) {
        if (item.provider.package !== "@uf0rs/ai/providers/openai-compatible") continue
        if (item.provider.settings?.baseURL !== "https://integrate.api.nvidia.com/v1") continue
        evt.update(item.provider.id, (provider) => {
          provider.headers = {
            ...provider.headers,
            "HTTP-Referer": "https://github.com/uf0rs/wopps-agent/",
            "X-Title": "UF0RS AGENT",
            "X-BILLING-INVOKE-ORIGIN": provider.headers?.["X-BILLING-INVOKE-ORIGIN"] ?? "UF0RS AGENT",
          }
        })
      }
    })
  }),
})
