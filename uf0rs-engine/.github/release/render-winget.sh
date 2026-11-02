#!/usr/bin/env bash
# render-winget.sh <sign-windows dir> <sign-desktop-windows-installer dir> <out dir>: writes the WinGet manifests for
# Anomaly.WOPPS and Anomaly.WOPPS.Desktop. Submission to microsoft/winget-pkgs is paused until the packages
# are accepted, so the workflow only uploads them.
. "$(dirname "$0")/lib.sh"

cli=$1 desktop=$2 out=$3
sum() { sha256 "$1" | cut -c1-64 | tr a-f A-F; }
base="https://wopps.ai/files/bin/$UF0RS_VERSION"
date=$(date -u +%F)
header() {
  printf '# yaml-language-server: $schema=https://aka.ms/winget-manifest.%s.1.12.0.schema.json\n\nPackageIdentifier: %s\nPackageVersion: %s\n' \
    "$2" "$1" "$UF0RS_VERSION"
}
footer() { printf 'ManifestType: %s\nManifestVersion: 1.12.0\n' "$1"; }
manifests() {
  local id=$1 name=$2 description=$3 moniker=$4
  shift 4
  mkdir -p "$out/$id"
  { header "$id" version; echo "DefaultLocale: en-US"; footer version; } > "$out/$id/$id.yaml"
  { header "$id" installer; printf '%s\n' "$@" "ReleaseDate: $date"; footer installer; } > "$out/$id/$id.installer.yaml"
  {
    header "$id" defaultLocale
    printf '%s\n' "PackageLocale: en-US" "Publisher: WOPPS" "PublisherUrl: https://anoma.ly/" \
      "PublisherSupportUrl: https://github.com/uf0rs/wopps-agent/issues" "PrivacyUrl: https://wopps.ai/legal/privacy-policy" \
      "PackageName: $name" "PackageUrl: https://wopps.ai/" "License: MIT" "LicenseUrl: https://github.com/uf0rs/wopps-agent/blob/HEAD/LICENSE" \
      "ShortDescription: $description" "Moniker: $moniker" "Tags:" "- ai" "- coding-agent" "- developer-tools" \
      "Documentations:" "- DocumentLabel: Docs" "  DocumentUrl: https://wopps.ai/v2/docs"
    footer defaultLocale
  } > "$out/$id/$id.locale.en-US.yaml"
}

manifests Anomaly.WOPPS "WOPPS CLI" "The open source AI coding agent for the terminal." uf0rs \
  "InstallerType: zip" "NestedInstallerType: portable" "NestedInstallerFiles:" \
  "- RelativeFilePath: uf0rs.exe" "  PortableCommandAlias: uf0rs" "Commands:" "- uf0rs" "Installers:" \
  "- Architecture: x64" "  InstallerUrl: $base/uf0rs-windows-x64-baseline.zip" "  InstallerSha256: $(sum "$cli/uf0rs-windows-x64-baseline.zip")" \
  "- Architecture: arm64" "  InstallerUrl: $base/uf0rs-windows-arm64.zip" "  InstallerSha256: $(sum "$cli/uf0rs-windows-arm64.zip")"

# The display name and uninstall key match what the NSIS installer registers for ai.uf0rs.desktop.
manifests Anomaly.WOPPS.Desktop "WOPPS" "The open source AI coding agent as a desktop app." uf0rs-desktop \
  "InstallerType: nullsoft" "Scope: user" "UpgradeBehavior: install" "ProductCode: d074f30d-5f88-5885-b075-be1348cc7676" \
  "Protocols:" "- uf0rs" "Installers:" \
  "- Architecture: x64" "  InstallerUrl: $base/uf0rs-desktop-win-x64.exe" "  InstallerSha256: $(sum "$desktop/uf0rs-desktop-win-x64.exe")" \
  "- Architecture: arm64" "  InstallerUrl: $base/uf0rs-desktop-win-arm64.exe" "  InstallerSha256: $(sum "$desktop/uf0rs-desktop-win-arm64.exe")"
tail -n +1 "$out"/*/*
