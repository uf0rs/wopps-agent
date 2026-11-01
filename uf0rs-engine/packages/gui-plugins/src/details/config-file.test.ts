import { expect, test } from "bun:test"
import { globalConfigDirectory, serviceConfigFile } from "./config-file"

const global = "/home/kit/.config/uf0rs/uf0rs.jsonc"

const project = "/work/acme/.uf0rs/uf0rs.jsonc"

test("a project file that sets a service without entries does not hide the global file's entries", () => {
  const entries = [
    {
      type: "document" as const,
      path: global,
      info: {
        mcp: { servers: { atlas: { type: "remote" as const, url: "https://atlas.example" } } },
        plugins: ["uf0rs-tidewater"],
      },
    },
    {
      type: "document" as const,
      path: project,
      info: { mcp: {}, plugins: [], lsp: { zephyr: { command: ["zephyr"] } } },
    },
    { type: "document" as const, path: "/work/acme/.uf0rs/agents/review.md", info: {} },
  ]

  expect(serviceConfigFile(entries, "mcp")).toBe(global)
  expect(serviceConfigFile(entries, "plugins")).toBe(global)
  expect(serviceConfigFile(entries, "lsp")).toBe(project)
  // Nothing lists skills, so the first file, the global one, is where they would go.
  expect(serviceConfigFile(entries, "skills")).toBe(global)
})

test("a file that only sets a service still wins over one that never mentions it", () => {
  const entries = [
    { type: "document" as const, path: global, info: {} },
    { type: "document" as const, path: project, info: { lsp: false } },
  ]

  expect(serviceConfigFile(entries, "lsp")).toBe(project)
  expect(serviceConfigFile([], "lsp")).toBeUndefined()
})

test("setup sessions run in the global configuration's directory, never an ancestor project's", () => {
  // In the server's order: global files and root, an ancestor's config outside the worktree, then the project's.
  const ancestor = "/work/uf0rs.json"
  const projectRoot = { type: "directory" as const, path: "/work/acme/.uf0rs" }

  const entries = [
    { type: "document" as const, path: global, info: {} },
    { type: "directory" as const, path: "/home/kit/.config/uf0rs" },
    { type: "document" as const, path: ancestor, info: {} },
    { type: "document" as const, path: project, info: {} },
    projectRoot,
  ]

  expect(globalConfigDirectory(entries, "/work/acme")).toBe("/home/kit/.config/uf0rs")
  // With global configuration off, the ancestor's directory is still not taken for the global one.
  expect(
    globalConfigDirectory(
      [{ type: "document", path: ancestor, info: {} }, { type: "document", path: project, info: {} }, projectRoot],
      "/work/acme",
    ),
  ).toBe("/work/acme")
})
