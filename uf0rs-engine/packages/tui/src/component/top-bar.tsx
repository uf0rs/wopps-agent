import { TextAttributes } from "@opentui/core"
import { Show, createMemo } from "solid-js"
import { useTerminalDimensions } from "@opentui/solid"
import { useData } from "../context/data"
import { Keymap } from "../context/keymap"
import { useRoute } from "../context/route"
import { useSessionTabs } from "../context/session-tabs"
import { useTheme } from "../context/theme"
import { withTimestampedFallback } from "@opencode/util/session-title-fallback"
import { Locale } from "../util/locale"

/**
 * WOPPS workspace bar. One quiet row: product mark, current workspace, and the
 * session switcher. Navigation width and the inspector live in the panes below.
 */
export function TopBar(props: { navCollapsed: boolean; onToggleNav: () => void }) {
  const theme = useTheme()
  const dimensions = useTerminalDimensions()
  const route = useRoute()
  const data = useData()
  const tabs = useSessionTabs()
  const keymap = Keymap.use()

  const session = createMemo(() => (route.data.type === "session" ? data.session.get(route.data.sessionID) : undefined))
  const title = createMemo(() => {
    if (route.data.type === "home") return "new session"
    if (route.data.type === "plugin") return route.data.name
    const value = session()
    return value ? withTimestampedFallback(value) : "session"
  })
  const position = createMemo(() => {
    const list = tabs.tabs()
    const id = tabs.current()
    const index = id ? list.findIndex((tab) => tab.sessionID === id) : -1
    return { index: index >= 0 ? index + 1 : 0, total: list.length }
  })
  const roomy = () => dimensions().width >= 68
  const switching = () => tabs.enabled() && position().total > 0
  const titleWidth = () => Math.max(8, dimensions().width - (switching() ? 40 : 24))

  return (
    <box
      width="100%"
      height={1}
      flexShrink={0}
      flexDirection="row"
      alignItems="center"
      paddingLeft={1}
      paddingRight={1}
      backgroundColor={theme.background.raised.base}
    >
      <box
        width={3}
        flexShrink={0}
        justifyContent="center"
        onMouseUp={() => {
          props.onToggleNav()
        }}
      >
        <text fg={theme.text.muted} selectable={false}>
          {props.navCollapsed ? "▸" : "▤"}
        </text>
      </box>
      <text fg={theme.hue.accent[200]} attributes={TextAttributes.BOLD} selectable={false}>
        WOPPS
      </text>
      <Show when={roomy()}>
        <text fg={theme.border.base} selectable={false}>
          {"  │  "}
        </text>
        <text fg={theme.text.muted} wrapMode="none" truncate flexShrink={1} minWidth={0} selectable={false}>
          {Locale.takeWidth(title(), titleWidth())}
        </text>
      </Show>
      <box flexGrow={1} minWidth={0} />
      <Show when={switching()}>
        <box flexDirection="row" gap={1} flexShrink={0} alignItems="center">
          <text
            fg={theme.text.muted}
            selectable={false}
            onMouseUp={() => tabs.cycle(-1)}
          >
            ‹
          </text>
          <text
            fg={theme.text.base}
            selectable={false}
            onMouseUp={() => keymap.dispatch("session.list")}
          >
            {position().index}/{position().total}
          </text>
          <text
            fg={theme.text.muted}
            selectable={false}
            onMouseUp={() => tabs.cycle(1)}
          >
            ›
          </text>
          <text
            fg={theme.hue.accent[200]}
            selectable={false}
            onMouseUp={() => tabs.add()}
          >
            +
          </text>
        </box>
      </Show>
      <Show when={!switching() && roomy()}>
        <text fg={theme.text.muted} selectable={false} onMouseUp={() => keymap.dispatch("session.list")}>
          /sessions
        </text>
      </Show>
    </box>
  )
}
