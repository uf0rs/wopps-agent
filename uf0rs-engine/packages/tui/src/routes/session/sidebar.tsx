import { useData } from "../../context/data"
import { createMemo, Show } from "solid-js"
import { useTheme } from "../../context/theme"
import { useConfig } from "../../config"
import { useLocal } from "../../context/local"
import { Slot } from "../../plugin/render"
import { withTimestampedFallback } from "@uf0rs/util/session-title-fallback"
import { TextAttributes } from "@opentui/core"
import "../../component/title-shimmer"

import { getScrollAcceleration } from "../../util/scroll"
import { INFO_PANEL_WIDTH } from "../../ui/layout"
import * as Model from "../../util/model"
import { Locale } from "../../util/locale"

export function Sidebar(props: { sessionID: string; onClose?: () => void }) {
  const data = useData()
  const theme = useTheme()
  const config = useConfig().data
  const local = useLocal()
  const session = createMemo(() => data.session.get(props.sessionID))
  const scrollAcceleration = createMemo(() => getScrollAcceleration(config))
  const model = createMemo(() => {
    const current = local.model.current()
    return current ? Model.formatRef({ providerID: current.providerID, id: current.modelID }) : "not selected"
  })
  const branch = createMemo(() => {
    const value = session()
    return value ? data.location.vcs.info(value.location)?.branch.current : undefined
  })
  const directory = createMemo(() => {
    const value = session()
    return value ? Locale.truncateMiddle(value.location.directory, 27) : "—"
  })
  const state = createMemo(() => data.session.status(props.sessionID))

  return (
    <Show when={session()}>
      <box
        backgroundColor={theme.background.raised.base}
        width={INFO_PANEL_WIDTH}
        height="100%"
        paddingTop={1}
        paddingBottom={1}
        paddingLeft={1}
        paddingRight={1}
        position="relative"
        flexDirection="column"
      >
        <box flexShrink={0} flexDirection="row" justifyContent="space-between" paddingLeft={1} paddingRight={1}>
          <text fg={theme.hue.accent[200]} attributes={TextAttributes.BOLD} selectable={false}>
            SESSION
          </text>
          <Show when={props.onClose}>
            <text
              fg={theme.text.muted}
              selectable={false}
              onMouseUp={() => props.onClose?.()}
            >
              ×
            </text>
          </Show>
        </box>
        <text fg={theme.border.base} wrapMode="none" selectable={false}>
          {"─".repeat(Math.max(1, INFO_PANEL_WIDTH - 2))}
        </text>

        <box flexShrink={0} paddingLeft={1} paddingRight={1} paddingTop={1}>
          <title_shimmer
            fg={theme.text.base}
            rename={{
              pending: data.session.title.pending(props.sessionID),
              title: withTimestampedFallback(session()),
            }}
            enabled={config.animations ?? true}
            backdrop={theme.background.raised.base}
            attributes={
              data.session.title.pending(props.sessionID) && config.animations === false
                ? TextAttributes.DIM
                : TextAttributes.BOLD
            }
          >
            {withTimestampedFallback(session())}
          </title_shimmer>
          <text fg={state() === "running" ? theme.hue.interactive[200] : theme.text.muted} selectable={false}>
            {state()}
            <Show when={branch()}>{(value) => <span> · {value()}</span>}</Show>
          </text>
        </box>

        <box flexShrink={0} gap={0} paddingLeft={1} paddingRight={1} paddingTop={1}>
          <InfoRow label="model" value={model()} />
          <InfoRow label="agent" value={session()?.agent ?? "build"} />
          <InfoRow label="folder" value={directory()} />
        </box>

        <text fg={theme.border.base} marginTop={1} wrapMode="none" selectable={false}>
          {"─".repeat(Math.max(1, INFO_PANEL_WIDTH - 2))}
        </text>

        <scrollbox
          flexGrow={1}
          minHeight={0}
          scrollAcceleration={scrollAcceleration()}
          // The sidebar only scrolls vertically; a horizontal bar steals a row during initial layout.
          horizontalScrollbarOptions={{ visible: false }}
          verticalScrollbarOptions={{
            // Use the content's reserved right padding instead of changing its width when the bar toggles.
            position: "absolute",
            right: 0,
            top: 0,
            width: 1,
            height: "100%",
            trackOptions: {
              backgroundColor: theme.background.raised.base,
              foregroundColor: theme.scrollbar.base,
            },
          }}
        >
          <box flexShrink={0} gap={1} paddingLeft={1} paddingRight={1} paddingTop={1}>
            <Slot path="sidebar.content" input={{ sessionID: props.sessionID }} />
          </box>
        </scrollbox>

        <box flexShrink={0} gap={1} paddingTop={1} paddingLeft={1} paddingRight={1}>
          <Slot path="sidebar.footer" input={{ sessionID: props.sessionID }} />
        </box>
      </box>
    </Show>
  )
}

function InfoRow(props: { label: string; value: string }) {
  const theme = useTheme()
  return (
    <box flexDirection="row" gap={1} minWidth={0}>
      <text width={7} flexShrink={0} fg={theme.text.muted} selectable={false}>
        {props.label}
      </text>
      <text flexGrow={1} minWidth={0} wrapMode="none" truncate fg={theme.text.base} selectable={false}>
        {props.value}
      </text>
    </box>
  )
}
