import { Button } from "@uf0rs/ui/button"
import { useDialog } from "@uf0rs/ui/context/dialog"
import { onMount } from "solid-js"
import { DialogChatGPTUsageLimit } from "./chatgpt-usage-limit"

function UsageLimitStory() {
  const dialog = useDialog()
  const open = () => dialog.show(() => <DialogChatGPTUsageLimit />)
  onMount(open)

  return (
    <Button variant="neutral" onClick={open}>
      Open ChatGPT usage limit
    </Button>
  )
}

export default {
  title: "App/Dialogs/ChatGPT usage limit",
  id: "app-dialog-chatgpt-usage-limit",
}

export const ChatGPTUsageLimit = { render: () => <UsageLimitStory /> }
