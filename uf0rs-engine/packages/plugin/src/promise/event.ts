import type { WOPPSEvent } from "@uf0rs/client"
import type { SelectedEvent, SubscribeOptions } from "@uf0rs/client/promise/api"

type EventType = Exclude<WOPPSEvent["type"], "server.connected">

export interface EventDomain {
  readonly subscribe: <Type extends EventType = EventType>(
    options?: SubscribeOptions<Type>,
  ) => AsyncIterable<SelectedEvent<WOPPSEvent, Type>>
}
