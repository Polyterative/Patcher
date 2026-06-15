#!/usr/bin/env bash
# Enforces that posthog-js is only imported in the two designated choke-points.
# Any other import is a layering violation — route product events through
# AnalyticsService instead of touching posthog-js directly.
#
# Usage: run as part of `pnpm lint` via package.json.

set -euo pipefail

VIOLATIONS=$(grep -r "from 'posthog-js'\|require('posthog-js')\|import.*posthog-js" \
  --include="*.ts" \
  src/ \
  | grep -v "^src/main\.ts:" \
  | grep -v "^src/app/features/backbone/analytics-integration/analytics\.service\.ts:" \
  | grep -v "\.spec\.ts:" \
  || true)

if [ -n "$VIOLATIONS" ]; then
  echo ""
  echo "❌  posthog-js import violation(s) detected:"
  echo "$VIOLATIONS"
  echo ""
  echo "    posthog-js must only be imported in:"
  echo "      • src/main.ts  (SDK init)"
  echo "      • src/app/features/backbone/analytics-integration/analytics.service.ts"
  echo ""
  echo "    Use AnalyticsService.capture() / .identify() / .reset() everywhere else."
  exit 1
fi

echo "✅  posthog-js import check passed."
