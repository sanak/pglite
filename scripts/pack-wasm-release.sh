#!/usr/bin/env bash
# PoC only: pack locally built WASM release files so .github/workflows/pages-poc.yml can skip the Docker build
set -euo pipefail
cd "$(dirname "$0")/.."

pointer=$(git rev-parse --short=10 HEAD:postgres-pglite)
checkout=$(git -C postgres-pglite rev-parse --short=10 HEAD)
if [ "$pointer" != "$checkout" ]; then
  echo "postgres-pglite checkout ($checkout) does not match the committed pointer ($pointer)" >&2
  exit 1
fi

out=${1:-wasm-release.tar.gz}
tar -czf "$out" packages/*/release packages/pglite-extensions/*/release
echo "tag: wasm-${pointer}"
echo "asset: $out"
