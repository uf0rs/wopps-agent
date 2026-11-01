import { Plugin } from "@uf0rs/plugin/tui"
import { createMemo, Show } from "solid-js"
import { TextAttributes } from "@opentui/core"
import { contextUsage } from "../../util/session"

const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
})

export function SidebarContext(props: { context: Plugin.Context; sessionID: string }) {
  const theme = props.context.theme
  const msg = createMemo(() => props.context.data.session.message.list(props.sessionID))
  const session = createMemo(() => props.context.data.session.get(props.sessionID))
  const cost = createMemo(() => props.context.data.session.cost(props.sessionID))

  const state = createMemo(() =>
    contextUsage(msg(), props.context.data.location.model.list(session()?.location), session()?.revert?.messageID),
  )
  const accent = () => theme.hue?.accent?.[200] ?? theme.text.base

  return (
    <Show when={state() || cost() > 0}>
      <box gap={0}>
        <text fg={accent()} attributes={TextAttributes.BOLD}>
          Context
        </text>
        <Show when={state()}>
          {(value) => (
            <>
              <text fg={theme.text.base}>{value().tokens.toLocaleString("en-US")} tokens</text>
              <Show when={value().percent !== undefined}>
                <text fg={theme.text.muted}>{value().percent}% used</text>
              </Show>
            </>
          )}
        </Show>
        <Show when={cost() > 0}>
          <text fg={theme.text.muted}>{money.format(cost())} spent</text>
        </Show>
      </box>
    </Show>
  )
}

export default Plugin.define({
  id: "uf0rs.sidebar.context",
  setup(context) {
    context.ui.slot({
      append: "sidebar.content",
      render: (props) => <SidebarContext context={context} sessionID={props.sessionID} />,
    })
  },
})
