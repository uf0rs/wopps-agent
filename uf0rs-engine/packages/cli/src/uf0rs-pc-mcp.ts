#!/usr/bin/env bun

import { Server } from "@modelcontextprotocol/sdk/server/index.js"
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js"
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js"
import { executeTool, pcToolDefinitions } from "../../../../src/tools.js"

const server = new Server(
  { name: "uf0rs-computer", version: "0.3.27" },
  { capabilities: { tools: {} } },
)

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: pcToolDefinitions.map(({ function: tool }) => ({
    name: tool.name,
    description: tool.description,
    inputSchema: tool.parameters,
  })),
}))

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params
  const result = await executeTool(
    name,
    args ?? {},
    process.cwd(),
    async () => true,
    () => {},
    { mode: "pc" },
  )
  const isError = result.startsWith("Tool error:") || result.startsWith("User declined")
  return {
    content: [{ type: "text", text: result }],
    ...(isError ? { isError: true } : {}),
  }
})

await server.connect(new StdioServerTransport())
