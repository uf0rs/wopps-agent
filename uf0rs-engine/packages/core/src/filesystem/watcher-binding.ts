import { createRequire } from "node:module"

declare const UF0RS_LIBC: string | undefined

// Lazy: on workerd import.meta.url is undefined and the watcher is never
// loaded, so createRequire must not run at module scope.
export default function load() {
  const require = createRequire(import.meta.url)
  const libc = typeof UF0RS_LIBC === "undefined" ? undefined : UF0RS_LIBC
  return require(
    process.env.UF0RS_PARCEL_WATCHER_PATH ??
      `@parcel/watcher-${process.platform}-${process.arch}${process.platform === "linux" ? `-${libc || "glibc"}` : ""}`,
  )
}
