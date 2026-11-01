// TODO: Keep additional network capabilities inside Schema and Protocol as the client grows; /effect must never import
// Core or Server. Preserve these datatype exports so internal model reorganizations do not require caller migrations.
import type { Effect } from "effect"
import type { WOPPS } from "./client.js"

export * from "./generated/index"
export { WOPPS } from "./client.js"
export type {
  AgentApi,
  AppApi,
  CommandApi,
  ConfigApi,
  EventApi,
  IntegrationApi,
  ModelApi,
  PluginApi,
  ProviderApi,
  ReferenceApi,
  RpcApi,
  RpcClient,
  WebSearchApi,
  SessionApi,
  SkillApi,
} from "./api.js"
export { Agent } from "@uf0rs/schema/agent"
export { Command } from "@uf0rs/schema/command"
export { Config } from "@uf0rs/schema/config"
export { Credential } from "@uf0rs/schema/credential"
export { Event } from "@uf0rs/schema/event"
export { EventLog } from "@uf0rs/schema/event-log"
export { FileSystem } from "@uf0rs/schema/filesystem"
export { Form } from "@uf0rs/schema/form"
export { Integration } from "@uf0rs/schema/integration"
export { Location } from "@uf0rs/schema/location"
export { Model } from "@uf0rs/schema/model"
export { Permission } from "@uf0rs/schema/permission"
export { PermissionSaved } from "@uf0rs/schema/permission-saved"
export { Project } from "@uf0rs/schema/project"
export { Worktree } from "@uf0rs/schema/worktree"
export { Vcs } from "@uf0rs/schema/vcs"
export { Provider } from "@uf0rs/schema/provider"
export { Pty } from "@uf0rs/schema/pty"
export { Question } from "@uf0rs/schema/question"
export { Reference } from "@uf0rs/schema/reference"
export { WebSearch } from "@uf0rs/schema/websearch"
export { AbsolutePath, RelativePath } from "@uf0rs/schema/schema"
export { Session } from "@uf0rs/schema/session"
export { SessionInbox } from "@uf0rs/schema/session-inbox"
export { SessionMessage } from "@uf0rs/schema/session-message"
export { Skill } from "@uf0rs/schema/skill"
export { Prompt } from "@uf0rs/schema/prompt"
export { PromptInput } from "@uf0rs/schema/prompt-input"
export type { WOPPSEvent } from "@uf0rs/protocol/groups/event"
export type WOPPSClient = Effect.Success<ReturnType<typeof WOPPS.make>>
