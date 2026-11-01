import type { ElectronAPI } from "../api-types"

const deepLinkEvent = "uf0rs:deep-link"

export function startDeepLinks(api: ElectronAPI) {
  void api.consumeInitialDeepLinks().then(emitDeepLinks)
  api.onDeepLink(emitDeepLinks)
}

function emitDeepLinks(urls: string[]) {
  if (urls.length === 0) return
  window.__UF0RS__ ??= {}
  window.__UF0RS__.deepLinks = [...(window.__UF0RS__.deepLinks ?? []), ...urls]
  window.dispatchEvent(new CustomEvent(deepLinkEvent, { detail: { urls } }))
}
