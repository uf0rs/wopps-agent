#!/bin/sh
set -eu
if ! command -v uf0rs >/dev/null 2>&1; then
  echo "UF0RS AI was not found on PATH. Run its installed executable with 'uninstall'." >&2
  exit 1
fi
uf0rs uninstall
