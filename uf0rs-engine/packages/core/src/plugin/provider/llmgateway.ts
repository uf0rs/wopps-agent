import { Effect } from "effect"
import { define } from "@uf0rs/plugin/effect/plugin"
import { Integration } from "../../integration.js"

export const LLMGatewayPlugin = define({
  id: "uf0rs.provider.llmgateway",
  effect: Effect.fn(function* (ctx) {
    const integrations = yield* Integration.Service
    const configured = new Set((yield* integrations.list()).map((integration) => integration.id))
    yield* ctx.provider.transform((evt) => {
      for (const item of evt.list()) {
        if (item.provider.activation === "disabled") continue
        if (item.provider.package !== "@uf0rs/ai/providers/openai-compatible") continue
        if (item.provider.settings?.baseURL !== "https://api.llmgateway.io/v1") continue
        if (!configured.has(Integration.ID.make(item.provider.id))) continue
        evt.update(item.provider.id, (provider) => {
          provider.headers = {
            ...provider.headers,
            "HTTP-Referer": "https://github.com/uf0rs/wopps-ai/",
            "X-Title": "UF0RS AI",
            "X-Source": "uf0rs",
          }
        })
      }
    })
  }),
})
