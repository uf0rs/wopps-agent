import { Effect, Stream } from "effect"
import { Integration as IntegrationInfo } from "@opencode/schema/integration"
import { Money } from "@opencode/schema/money"
import { Model } from "../../model.js"
import { Provider } from "../../provider.js"
import { Bus } from "../../bus.js"
import { Integration } from "../../integration.js"
import { define } from "@opencode/plugin/effect/plugin"

type OpenRouterModel = {
  id: string
  name?: string
  created?: number
  context_length?: number
  architecture?: {
    modality?: string
    input_modalities?: string[]
    output_modalities?: string[]
  }
  supported_parameters?: string[]
  pricing?: {
    prompt?: string
    completion?: string
    input_cache_read?: string
    input_cache_write?: string
  }
  top_provider?: {
    max_completion_tokens?: number
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function strings(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : []
}

function positiveInteger(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0 ? value : fallback
}

function hasApiKey(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0
}

function perMillion(value: unknown): number | undefined {
  if (typeof value !== "string" && typeof value !== "number") return undefined
  const parsed = Number(value)
  const scaled = parsed * 1_000_000
  return Number.isFinite(scaled) && parsed >= 0 ? scaled : undefined
}

function modalities(value: OpenRouterModel["architecture"], side: "input" | "output"): string[] {
  const explicit = strings(side === "input" ? value?.input_modalities : value?.output_modalities)
  if (explicit.length) return explicit
  const [input, output] = (value?.modality ?? "").split("->")
  return (side === "input" ? input : output)?.includes("text") ? ["text"] : []
}

export function parseOpenRouterModels(value: unknown): Model.Info[] {
  if (!isRecord(value) || !Array.isArray(value.data)) return []
  const models: Model.Info[] = []
  for (const item of value.data) {
    if (!isRecord(item) || typeof item.id !== "string" || !item.id.trim()) continue
    const model = item as OpenRouterModel
    if (!strings(model.supported_parameters).includes("tools")) continue
    const input = modalities(model.architecture, "input")
    const output = modalities(model.architecture, "output")
    if (!input.includes("text") || !output.includes("text")) continue

    const base = Model.Info.default(Provider.ID.make("openrouter"), Model.ID.make(model.id))
    const prompt = perMillion(model.pricing?.prompt)
    const completion = perMillion(model.pricing?.completion)
    const cacheRead = perMillion(model.pricing?.input_cache_read)
    const cacheWrite = perMillion(model.pricing?.input_cache_write)
    const context = positiveInteger(model.context_length, base.limit.context)
    const maxOutput = positiveInteger(model.top_provider?.max_completion_tokens, base.limit.output)
    models.push({
      ...base,
      providerID: Provider.ID.make("openrouter"),
      name: typeof model.name === "string" && model.name.trim() ? model.name : model.id,
      type: "chat",
      capabilities: {
        tools: true,
        input,
        output,
        temperature: strings(model.supported_parameters).includes("temperature"),
      },
      time: {
        released:
          typeof model.created === "number" && Number.isFinite(model.created) && model.created > 0
            ? model.created * 1000
            : 0,
      },
      cost:
        prompt !== undefined && completion !== undefined
          ? [
              {
                input: Money.USDPerMillionTokens.make(prompt),
                output: Money.USDPerMillionTokens.make(completion),
                cache: {
                  read: Money.USDPerMillionTokens.make(cacheRead ?? 0),
                  write: Money.USDPerMillionTokens.make(cacheWrite ?? 0),
                },
              },
            ]
          : [],
      limit: { context, input: Math.max(0, context - maxOutput), output: maxOutput },
      status: "active",
      enabled: true,
    })
  }
  return models
}

async function fetchOpenRouterModels(): Promise<Model.Info[]> {
  const response = await fetch("https://openrouter.ai/api/v1/models", {
    headers: {
      "HTTP-Referer": "https://github.com/uf0rs/wopps-ai/",
      "X-Title": "WOPPS by UF0RS STUDIO",
    },
    signal: AbortSignal.timeout(10_000),
  })
  if (!response.ok) throw new Error(`OpenRouter model listing failed (${response.status}): ${await response.text()}`)
  const models = parseOpenRouterModels(await response.json())
  if (!models.length) throw new Error("OpenRouter returned no text models with tool-calling support.")
  return models
}

export const OpenRouterPlugin = define({
  id: "opencode.provider.openrouter",
  effect: Effect.fn(function* (ctx) {
    const bus = yield* Bus.Service
    const integrations = yield* Integration.Service
    const providers = yield* Provider.Service
    let cached: { expiresAt: number; models: Model.Info[] } | undefined
    let pending: Promise<Model.Info[]> | undefined
    const syncModels = Effect.fn("OpenRouterPlugin.syncModels")(function* () {
      const integration = yield* integrations.get(IntegrationInfo.ID.make("openrouter"))
      const configuredKey = (yield* providers.get(Provider.ID.openrouter))?.settings?.apiKey
      if (!integration?.connections.length && !hasApiKey(process.env.OPENROUTER_API_KEY) && !hasApiKey(configuredKey))
        return
      let models: Model.Info[]
      try {
        if (cached && cached.expiresAt > Date.now()) {
          models = cached.models
        } else {
          pending ??= fetchOpenRouterModels()
          models = yield* Effect.promise(() => pending!)
          cached = { expiresAt: Date.now() + 15 * 60_000, models }
        }
      } catch (error) {
        pending = undefined
        yield* Effect.logWarning("Could not refresh the OpenRouter model list; keeping the bundled models.", {
          cause: error,
        })
        return
      } finally {
        pending = undefined
      }
      yield* ctx.provider.transform((providers) => {
        for (const item of providers.list()) {
          if (item.provider.package !== "@opencode/ai/providers/openrouter") continue
          providers.models.set(item.provider.id, models)
        }
      })
    })
    yield* ctx.provider.transform((evt) => {
      for (const item of evt.list()) {
        if (item.provider.package !== "@opencode/ai/providers/openrouter") continue
        evt.update(item.provider.id, (provider) => {
          provider.headers = {
            ...provider.headers,
            "HTTP-Referer": "https://github.com/uf0rs/wopps-ai/",
            "X-Title": "WOPPS by UF0RS STUDIO",
          }
        })
      }
    })
    yield* ctx.model.transform((models) => {
      for (const item of models.provider.list()) {
        if (item.provider.package !== "@opencode/ai/providers/openrouter") continue
        for (const modelID of [Model.ID.make("gpt-5-chat-latest"), Model.ID.make("openai/gpt-5-chat")]) {
          if (!models.get(item.provider.id, modelID)) continue
          models.update(item.provider.id, modelID, (model) => {
            // These are OpenRouter-specific OpenAI chat aliases that do not work
            // on the generic path. Keep custom providers with matching IDs untouched.
            model.enabled = false
          })
        }
      }
    })
    yield* bus.subscribe(IntegrationInfo.Event.Updated).pipe(
      Stream.runForEach(() => syncModels()),
      Effect.forkScoped({ startImmediately: true }),
    )
    yield* Effect.forkScoped(syncModels())
  }),
})
