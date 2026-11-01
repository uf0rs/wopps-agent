// @ts-nocheck
import { Button } from "@uf0rs/ui/button"
import { useDialog } from "@uf0rs/ui/context/dialog"
import { QueryClient, QueryClientProvider } from "@tanstack/solid-query"
import { onMount } from "solid-js"
import { DialogConnectProvider, useProviderConnectController } from "./dialog"

function ConnectProviderDialogStory() {
  const dialog = useDialog()
  const open = () => dialog.show(() => <DialogConnectProvider />)

  onMount(open)

  return (
    <Button variant="neutral" onClick={open}>
      Open connect provider dialog
    </Button>
  )
}

// The server describes the provider's sign-in methods.
function ProviderConnectionDialogStory(props) {
  const dialog = useDialog()
  const controller = useProviderConnectController()
  controller.select(props.provider)
  const open = () => dialog.show(() => <DialogConnectProvider controller={controller} />)

  onMount(open)

  return (
    <Button variant="neutral" onClick={open}>
      Open {props.provider} connection dialog
    </Button>
  )
}

function renderConnection(provider) {
  return () => (
    <QueryClientProvider client={new QueryClient()}>
      <ProviderConnectionDialogStory provider={provider} />
    </QueryClientProvider>
  )
}

export default {
  title: "App/Dialogs/Connect Provider",
  id: "app-dialog-connect-provider",
}

export const Picker = {
  render: () => (
    <QueryClientProvider client={new QueryClient()}>
      <ConnectProviderDialogStory />
    </QueryClientProvider>
  ),
}

export const ApiKey = {
  render: renderConnection("openrouter"),
}

export const WOPPSZen = {
  render: renderConnection("uf0rs"),
}

export const LoginMethods = {
  render: renderConnection("openai"),
}
