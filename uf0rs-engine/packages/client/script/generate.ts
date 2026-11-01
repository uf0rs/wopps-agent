import { NodeFileSystem } from "@effect/platform-node"
import { compile, emitEffectImported, emitEffectShape, emitPromise, write } from "@uf0rs/httpapi-codegen"
import {
  ClientApi,
  clientNamespace,
  effectOmitEndpoints,
  groupNames,
  promiseOmitEndpoints,
} from "@uf0rs/protocol/client"
import { Agent } from "@uf0rs/schema/agent"
import { Artifact } from "@uf0rs/schema/artifact"
import { Command } from "@uf0rs/schema/command"
import { Config } from "@uf0rs/schema/config"
import { Credential } from "@uf0rs/schema/credential"
import { Event } from "@uf0rs/schema/event"
import { EventLog } from "@uf0rs/schema/event-log"
import { FileDiff } from "@uf0rs/schema/file-diff"
import { FileSystem } from "@uf0rs/schema/filesystem"
import { Form } from "@uf0rs/schema/form"
import { Generate } from "@uf0rs/schema/generate"
import { Instruction } from "@uf0rs/schema/instruction"
import { InstructionEntry } from "@uf0rs/schema/instruction-entry"
import { Integration } from "@uf0rs/schema/integration"
import { Location } from "@uf0rs/schema/location"
import { Mcp } from "@uf0rs/schema/mcp"
import { Model } from "@uf0rs/schema/model"
import { Money } from "@uf0rs/schema/money"
import { Permission } from "@uf0rs/schema/permission"
import { PermissionSaved } from "@uf0rs/schema/permission-saved"
import { Plugin } from "@uf0rs/schema/plugin"
import { Project } from "@uf0rs/schema/project"
import { Worktree } from "@uf0rs/schema/worktree"
import { AgentAttachment, FileAttachment, Prompt, PromptMention } from "@uf0rs/schema/prompt"
import { PromptInput } from "@uf0rs/schema/prompt-input"
import { Provider } from "@uf0rs/schema/provider"
import { Pty } from "@uf0rs/schema/pty"
import { PtyTicket } from "@uf0rs/schema/pty-ticket"
import { Question } from "@uf0rs/schema/question"
import { Reference } from "@uf0rs/schema/reference"
import { AbsolutePath, RelativePath } from "@uf0rs/schema/schema"
import { Schedule } from "@uf0rs/schema/schedule"
import { Session } from "@uf0rs/schema/session"
import { SessionMessage } from "@uf0rs/schema/session-message"
import { SessionInbox } from "@uf0rs/schema/session-inbox"
import { Shell } from "@uf0rs/schema/shell"
import { Skill } from "@uf0rs/schema/skill"
import { Snapshot } from "@uf0rs/schema/snapshot"
import { UsageLimits } from "@uf0rs/schema/usage-limits"
import { Vcs } from "@uf0rs/schema/vcs"
import { WebSearch } from "@uf0rs/schema/websearch"
import { Workspace } from "@uf0rs/schema/workspace"
import { Effect, Schema } from "effect"
import { fileURLToPath } from "url"

