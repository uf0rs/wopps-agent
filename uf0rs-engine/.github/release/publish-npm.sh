#!/usr/bin/env bash
# publish-npm.sh <build-npm dir> <signed dir>...: publishes every release tarball to npm with UF0RS_NPM_TAG.
# Names, the version and the package set come from this script, never from the tarballs: each tarball's
# package.json is read as data and must match. macOS and Windows CLI packages must come from a signed dir.
. "$(dirname "$0")/lib.sh"

npm_dir=$1
shift
targets="linux-arm64 linux-x64 linux-x64-baseline linux-arm64-musl linux-x64-musl linux-x64-baseline-musl darwin-arm64 darwin-x64 darwin-x64-baseline windows-arm64 windows-x64 windows-x64-baseline"
expected="@uf0rs/cli"
for target in $targets; do expected="$expected @uf0rs/cli-$target"; done
for lib in schema codemode theme ai util protocol client plugin plugin-browser core simulation server sdk ui; do expected="$expected @uf0rs/$lib"; done
if [ "$UF0RS_CHANNEL" != latest ]; then
  expected="$expected @uf0rs/cli-node"
  for target in linux-arm64 linux-x64 darwin-arm64 windows-arm64 windows-x64; do expected="$expected @uf0rs/cli-node-$target"; done
fi

if ! dry_run; then
  for file in "$npm_dir"/*.tgz; do
    gh attestation verify "$file" --repo uf0rs/wopps-agent --signer-workflow uf0rs/wopps-agent/.github/workflows/release.yml > /dev/null
  done
fi

shopt -s nullglob
files=()
for dir in "$@"; do files+=("$dir"/*.tgz); done
files+=("$npm_dir"/*.tgz)
list=$(mktemp)
for file in "${files[@]}"; do
  IFS=$'\t' read -r name version config install < <(tar -xzOf "$file" package/package.json |
    jq -r '[.name, .version, ((.publishConfig // {}) | keys - ["access"] | length > 0),
      ((.scripts // {}) | (has("preinstall") or has("install") or has("postinstall")))] | @tsv')
  # shellcheck disable=SC2086 # $expected is a word list
  printf '%s\n' $expected | grep -qxF -- "$name" || die "Unexpected package $name in $file"
  # The signed copy of a macOS or Windows CLI package replaces the unsigned one from the build.
  if cut -f1 "$list" | grep -qxF -- "$name"; then continue; fi
  case "$name:$file" in
    @uf0rs/cli-darwin-*:"$npm_dir"/* | @uf0rs/cli-windows-*:"$npm_dir"/*) die "$name is not signed" ;;
  esac
  [ "$version" = "$UF0RS_VERSION" ] || die "$name has version $version, expected $UF0RS_VERSION"
  [ "$config" = false ] || die "$name sets publishConfig beyond access"
  [ "$install" = false ] || [ "$name" = @uf0rs/cli ] || [ "$name" = @uf0rs/cli-node ] || die "$name has an install script"
  printf '%s\t%s\n' "$name" "$file" >> "$list"
done
for name in $expected; do cut -f1 "$list" | grep -qxF -- "$name" || die "Missing package $name"; done

# The CLI wrappers resolve their platform packages, so they publish last.
order=$(mktemp)
{ grep -vP '^@uf0rs/cli(-node)?\t' "$list" || true; grep -P '^@uf0rs/cli(-node)?\t' "$list"; } > "$order"
cat "$order"

# A clean directory and config, so nothing from an artifact can redirect the registry.
printf 'registry=https://registry.npmjs.org/\n' > "$RUNNER_TEMP/npmrc"
export NPM_CONFIG_USERCONFIG="$RUNNER_TEMP/npmrc"
cd "$(mktemp -d)"
flags=(--tag "$UF0RS_NPM_TAG" --access public --ignore-scripts)
if dry_run; then flags+=(--dry-run); else flags+=(--provenance); fi
while IFS=$'\t' read -r name file; do
  if ! dry_run && npm view "$name@$UF0RS_VERSION" version > /dev/null 2>&1; then
    echo "already published $name@$UF0RS_VERSION"
    continue
  fi
  npm publish "$file" "${flags[@]}"
done < "$order"
