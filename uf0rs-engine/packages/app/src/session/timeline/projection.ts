import { createReactiveTimelineProjection } from "@uf0rs/session-ui/timeline/projection"

export { reuseTimelineRows } from "@uf0rs/session-ui/timeline/projection"

export function createTimelineProjection(input: Parameters<typeof createReactiveTimelineProjection>[0]) {
  return createReactiveTimelineProjection(input)
}
