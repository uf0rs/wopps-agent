import type { WOPPSEvent } from "@uf0rs/client"
import { useClient } from "./client"

type EventMetadata = {
  directory: string | undefined
}
type WOPPSEventMap = { [Type in WOPPSEvent["type"]]: Extract<WOPPSEvent, { type: Type }> }

export function useEvent() {
  const client = useClient()

  function subscribe(handler: (event: WOPPSEvent, metadata: EventMetadata) => void) {
    return client.event.listen(({ details }) => {
      if (details.type === "server.connected") return
      handler(details, { directory: details.location?.directory })
    })
  }

  function on<T extends WOPPSEvent["type"]>(
    type: T,
    handler: (event: WOPPSEventMap[T], metadata: EventMetadata) => void,
  ) {
    return client.event.on(type, (event) => {
      handler(event, { directory: event.location?.directory })
    })
  }

  return {
    subscribe,
    on,
  }
}
