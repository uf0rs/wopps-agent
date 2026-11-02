import { Prompt, type PromptRef } from "../component/prompt"
import { createEffect, createMemo, createSignal, onMount, Show, untrack } from "solid-js"
import { Logo } from "../component/logo"
import { useArgs } from "../context/args"
import { useRouteData } from "../context/route"
import { usePromptRef } from "../context/prompt"
import { useLocal } from "../context/local"
import { useEditorContext } from "../context/editor"
import { useData } from "../context/data"
import { useLocation } from "../context/location"
import { FormPrompt } from "./session/form"
import { Slot } from "../plugin/render"
import { useTerminalDimensions } from "@opentui/solid"
import { TextAttributes } from "@opentui/core"
import { useTheme } from "../context/theme"
import { useUpdateNotification } from "../context/update-notification"
import { useExit } from "../context/exit"
import { FadeInText } from "../component/fade-in-text"
import { useInterfaceLanguage, type InterfaceLanguage } from "../util/interface-language"

let once = false
const homeCopy: Record<InterfaceLanguage, { tagline: string; prompts: string[]; shell: string[] }> = {
  ru: {
    tagline: "ТВОЙ НАПАРНИК ДЛЯ КОДА И ПК",
    prompts: ["Найди и исправь ошибку в проекте", "Объясни, как устроен этот проект", "Добавь новую функцию"],
    shell: ["git status", "Get-ChildItem", "pwd"],
  },
  en: {
    tagline: "YOUR COMPANION FOR CODE & DESKTOP",
    prompts: ["Find and fix an issue in this project", "Explain how this project works", "Add a small feature"],
    shell: ["git status", "Get-ChildItem", "pwd"],
  },
  fr: {
    tagline: "VOTRE COMPAGNON POUR LE CODE",
    prompts: ["Trouve et corrige un problème", "Explique ce projet", "Ajoute une fonctionnalité"],
    shell: ["git status", "Get-ChildItem", "pwd"],
  },
}

