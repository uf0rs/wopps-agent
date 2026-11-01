import type { APIEvent } from "@solidjs/start/server"
import type { DownloadPlatform } from "../types"

const prodAssetNames: Record<string, string> = {
  "darwin-aarch64-dmg": "uf0rs-desktop-mac-arm64.dmg",
  "darwin-x64-dmg": "uf0rs-desktop-mac-x64.dmg",
  "windows-aarch64-nsis": "uf0rs-desktop-win-arm64.exe",
  "windows-x64-nsis": "uf0rs-desktop-win-x64.exe",
  "linux-x64-deb": "uf0rs-desktop-linux-amd64.deb",
  "linux-x64-appimage": "uf0rs-desktop-linux-x86_64.AppImage",
  "linux-x64-rpm": "uf0rs-desktop-linux-x86_64.rpm",
} satisfies Record<DownloadPlatform, string>

const betaAssetNames: Record<string, string> = {
  "darwin-aarch64-dmg": "uf0rs-desktop-mac-arm64.dmg",
  "darwin-x64-dmg": "uf0rs-desktop-mac-x64.dmg",
  "windows-aarch64-nsis": "uf0rs-desktop-win-arm64.exe",
  "windows-x64-nsis": "uf0rs-desktop-win-x64.exe",
  "linux-x64-deb": "uf0rs-desktop-linux-amd64.deb",
  "linux-x64-appimage": "uf0rs-desktop-linux-x86_64.AppImage",
  "linux-x64-rpm": "uf0rs-desktop-linux-x86_64.rpm",
} satisfies Record<DownloadPlatform, string>

export async function GET({ params: { platform, channel } }: APIEvent) {
  const assetName = channel === "stable" ? prodAssetNames[platform] : betaAssetNames[platform]
  if (!assetName) return new Response(null, { status: 404 })

  const release = await fetch(
    `https://wopps.ai/update/api/${channel === "stable" ? "latest" : "beta"}/desktop/uf0rs`,
  )
  if (!release.ok) return new Response(null, { status: release.status })
  const location = getAssetUrl(await release.json(), assetName)
  if (!location) return new Response(null, { status: 502 })
  return Response.redirect(location, 302)
}

function getAssetUrl(input: unknown, assetName: string) {
  if (!isRecord(input) || !isRecord(input.metadata) || !isRecord(input.metadata.files)) return
  const asset = input.metadata.files[assetName]
  if (!isRecord(asset) || typeof asset.url !== "string") return
  return asset.url
}

function isRecord(input: unknown): input is Record<string, unknown> {
  return typeof input === "object" && input !== null && !Array.isArray(input)
}
