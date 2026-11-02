import { describe, expect, test } from "bun:test"
import { Effect } from "effect"
import { Model } from "@uf0rs/core/model"
import { Plugin } from "@uf0rs/core/plugin"
import { PluginHost } from "@uf0rs/core/plugin/host"
import { ProviderPlugins } from "@uf0rs/core/plugin/provider"
import { OpenRouterPlugin, parseOpenRouterModels } from "@uf0rs/core/plugin/provider/openrouter"
import { Provider } from "@uf0rs/core/provider"
import { testEffect } from "../lib/effect"
import { PluginTestLayer } from "./fixture"

const it = testEffect(PluginTestLayer)

const addPlugin = Effect.fn(function* () {
  const plugin = yield* Plugin.Service
  const host = yield* PluginHost.make(plugin)
  yield* OpenRouterPlugin.effect(host)
})

describe("OpenRouterPlugin", () => {
  test("is registered so legacy OpenRouter behavior can be applied", () => {
    expect(ProviderPlugins.map((item) => item.id)).toContain("uf0rs.provider.openrouter")
  })

  it.effect("applies legacy referer headers only to openrouter", () =>
    Effect.gen(function* () {
      const catalog = yield* Provider.Service
      yield* catalog.transform((catalog) => {
        catalog.update(Provider.ID.openrouter, (provider) => {
          provider.package = "@uf0rs/ai/providers/openrouter"
          provider.headers = { Existing: "value" }
        })
        catalog.update(Provider.ID.make("nvidia"), () => {})
      })
      yield* addPlugin()

      expect((yield* catalog.get(Provider.ID.openrouter))?.headers).toEqual({
        Existing: "value",
        "HTTP-Referer": "https://github.com/uf0rs/wopps-agent/",
        "X-Title": "WOPPS by UF0RS STUDIO",
      })
      expect((yield* catalog.get(Provider.ID.make("nvidia")))?.headers).toBeUndefined()
    }),
  )

  it.effect("loads the OpenRouter catalog when an API key is configured in provider settings", () =>
    Effect.gen(function* () {
      const catalog = yield* Provider.Service
      const models = yield* Model.Service
      const originalFetch = globalThis.fetch
      let markFetchStarted!: () => void
      const fetchStarted = new Promise<void>((resolve) => {
        markFetchStarted = resolve
      })
      globalThis.fetch = async () => {
        markFetchStarted()
        return Response.json({
          data: [
            {
              id: "vendor/configured-key-model",
              name: "Configured key model",
              architecture: { input_modalities: ["text"], output_modalities: ["text"] },
              supported_parameters: ["tools"],
            },
          ],
        })
      }

      try {
        yield* catalog.transform((catalog) => {
          catalog.update(Provider.ID.openrouter, (provider) => {
            provider.package = "@uf0rs/ai/providers/openrouter"
            provider.settings = { apiKey: "test-key" }
          })
        })
        yield* addPlugin()
        yield* Effect.promise(() => fetchStarted)
        yield* Effect.promise(() => new Promise((resolve) => setTimeout(resolve, 25)))

        expect((yield* models.get(Provider.ID.openrouter, Model.ID.make("vendor/configured-key-model")))?.name).toBe(
          "Configured key model",
        )
      } finally {
        globalThis.fetch = originalFetch
      }
    }),
  )

  it.effect("filters OpenRouter's gpt-5 chat alias", () =>
    Effect.gen(function* () {
      const catalog = yield* Provider.Service
      const models = yield* Model.Service
      yield* catalog.transform((catalog) => {
        catalog.update(Provider.ID.openrouter, (provider) => {
          provider.package = "@uf0rs/ai/providers/openrouter"
        })
        catalog.update(Provider.ID.openai, () => {})
        catalog.models.update(Provider.ID.openrouter, Model.ID.make("openai/gpt-5-chat"), () => {})
        catalog.models.update(Provider.ID.openrouter, Model.ID.make("openai/gpt-5"), () => {})
        catalog.models.update(Provider.ID.openai, Model.ID.make("openai/gpt-5-chat"), () => {})
      })
      yield* addPlugin()

      expect((yield* models.get(Provider.ID.openrouter, Model.ID.make("openai/gpt-5-chat")))?.enabled).toBe(
        false,
      )
      expect((yield* models.get(Provider.ID.openrouter, Model.ID.make("openai/gpt-5")))?.enabled).toBe(true)
      expect((yield* models.get(Provider.ID.openai, Model.ID.make("openai/gpt-5-chat")))?.enabled).toBe(true)
    }),
  )

  it.effect("does not disable gpt-5-chat-latest for non-OpenRouter providers", () =>
    Effect.gen(function* () {
      const catalog = yield* Provider.Service
      const models = yield* Model.Service
      yield* catalog.transform((catalog) => {
        catalog.update(Provider.ID.make("custom-openrouter"), () => {})
        catalog.models.update(Provider.ID.make("custom-openrouter"), Model.ID.make("gpt-5-chat-latest"), () => {})
      })
      yield* addPlugin()
      expect(
        (yield* models.get(Provider.ID.make("custom-openrouter"), Model.ID.make("gpt-5-chat-latest")))?.enabled,
      ).toBe(true)
    }),
  )

  test("lists only OpenRouter models that support text and tool calls", () => {
    const models = parseOpenRouterModels({
      data: [
        {
          id: "anthropic/claude-sonnet-4",
          name: "Claude Sonnet 4",
          created: 1_700_000_000,
          context_length: 200_000,
          architecture: { input_modalities: ["text", "image"], output_modalities: ["text"] },
          supported_parameters: ["tools", "temperature"],
          pricing: { prompt: "0.000003", completion: "0.000015", input_cache_read: "0.0000003" },
          top_provider: { max_completion_tokens: 32_000 },
        },
        {
          id: "vendor/no-tools",
          architecture: { modality: "text->text" },
          supported_parameters: ["temperature"],
        },
        {
          id: "vendor/image-only",
          architecture: { input_modalities: ["image"], output_modalities: ["image"] },
          supported_parameters: ["tools"],
        },
        { name: "invalid" },
      ],
    })

    expect(models).toHaveLength(1)
    expect(models[0]).toMatchObject({
      id: "anthropic/claude-sonnet-4",
      modelID: "anthropic/claude-sonnet-4",
      providerID: "openrouter",
      name: "Claude Sonnet 4",
      capabilities: {
        tools: true,
        input: ["text", "image"],
        output: ["text"],
        temperature: true,
      },
      time: { released: 1_700_000_000_000 },
      cost: [{ input: 3, output: 15, cache: { read: 0.3, write: 0 } }],
      limit: { context: 200_000, input: 168_000, output: 32_000 },
      status: "active",
      enabled: true,
    })
  })
})
