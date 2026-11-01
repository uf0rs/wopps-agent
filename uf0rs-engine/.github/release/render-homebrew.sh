#!/usr/bin/env bash
# render-homebrew.sh <sign-macos dir> <build-archives dir> <tap dir>: writes Formula uf0rs-v2.rb with the
# hashes of the signed macOS and the Linux archives.
. "$(dirname "$0")/lib.sh"

macos=$1 archives=$2 tap=$3
sum() { sha256 "$1" | cut -c1-64; }
base="https://wopps.ai/files/bin/$UF0RS_VERSION"
cat > "$tap/uf0rs-v2.rb" <<FORMULA
# typed: false
# frozen_string_literal: true

class WoppsV2 < Formula
  desc "WOPPS V2 - the AI coding agent for the terminal"
  homepage "https://github.com/uf0rs/wopps-ai"
  version "$UF0RS_VERSION"
  license "MIT"

  depends_on "ripgrep"
  conflicts_with "uf0rs", because: "both install an uf0rs binary"

  on_macos do
    if Hardware::CPU.arm?
      url "$base/uf0rs-darwin-arm64.zip"
      sha256 "$(sum "$macos/uf0rs-darwin-arm64.zip")"
    else
      url "$base/uf0rs-darwin-x64-baseline.zip"
      sha256 "$(sum "$macos/uf0rs-darwin-x64-baseline.zip")"
    end
  end

  on_linux do
    if Hardware::CPU.arm?
      url "$base/uf0rs-linux-arm64.tar.gz"
      sha256 "$(sum "$archives/uf0rs-linux-arm64.tar.gz")"
    else
      url "$base/uf0rs-linux-x64-baseline.tar.gz"
      sha256 "$(sum "$archives/uf0rs-linux-x64-baseline.tar.gz")"
    end
  end

  def install
    bin.install "uf0rs"
  end
end
FORMULA
cat "$tap/uf0rs-v2.rb"
