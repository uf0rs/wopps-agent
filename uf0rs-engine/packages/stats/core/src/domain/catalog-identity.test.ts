import { describe, expect, test } from "bun:test"
import { catalogIdentity } from "./catalog-identity"

describe("stats catalog identity", () => {
  test("resolves WOPPS offerings to canonical labs", () => {
    const identity = catalogIdentity({
      models: { "meituan/longcat-2.5-preview": {} },
      providers: {
        uf0rs: { models: { "longcat-2.5-preview-free": { canonical_model_id: "meituan/longcat-2.5-preview" } } },
        "uf0rs-go": {
          models: { "longcat-2.5-preview-free": { canonical_model_id: "meituan/longcat-2.5-preview" } },
        },
      },
    })

    expect(identity.offerings.get("uf0rs/longcat-2.5-preview-free")).toBe("meituan")
    expect(identity.offerings.get("uf0rs-go/longcat-2.5-preview-free")).toBe("meituan")
    expect(identity.models.get("longcat-2.5-preview")).toBe("meituan")
  })

  test("does not guess a lab for a name shared by different canonical models", () => {
    const identity = catalogIdentity({
      models: { "lab-a/model": {}, "lab-b/model": {} },
      providers: {
        uf0rs: { models: { "model-free": { canonical_model_id: "lab-a/model" } } },
        "uf0rs-go": { models: { model: { canonical_model_id: "lab-b/model" } } },
      },
    })

    expect(identity.offerings.get("uf0rs/model-free")).toBe("lab-a")
    expect(identity.offerings.get("uf0rs-go/model")).toBe("lab-b")
    expect(identity.models.has("model")).toBe(false)
  })

  test("accepts provider IDs that are already canonical catalog IDs", () => {
    const identity = catalogIdentity({
      models: { "uf0rs/direct-model": {} },
      providers: { uf0rs: { models: { "direct-model": {} } } },
    })

    expect(identity.offerings.get("uf0rs/direct-model")).toBe("uf0rs")
    expect(identity.models.get("direct-model")).toBe("uf0rs")
  })

  test("rejects a catalog without published canonical identities", () => {
    expect(() => catalogIdentity({ models: {}, providers: { uf0rs: { models: { model: {} } } } })).toThrow(
      "Model catalog has no canonical WOPPS offerings",
    )
  })
})
