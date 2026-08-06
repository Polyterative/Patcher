#!/usr/bin/env bash
# Checks staged TypeScript files for hardcoded px values that should be rem.
# Excludes 0px (zero positions) and 1px (hairline borders) — those are intentional.
# Called by lint-staged with staged file paths as arguments.
# Exits 1 to block the commit if violations are found.

set -euo pipefail

# Pattern: any numeric px value (fractional and negative included), matched as a
# full number token so e.g. "2.0px"/"-4px" aren't missed by only inspecting the
# digit(s) immediately preceding "px" (portable ERE — no lookbehind, BSD/GNU grep).
PATTERN='-?[0-9]+(\.[0-9]+)?px'

found=0

for file in "$@"; do
  # Skip lines annotated with // px-ok (intentional px: borders, console styles, pixel coords)
  matches=$(grep -nE -- "$PATTERN" "$file" 2>/dev/null | grep -v 'px-ok' || true)
  # Numeric filtering: drop lines whose ONLY px matches are exactly 0px/1px (any sign/decimal form of 0 or 1)
  filtered=""
  while IFS= read -r matchLine; do
    [ -z "$matchLine" ] && continue
    content="${matchLine#*:}"
    tokens=$(grep -oE -- "$PATTERN" <<< "$content" || true)
    keep=0
    while IFS= read -r tok; do
      [ -z "$tok" ] && continue
      num="${tok%px}"
      num="${num#-}"
      # magnitude other than 0 or 1 (any decimal form) is a violation
      if awk "BEGIN{v=$num; exit !(v!=0 && v!=1)}"; then
        keep=1
      fi
    done <<< "$tokens"
    if [ "$keep" -eq 1 ]; then
      filtered="${filtered}${matchLine}"$'\n'
    fi
  done <<< "$matches"
  matches="$(printf '%s' "$filtered" | sed '/^$/d')"
  if [ -n "$matches" ]; then
    echo "⚠  $file"
    echo "$matches" | sed 's/^/   /'
    found=1
  fi
done

if [ "$found" -eq 1 ]; then
  echo ""
  echo "⚠  Hardcoded px values found in TypeScript files."
  echo "   Fix: use rem instead (divide by 16, e.g. 16px → 1rem, 20px → 1.25rem)."
  echo "   Exception: 0px and 1px are excluded (positions / hairline borders)."
  echo "   Annotate intentional px with a trailing '// px-ok' comment."
  echo "   See internaldocs/STYLE_GUIDE.md for sizing rules."
  echo "   To bypass once: git commit --no-verify"
  exit 1
fi
