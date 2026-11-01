import { Plugin } from "@uf0rs/plugin/tui"
import { createMemo, For, Show } from "solid-js"
import { TextAttributes } from "@opentui/core"
import { TodoItem } from "../../component/todo-item"
import { sessionTodos } from "../../util/todo"

export function SidebarTodo(props: { context: Plugin.Context; sessionID: string }) {
  const [view, updateView] = props.context.storage.store("view", { initial: { open: true } })
  const theme = props.context.theme
  const list = createMemo(() =>
    sessionTodos(
      props.context.data.session.message.list(props.sessionID),
      props.context.data.session.get(props.sessionID)?.revert?.messageID,
    ),
  )
  const remaining = createMemo(
    () => list().filter((item) => item.status === "pending" || item.status === "in_progress").length,
  )

  return (
    <Show when={list().length > 0}>
      <box gap={0}>
        <box
          flexDirection="row"
          gap={1}
          paddingLeft={1}
          onMouseDown={() => {
            if (list().length <= 2) return
            void updateView((draft) => {
              draft.open = !draft.open
            }).catch((error) => console.error("Failed to persist todo sidebar state", error))
          }}
        >
          <Show when={list().length > 2}>
            <text fg={theme.text.muted}>{view.open ? "▾" : "▸"}</text>
          </Show>
          <text fg={theme.hue.accent[200]} attributes={TextAttributes.BOLD}>
            TASKS
            <Show when={list().length > 2 && !view.open}>
              <span style={{ fg: theme.text.muted }}> ({remaining()})</span>
            </Show>
          </text>
        </box>
        <Show when={list().length <= 2 || view.open}>
          <For each={list()}>{(item) => <TodoItem theme={theme} todo={item} />}</For>
        </Show>
      </box>
    </Show>
  )
}

export default Plugin.define({
  id: "uf0rs.sidebar.todo",
  setup(context) {
    context.ui.slot({
      append: "sidebar.content",
      render: (props) => <SidebarTodo context={context} sessionID={props.sessionID} />,
    })
  },
})
