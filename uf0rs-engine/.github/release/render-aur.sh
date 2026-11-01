#!/usr/bin/env bash
# render-aur.sh <build-npm dir> <aur dir>: writes PKGBUILD, .SRCINFO and the uf0rs2 shim for uf0rs-beta.
# The package installs the published npm tarballs, so their hashes come from the build-npm artifact.
# LICENSE comes from the AUR repository itself.
. "$(dirname "$0")/lib.sh"

npm=$1 aur=$2
name=uf0rs-beta
pkgver="${UF0RS_VERSION//-/.}"
if dry_run && [ ! -f "$aur/LICENSE" ]; then printf 'MIT License\n' > "$aur/LICENSE"; fi
test -s "$aur/LICENSE" || die "The AUR repository has no LICENSE"
printf '#!/bin/sh\nexec "$(dirname "$0")/uf0rs" "$@"\n' > "$aur/uf0rs2"
sum() { sha256 "$1" | cut -c1-64; }
x64=$(sum "$npm/uf0rs-cli-linux-x64-baseline-$UF0RS_VERSION.tgz")
arm64=$(sum "$npm/uf0rs-cli-linux-arm64-$UF0RS_VERSION.tgz")
x64_url="https://registry.npmjs.org/@uf0rs/cli-linux-x64-baseline/-/cli-linux-x64-baseline-$UF0RS_VERSION.tgz"
arm64_url="https://registry.npmjs.org/@uf0rs/cli-linux-arm64/-/cli-linux-arm64-$UF0RS_VERSION.tgz"
license=$(sum "$aur/LICENSE")
shim=$(sum "$aur/uf0rs2")

# Stripping a compiled Bun executable can damage its embedded application.
cat > "$aur/PKGBUILD" <<PKGBUILD
# Maintainer: Dax <mail@thdxr.com>
pkgname=$name
pkgver=$pkgver
pkgrel=1
pkgdesc='WOPPS beta - the AI coding agent for the terminal'
url='https://github.com/uf0rs/wopps-ai'
arch=('x86_64' 'aarch64')
license=('MIT')
depends=('glibc' 'gcc-libs' 'ripgrep')
provides=('uf0rs' 'uf0rs2')
conflicts=('uf0rs' 'uf0rs2')
options=('!strip' '!debug')
source=('LICENSE' 'uf0rs2')
sha256sums=('$license' '$shim')
source_x86_64=('$name-$pkgver-x86_64.tgz::$x64_url')
sha256sums_x86_64=('$x64')
source_aarch64=('$name-$pkgver-aarch64.tgz::$arm64_url')
sha256sums_aarch64=('$arm64')

package() {
  install -Dm755 "\$srcdir/package/bin/uf0rs" "\$pkgdir/usr/bin/uf0rs"
  install -Dm755 "\$srcdir/uf0rs2" "\$pkgdir/usr/bin/uf0rs2"
  install -Dm644 "\$srcdir/LICENSE" "\$pkgdir/usr/share/licenses/\$pkgname/LICENSE"
}
PKGBUILD

# What makepkg --printsrcinfo prints for the PKGBUILD above.
t=$'\t'
cat > "$aur/.SRCINFO" <<SRCINFO
pkgbase = $name
${t}pkgdesc = WOPPS beta - the AI coding agent for the terminal
${t}pkgver = $pkgver
${t}pkgrel = 1
${t}url = https://github.com/uf0rs/wopps-ai
${t}arch = x86_64
${t}arch = aarch64
${t}license = MIT
${t}depends = glibc
${t}depends = gcc-libs
${t}depends = ripgrep
${t}provides = uf0rs
${t}provides = uf0rs2
${t}conflicts = uf0rs
${t}conflicts = uf0rs2
${t}options = !strip
${t}options = !debug
${t}source = LICENSE
${t}source = uf0rs2
${t}sha256sums = $license
${t}sha256sums = $shim
${t}source_x86_64 = $name-$pkgver-x86_64.tgz::$x64_url
${t}sha256sums_x86_64 = $x64
${t}source_aarch64 = $name-$pkgver-aarch64.tgz::$arm64_url
${t}sha256sums_aarch64 = $arm64

pkgname = $name
SRCINFO
cat "$aur/PKGBUILD" "$aur/.SRCINFO"
