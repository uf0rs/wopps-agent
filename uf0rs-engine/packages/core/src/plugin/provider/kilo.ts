import { Effect } from "effect"
import { define } from "@uf0rs/plugin/effect/plugin"

export const KiloPlugin = define({
  id: "uf0rs.provider.kilo",
  effect: Effect.fn(function* (ctx) {
    yield* ctx.provider.transform((evt) => {
      for (const item of evt.list()) {
        if (item.provider.package !== "@uf0rs/ai/providers/openai-compatible") continue
        if (item.provider.settings?.baseURL !== "https://api.kilo.ai/api/gateway") continue
        evt.update(item.provider.id, (provider) => {
          provider.headers = {
            ...provider.headers,
            "HTTP-Referer": "https://github.com/uf0rs/wopps-agent/",
            "X-Title": "UF0RS AGENT",
          }
        })
      }
    })
  }),
})
