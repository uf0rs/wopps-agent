#!/bin/sh
set -eu

PROJECT_ROOT=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
cd "$PROJECT_ROOT"

EXECUTABLE="$PROJECT_ROOT/dist/uf0rs"
if [ ! -f "$EXECUTABLE" ]; then
  OS=$(uname -s)
  ARCH=$(uname -m)
  case "$OS:$ARCH" in
    Linux:x86_64) PLATFORM=linux; ARCH=64 ;;
    Linux:aarch64|Linux:arm64) PLATFORM=linux; ARCH=arm64 ;;
    Darwin:x86_64) PLATFORM=macos; ARCH=64 ;;
    Darwin:arm64) PLATFORM=macos; ARCH=arm64 ;;
    *) echo "Unsupported platform: $OS $ARCH" >&2; exit 1 ;;
  esac
  case "$ARCH" in
    64) ARCH=x64 ;;
  esac
  RELEASE_EXECUTABLE="$PROJECT_ROOT/dist/releases/$PLATFORM-$ARCH/uf0rs"
  if [ -f "$RELEASE_EXECUTABLE" ]; then EXECUTABLE=$RELEASE_EXECUTABLE; fi
fi

RELEASE_PLATFORM=$(uname -s | tr '[:upper:]' '[:lower:]')
case "$RELEASE_PLATFORM" in
  darwin) RELEASE_PLATFORM=macos ;;
  linux) RELEASE_PLATFORM=linux ;;
  *) echo "Unsupported platform: $(uname -s)" >&2; exit 1 ;;
esac
case "$(uname -m)" in
  x86_64|amd64) RELEASE_ARCH=x64 ;;
  aarch64|arm64) RELEASE_ARCH=arm64 ;;
  *) echo "Unsupported architecture: $(uname -m)" >&2; exit 1 ;;
esac

DOWNLOADED_BINARY=""
DOWNLOADED_DIR=""
if [ ! -f "$EXECUTABLE" ] && [ ! -f "$PROJECT_ROOT/scripts/build-cli.js" ]; then
  ASSET="wopps-ai-$RELEASE_PLATFORM-$RELEASE_ARCH"
  if [ "$RELEASE_PLATFORM" = "macos" ]; then ASSET="$ASSET.tar.gz"; fi
  DOWNLOAD_URL="https://github.com/uf0rs/wopps-ai/releases/latest/download/$ASSET"
  DOWNLOADED_DIR=$(mktemp -d "${TMPDIR:-/tmp}/wopps-ai.XXXXXX")
  if command -v curl >/dev/null 2>&1; then
    curl -fL --retry 3 "$DOWNLOAD_URL" -o "$DOWNLOADED_DIR/$ASSET"
  elif command -v wget >/dev/null 2>&1; then
    wget -O "$DOWNLOADED_DIR/$ASSET" "$DOWNLOAD_URL"
  else
    echo "Install curl or wget to download WOPPS AI." >&2
    exit 1
  fi
  if [ "$RELEASE_PLATFORM" = "macos" ]; then
    tar -xzf "$DOWNLOADED_DIR/$ASSET" -C "$DOWNLOADED_DIR"
    EXECUTABLE="$DOWNLOADED_DIR/uf0rs"
  else
    EXECUTABLE="$DOWNLOADED_DIR/$ASSET"
  fi
  chmod 700 "$EXECUTABLE"
fi

if [ ! -f "$EXECUTABLE" ]; then
  if ! command -v node >/dev/null 2>&1; then
    echo "No prebuilt WOPPS AI binary found. Install Node.js 22+ to build from source, or download a GitHub Release binary." >&2
    exit 1
  fi
  NODE_MAJOR=$(node -p "Number(process.versions.node.split('.')[0])")
  if [ "$NODE_MAJOR" -lt 22 ]; then
    echo "Node.js 22 or newer is required to build the standalone executable." >&2
    exit 1
  fi
  if [ ! -f node_modules/@yao-pkg/pkg/lib-es5/bin.js ]; then npm install; fi
  npm run build:cli
  EXECUTABLE="$PROJECT_ROOT/dist/uf0rs"
fi
if [ -n "$DOWNLOADED_DIR" ]; then
  trap 'rm -rf "$DOWNLOADED_DIR"' EXIT HUP INT TERM
  "$EXECUTABLE" install
else
  "$EXECUTABLE" install --source-dir "$PROJECT_ROOT"
fi
