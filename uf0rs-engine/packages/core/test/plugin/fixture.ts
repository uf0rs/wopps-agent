import { Agent } from "@uf0rs/core/agent"
import { Artifact } from "@uf0rs/core/artifact"
import { AISDK } from "@uf0rs/core/aisdk"
import { Command } from "@uf0rs/core/command"
import { Config } from "@uf0rs/core/config"
import { Credential } from "@uf0rs/core/credential"
import { Database } from "@uf0rs/core/database/database"
import { Environment } from "@uf0rs/core/environment/index"
import { FileAccess } from "@uf0rs/core/file-access"
import { LayerNodePlatform } from "@uf0rs/util/effect/app-node-platform"
import { AppProcess } from "@uf0rs/util/process"
import { LayerNode } from "@uf0rs/util/effect/layer-node"
import { Bus } from "@uf0rs/core/bus"
import { FileSystem } from "@uf0rs/core/filesystem"
import { FSUtil } from "@uf0rs/util/fs-util"
import { Global } from "@uf0rs/util/global"
import { Form } from "@uf0rs/core/form"
import { Generate } from "@uf0rs/core/generate"
import { Integration } from "@uf0rs/core/integration"
import { Job } from "@uf0rs/core/job"
import { KV } from "@uf0rs/core/kv"
import { Location } from "@uf0rs/core/location"
import { Mcp } from "@uf0rs/core/mcp/index"
import { Model } from "@uf0rs/core/model"
import { Npm } from "@uf0rs/util/npm"
import { Plugin } from "@uf0rs/core/plugin"
import { PluginHooks } from "@uf0rs/core/plugin/hooks"
import { Provider } from "@uf0rs/core/provider"
import { Session } from "@uf0rs/core/session"
import { SharedCache } from "@uf0rs/core/shared-cache"
import { InstructionEntry } from "@uf0rs/core/session/instruction-entry"
import { PersistentPty } from "@uf0rs/core/persistent-pty"
import { LocationServiceMap } from "@uf0rs/core/location-service-map"
import { AppNodeBuilder } from "@uf0rs/core/effect/app-node-builder"
import { Permission } from "@uf0rs/core/permission"
import { Reference } from "@uf0rs/core/reference"
import { Rpc } from "@uf0rs/core/rpc"
import { Skill } from "@uf0rs/core/skill"
import { SkillDiscovery } from "@uf0rs/core/skill/discovery"
import { Watcher } from "@uf0rs/core/filesystem/watcher"
import { Tool } from "@uf0rs/core/tool"
import { Vcs } from "@uf0rs/core/vcs"
import { WebSearch } from "@uf0rs/core/websearch"
import { Worktree } from "@uf0rs/core/worktree"
import { WorktreeStrategies } from "@uf0rs/core/worktree/strategies"
import { Effect, Layer } from "effect"
import { tempLocationLayer } from "../fixture/location"
import { emptyMcpLayer } from "../fixture/mcp"
import { offlineModels } from "../fixture/models"

const npmLayer = Layer.succeed(
  Npm.Service,
  Npm.Service.of({
    add: (name) => Effect.succeed({ directory: "", name }),
    resolve: (name) => Effect.succeed({ directory: "", name }),
    check: () => Effect.succeed(false),
    update: (name) => Effect.succeed({ directory: "", name }),
    which: () => Effect.undefined,
  }),
)

const generateLayer = Layer.succeed(
  Generate.Service,
  Generate.Service.of({
    text: () => Effect.succeed(""),
    image: () => Effect.die("unused"),
    decisions: () => Effect.die("unused"),
  }),
)

const configLayer = Config.testLayer()

const permissionLayer = Layer.succeed(
  Permission.Service,
  Permission.Service.of({
    close: Effect.void,
    ask: (input) => Effect.succeed({ id: input.id ?? Permission.ID.create(), effect: "ask" }),
    assert: () => Effect.void,
    assertNotDenied: () => Effect.void,
    allows: () => Effect.succeed(false),
    reply: () => Effect.void,
    get: () => Effect.succeed(undefined),
    forSession: () => Effect.succeed([]),
    list: () => Effect.succeed([]),
  }),
)

export const makePluginTestLayer = (permission = permissionLayer, generate = generateLayer) =>
  AppNodeBuilder.build(
    LayerNode.group([
      AppProcess.node,
      FileSystem.node,
      FSUtil.node,
      Location.node,
      Npm.node,
      Credential.node,
      Config.node,
      Database.node,
      Environment.node,
      FileAccess.node,
      Global.node,
      Bus.node,
      Form.node,
      Generate.node,
      LayerNodePlatform.httpClient,
      Plugin.node,
      Agent.node,
      Artifact.node,
      AISDK.node,
      Provider.node,
      Model.node,
      Command.node,
      Integration.node,
      Job.node,
      KV.node,
      Mcp.node,
      Session.node,
      SharedCache.node,
      InstructionEntry.node,
      PersistentPty.node,
      LocationServiceMap.node,
      Permission.node,
      PluginHooks.node,
      Reference.node,
      Rpc.node,
      Skill.node,
      SkillDiscovery.node,
      Tool.node,
      Vcs.node,
      Watcher.node,
      WebSearch.node,
      Worktree.node,
      WorktreeStrategies.node,
    ]),
    [
      Location.node.replace(tempLocationLayer),
      Npm.node.replace(npmLayer),
      Config.node.replace(configLayer),
      Mcp.node.replace(emptyMcpLayer),
      Generate.node.replace(generate),
      Permission.node.replace(permission),
      offlineModels,
    ],
  ).pipe(Layer.provideMerge(configLayer))

export const PluginTestLayer = makePluginTestLayer()