export function Home() {
  const route = useRouteData("home")
  const promptRef = usePromptRef()
  const [ref, setRef] = createSignal<PromptRef | undefined>()
  const args = useArgs()
  const local = useLocal()
  const editor = useEditorContext()
  const data = useData()
  const location = useLocation()
  const theme = useTheme()
  const dimensions = useTerminalDimensions()
  const [logoWidth, setLogoWidth] = createSignal(0)
  const language = useInterfaceLanguage()
  // Global MCP elicitations can arrive without a session route, so keep them reachable from Home.
  const currentLocation = () => route.location ?? data.location.default()
  const forms = createMemo(() => data.session.form.list("global", currentLocation()) ?? [])
  let sent = false

  // Track only the route location and (when absent) the default location; location.set
  // reads other signals internally and tracking them would re-assert the route location
  // after the user overrides it with /cd.
  createEffect(() => {
    const target = currentLocation()
    untrack(() => location.set(target))
  })

  onMount(() => {
    editor.clearSelection()
  })

  const bind = (r: PromptRef | undefined) => {
    setRef(r)
    promptRef.set(r)
    if (once || !r || route.prompt || !args.prompt) return
    r.set({ text: args.prompt, files: [], agents: [], pasted: [] })
    once = true
  }

  createEffect(() => {
    const composer = ref()
    const prompt = route.prompt
    if (!composer || prompt?.text === undefined) return
    untrack(() => composer.set(prompt))
  })

  // Wait for everything submit needs before auto-submitting --prompt; it runs once.
  createEffect(() => {
    const r = ref()
    if (sent) return
    if (!r) return
    if (!local.model.ready || !local.model.catalogReady) return
    if (!local.agent.current() || !local.model.current()) return
    if (!args.prompt) return
    if (r.current.text !== args.prompt) return
    sent = true
    r.submit()
  })

  const wide = () => dimensions().width >= 92

  return (
    <>
      <box
        flexGrow={1}
        minHeight={0}
        flexDirection={wide() ? "row" : "column"}
        gap={2}
        paddingLeft={dimensions().width < 100 ? 0 : 2}
        paddingRight={dimensions().width < 100 ? 0 : 2}
        paddingTop={dimensions().height < 22 ? 1 : 2}
      >
        <box
          width={wide() ? 42 : "100%"}
          flexShrink={0}
          flexDirection="column"
          gap={1}
          onSizeChange={function () {
            setLogoWidth(this.width)
          }}
        >
          <box flexDirection="row" gap={1}>
            <text fg={theme.hue.accent[200]} attributes={TextAttributes.BOLD} selectable={false}>
              ◇ WOPPS
            </text>
            <text fg={theme.text.muted} selectable={false}>
              terminal agent
            </text>
          </box>
          <Logo />
          <text fg={theme.text.muted} selectable={false}>
            {homeCopy[language()].tagline}
          </text>
          <UpdateNotification width={Math.min(42, logoWidth() || 42)} />
          <Show when={wide()}>
            <box flexGrow={1} minHeight={0} />
            <text fg={theme.text.muted} selectable={false}>
              UF0RS STUDIO
            </text>
          </Show>
        </box>
        <box flexGrow={1} minWidth={0} flexDirection="column" justifyContent={wide() ? "flex-start" : "center"}>
          <box width="100%" maxWidth={78} zIndex={1000} flexShrink={0} position="relative">
            <text fg={theme.hue.accent[200]} attributes={TextAttributes.BOLD} selectable={false}>
              START
            </text>
            <text fg={theme.text.muted} selectable={false}>
              Describe a task, or type / to open commands.
            </text>
            <box height={1} />
            <Prompt
              ref={bind}
              placeholders={{ normal: homeCopy[language()].prompts, shell: homeCopy[language()].shell }}
              disabled={forms().length > 0}
            />
            <box height={1} />
            <text fg={theme.text.muted} selectable={false}>
              /models model · /files workspace · /sessions switch
            </text>
          </box>
        </box>
      </box>
      <box width="100%" flexShrink={0}>
        <Slot path="home.footer" />
      </box>
      <Show when={forms()[0]?.id} keyed>
        {(_) => {
          const form = forms()[0]
          return form ? (
            <box position="absolute" zIndex={2000} left={0} right={0} bottom={1} paddingLeft={2} paddingRight={2}>
              <box width="100%">
                <FormPrompt form={form} />
              </box>
            </box>
          ) : null
        }}
      </Show>
    </>
  )
}

function UpdateNotification(props: { width: number }) {
  const update = useUpdateNotification()
  const exit = useExit()
  const theme = useTheme()
  const [hovered, setHovered] = createSignal(false)
  const backdrop = () => (hovered() ? theme.background.action.primary.hovered : theme.background.base)
  createEffect(() => {
    update.notification()
    setHovered(false)
  })

  return (
    <Show when={update.notification()} keyed>
      {(state) => {
        const remote = state.source === "server" && state.remote
        return (
          <Show when={!remote || state.type === "available"}>
            <box
              flexShrink={0}
              flexDirection="row"
              justifyContent="center"
              width={props.width}
              maxWidth="100%"
              gap={1}
              backgroundColor={hovered() ? theme.background.action.primary.hovered : undefined}
              onMouseOver={() => setHovered(true)}
              onMouseOut={() => setHovered(false)}
              onMouseUp={() => {
                if (remote) return update.dismiss()
                if (state.type === "installed") return exit()
                update.open?.("notification")
              }}
            >
              <FadeInText fg={theme.text.muted} backdrop={backdrop()}>
                <Show when={!remote}>
                  <span style={{ fg: theme.text.action.primary.selected }}>
                    {state.type === "installed" ? "/exit" : "/update"}
                  </span>
                </Show>
                {remote
                  ? "remote server update available"
                  : state.type === "installed"
                    ? ` restart to use v${state.version}`
                    : ` to install v${state.version}`}
              </FadeInText>
            </box>
          </Show>
        )
      }}
    </Show>
  )
}
