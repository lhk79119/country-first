#!/bin/sh
set -e
SRC=$(cd "$(dirname "$0")" && pwd)
OUT=${1:-$SRC/../country-first-dist}
TERSER=${TERSER:-npx terser}
rm -rf "$OUT" && mkdir -p "$OUT"
cp -r "$SRC/manifest.json" "$SRC/popup.html" "$SRC/icons" "$SRC/_locales" "$SRC/NOTICE.md" "$SRC/LICENSES" "$OUT/"
for f in data data-x common content popup background; do
  $TERSER "$SRC/$f.js" -c passes=2 -m --comments false -o "$OUT/$f.js"
done