const promiseContract = compile(ClientApi, {
  groupNames,
  omitEndpoints: promiseOmitEndpoints,
  namespace: clientNamespace,
  aliases: true,
})
const effectContract = compile(ClientApi, {
  groupNames,
  omitEndpoints: effectOmitEndpoints,
  namespace: clientNamespace,
  aliases: true,
})
const effectTypeReferences = [
  ...namespaceTypes("Agent", "@uf0rs/schema/agent", Agent),
  ...namespaceTypes("Artifact", "@uf0rs/schema/artifact", Artifact),
  ...namespaceTypes("Command", "@uf0rs/schema/command", Command),
  ...namespaceTypes("Config", "@uf0rs/schema/config", Config),
  ...namespaceTypes("Credential", "@uf0rs/schema/credential", Credential),
  ...namespaceTypes("Event", "@uf0rs/schema/event", Event),
  ...namespaceTypes("EventLog", "@uf0rs/schema/event-log", EventLog),
  ...namespaceTypes("FileDiff", "@uf0rs/schema/file-diff", FileDiff),
  ...namespaceTypes("FileSystem", "@uf0rs/schema/filesystem", FileSystem),
  ...namespaceTypes("Form", "@uf0rs/schema/form", Form),
  ...namespaceTypes("Generate", "@uf0rs/schema/generate", Generate),
  ...namespaceTypes("Instruction", "@uf0rs/schema/instruction", Instruction),
  ...namespaceTypes("InstructionEntry", "@uf0rs/schema/instruction-entry", InstructionEntry),
  ...namespaceTypes("Integration", "@uf0rs/schema/integration", Integration),
  typeReference("Location.PublicRef", "@uf0rs/schema/location", Location.PublicRef),
  typeReference("Location.PublicInfo", "@uf0rs/schema/location", Location.PublicInfo),
  ...namespaceTypes("Mcp", "@uf0rs/schema/mcp", Mcp),
  ...namespaceTypes("Model", "@uf0rs/schema/model", Model),
  ...namespaceTypes("Money", "@uf0rs/schema/money", Money),
  ...namespaceTypes("Permission", "@uf0rs/schema/permission", Permission),
  ...namespaceTypes("PermissionSaved", "@uf0rs/schema/permission-saved", PermissionSaved),
  ...namespaceTypes("Plugin", "@uf0rs/schema/plugin", Plugin),
  ...namespaceTypes("Project", "@uf0rs/schema/project", Project),
  ...namespaceTypes("Worktree", "@uf0rs/schema/worktree", Worktree),
  ...namespaceTypes("PromptInput", "@uf0rs/schema/prompt-input", PromptInput),
  ...namespaceTypes("Provider", "@uf0rs/schema/provider", Provider),
  ...namespaceTypes("Pty", "@uf0rs/schema/pty", Pty),
  ...namespaceTypes("PtyTicket", "@uf0rs/schema/pty-ticket", PtyTicket),
  ...namespaceTypes("Question", "@uf0rs/schema/question", Question),
  ...namespaceTypes("Reference", "@uf0rs/schema/reference", Reference),
  ...namespaceTypes("Schedule", "@uf0rs/schema/schedule", Schedule),
  ...namespaceTypes("Session", "@uf0rs/schema/session", Session),
  ...namespaceTypes("SessionMessage", "@uf0rs/schema/session-message", SessionMessage),
  ...namespaceTypes("SessionInbox", "@uf0rs/schema/session-inbox", SessionInbox),
  ...namespaceTypes("Shell", "@uf0rs/schema/shell", Shell),
  ...namespaceTypes("Skill", "@uf0rs/schema/skill", Skill),
  ...namespaceTypes("Snapshot", "@uf0rs/schema/snapshot", Snapshot),
  ...namespaceTypes("UsageLimits", "@uf0rs/schema/usage-limits", UsageLimits),
  ...namespaceTypes("Vcs", "@uf0rs/schema/vcs", Vcs),
  ...namespaceTypes("WebSearch", "@uf0rs/schema/websearch", WebSearch),
  ...namespaceTypes("Workspace", "@uf0rs/schema/workspace", Workspace),
  typeReference("Prompt", "@uf0rs/schema/prompt", Prompt),
  typeReference("PromptMention", "@uf0rs/schema/prompt", PromptMention),
  typeReference("FileAttachment", "@uf0rs/schema/prompt", FileAttachment),
  typeReference("AgentAttachment", "@uf0rs/schema/prompt", AgentAttachment),
  typeReference("AbsolutePath", "@uf0rs/schema/schema", AbsolutePath),
  typeReference("RelativePath", "@uf0rs/schema/schema", RelativePath),
]

await Effect.runPromise(
  Effect.all(
    [
      write(
        emitPromise(promiseContract, {
          mutableOutputs: true,
        }),
        fileURLToPath(new URL("../src/promise/generated", import.meta.url)),
      ),
      write(
        emitEffectImported(effectContract, {
          module: "../../contract",
          api: "ClientApi",
          shapeModule: "../api/api.js",
        }),
        fileURLToPath(new URL("../src/effect/generated", import.meta.url)),
      ),
      write(
        emitEffectShape(effectContract, {
          typeReferences: effectTypeReferences,
          outputTypes: {
            "event.subscribe": {
              name: "WOPPSEvent",
              import: 'import type { WOPPSEvent } from "@uf0rs/protocol/groups/event"',
            },
          },
        }),
        fileURLToPath(new URL("../src/effect/api", import.meta.url)),
      ),
    ],
    { concurrency: 3, discard: true },
  ).pipe(Effect.provide(NodeFileSystem.layer)),
)

function namespaceTypes(namespace: string, module: string, values: object) {
  return Object.entries(values).flatMap(([name, schema]) =>
    Schema.isSchema(schema) ? [typeReference(`${namespace}.${name}`, module, schema)] : [],
  )
}

function typeReference(name: string, module: string, schema: Schema.Top) {
  return {
    schema,
    name,
    import: `import type { ${name.split(".")[0]} } from ${JSON.stringify(module)}`,
  }
}
