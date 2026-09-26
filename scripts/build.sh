#!/usr/bin/env bash
set -e

ROOT="$(cd "$(dirname "$0")/.." && pwd -P)"
cd "$ROOT"

BUN_CMD="${BUN_CMD:-bun}"
BUN_CMD_WAS_COPIED=0

case "$(uname -s)" in
  MINGW*|MSYS*|CYGWIN*|Windows_NT)
    bun_path="$(command -v "$BUN_CMD" 2>/dev/null || true)"
    case "$bun_path" in
      *[![:ascii:]]*)
        bun_copy_dir="$ROOT/.tmp-bun-bin"
        mkdir -p "$bun_copy_dir"
        cp -f "$bun_path" "$bun_copy_dir/bun.exe"
        BUN_CMD="$bun_copy_dir/bun.exe"
        BUN_CMD_WAS_COPIED=1
        ;;
    esac
    ;;
esac

"$BUN_CMD" run vendor:xterm
"$BUN_CMD" run gen:skill-docs --host all
"$BUN_CMD" build --compile browser/src/cli.ts --outfile browser/dist/browse
"$BUN_CMD" build --compile browser/src/find-browse.ts --outfile browser/dist/find-browse
"$BUN_CMD" build --compile design/src/cli.ts --outfile design/dist/design
"$BUN_CMD" build --compile md-to-pdf/src/cli.ts --outfile md-to-pdf/dist/pdf
"$BUN_CMD" build --compile bin/paysec-global-discover.ts --outfile bin/paysec-global-discover
bash browser/scripts/build-node-server.sh
bash scripts/write-version-files.sh browser/dist/.version design/dist/.version md-to-pdf/dist/.version
chmod +x browser/dist/browse browser/dist/find-browse design/dist/design md-to-pdf/dist/pdf bin/paysec-global-discover
rm -f .*.bun-build
if [ "$BUN_CMD_WAS_COPIED" -eq 1 ]; then
  rm -rf "$ROOT/.tmp-bun-bin"
fi
