import { Effect } from "effect"
import { define } from "@uf0rs/plugin/effect/plugin"

export const ZenmuxPlugin = define({
  id: "uf0rs.provider.zenmux",
  effect: Effect.fn(function* (ctx) {
    yield* ctx.provider.transform((evt) => {
      for (const item of evt.list()) {
        if (item.provider.package !== "@uf0rs/ai/providers/openai-compatible") continue
        if (item.provider.settings?.baseURL !== "https://zenmux.ai/api/v1") continue
        evt.update(item.provider.id, (provider) => {
          provider.headers = {
            "HTTP-Referer": "https://github.com/uf0rs/wopps-ai/",
            "X-Title": "UF0RS AI",
            ...provider.headers,
          }
        })
      }
    })
  }),
})
