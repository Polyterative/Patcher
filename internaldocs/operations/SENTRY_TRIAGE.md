# Sentry triage workflow

Use this workflow to review and resolve Patcher Sentry issues without exposing credentials.

## Credential-safe access rules

- Never print, paste, commit, or summarize token values from `.sentryclirc`, shell environment, CI secrets, or local config.
- Prefer the Sentry MCP when it is available in the agent session; it is the approved live-inspection path for issue details and stack traces.
- If MCP is unavailable, use `sentry-cli` or API calls only with environment variables such as `$SENTRY_AUTH_TOKEN`, `$SENTRY_ORG`, and `$SENTRY_PROJECT`. Do not inline token values in commands or logs.
- Do not run commands with debug/verbose modes that could echo headers or config.
- Use `node scripts/ops/sentry-triage-check.mjs` for a no-network readiness check before attempting live access.
- If credentials/tooling are unavailable, stop live inspection and move the live work to an on-hold plan instead of guessing from stale local data.

## Triage cadence

- Weekly during normal development.
- Before a release candidate and again after production deployment.
- Immediately when users report a crash, authentication breakage, data-loss risk, or Sentry volume spikes.

## Prioritization rubric

Work in this order:

1. **Critical:** data loss, authentication/session failures, broken app boot, privacy/security impact, or errors affecting most users.
2. **High:** frequent production errors, errors blocking a core flow, or regressions introduced by the current release.
3. **Medium:** repeated but recoverable errors, degraded secondary flows, or noisy issues that obscure real failures.
4. **Low:** rare edge cases, browser-extension noise, crawler/bot noise, or issues with no actionable app stack.

Within each severity band, prefer issues with higher event count, more affected users, a recent first-seen/regression timestamp, and a clear app-owned stack trace.

## Issue-to-backlog workflow

For each actionable Sentry issue:

1. Capture the Sentry issue key, title, severity, event count, affected users, first/last seen timestamps, release/environment, and top app-owned stack frame.
2. Decide whether it is an immediate fix or backlog work.
3. Create or update exactly one backlog plan when the fix is not immediate. Keep `internaldocs/workflow/TODO.md` to a single line that links to the plan.
4. Do not create TODO entries for duplicate issues already covered by an active plan, third-party/browser-extension noise, resolved issues with no recent events, or issues lacking enough evidence to reproduce.
5. Add a Decision log entry to the relevant plan explaining the triage decision.

## Fix workflow

Use the normal Patcher persona chain:

1. **bug-hunter:** reproduce or root-cause the issue from Sentry frames, breadcrumbs, release data, and code paths.
2. **executor:** make the smallest complete code or documentation change that fixes the root cause.
3. **reviewer:** independently inspect the diff for correctness, regressions, and missing validation.
4. Validate with targeted tests first, then broader `pnpm lint` / `pnpm test-headless` only when the changed area warrants it.

## Validation and closing checklist

Before marking a Sentry issue resolved:

- Root cause is documented in the plan Decision log or fix summary.
- The fix has landed in the relevant code path and does not rely on hiding the error.
- Targeted validation passes locally or the validation blocker is documented.
- Release/deploy path is clear enough that Sentry can observe the fix.
- The issue is resolved in Sentry only after the fix is deployed or after confirming it is duplicate/noise.
- If the issue recurs after release, reopen or create a follow-up plan with the regression release noted.

## Safe fallback command patterns

These examples show command shape only; keep actual values in the environment.

```sh
SENTRY_ORG=patcher SENTRY_PROJECT=patcher-xyz node scripts/ops/sentry-triage-check.mjs
sentry-cli issues list --org "$SENTRY_ORG" --project "$SENTRY_PROJECT" --query "is:unresolved" --limit 25
curl -H "Authorization: Bearer $SENTRY_AUTH_TOKEN" "https://sentry.io/api/0/projects/$SENTRY_ORG/$SENTRY_PROJECT/issues/?query=is%3Aunresolved&limit=25"
```

Do not add `--log-level=debug`, `set -x`, or any shell tracing around credentialed commands.
