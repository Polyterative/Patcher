#!/usr/bin/env bash
# Checks staged TypeScript files for hardcoded px values that should be rem.
# Excludes 0px (zero positions) and 1px (hairline borders) — those are intentional.
# Called by lint-staged with staged file paths as arguments.
# Exits 1 to block the commit if violations are found.

set -euo pipefail

# Pattern: px values other than 0px or 1px
# Matches: 2px–9px, 10px, 12px, 16px, 20px, 500px, etc.
PATTERN='([2-9]|[0-9]{2,})px'

found=0

for file in "$@"; do
  # Skip lines annotated with // px-ok (intentional px: borders, console styles, pixel coords)
  matches=$(grep -En "$PATTERN" "$file" 2>/dev/null | grep -v 'px-ok' || true)
  if [ -n "$matches" ]; then
    echo "⚠  $file"
    echo "$matches" | sed 's/^/   /'
    found=1
  fi
done

if [ "$found" -eq 1 ]; then
  echo ""
  echo "⚠  Hardcoded px values found in TypeScript files."
  echo "   Use rem instead (divide by 16, e.g. 16px → 1rem, 20px → 1.25rem)."
  echo "   Exception: 0px and 1px are excluded (positions / hairline borders)."
  echo "   To bypass: git commit --no-verify"
  exit 1
fi
