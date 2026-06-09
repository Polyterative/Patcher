# Maintenance — Update libraries

**Why:** Dependencies drift. We're already seeing the symptom — Sentry warned that
`@sentry/angular ^10.38.0` is below the minimum needed for agent monitoring (irrelevant
to us, but a sign the SDK is stale), and `@sentry/browser ^10.45.0` is on a different
minor than `@sentry/angular`. Other libraries (Angular, RxJS, Material, Supabase,
Playwright, etc.) likely have similar drift. A periodic, batched update keeps the
upgrade cost predictable instead of accumulating into a painful "everything at once"
sweep.

**Scope:** Bump dependencies in `package.json` to current stable versions, prioritising:

- [ ] `@sentry/angular` and `@sentry/browser` to the same latest 10.x (clears the agent-monitoring warning)
- [ ] Audit other `@sentry/*` packages (`@sentry/cli`)
- [ ] Patch / minor bumps across all dependencies (low risk, batch into one PR)
- [ ] Major bumps reviewed individually (Angular, RxJS, Material, Supabase, Playwright) — only when there is a concrete reason
- [ ] After each batch: `pnpm lint`, `pnpm build`, `pnpm test-headless`, and a quick `pnpm test:e2e:auth` smoke
- [ ] Update `internaldocs/` if any pattern docs reference deprecated APIs

**Cadence:** Aim for one batched update PR per quarter unless a security advisory or
needed feature forces an earlier bump.

**Out of scope:** Framework rewrites or large refactors triggered by the upgrade —
file those as separate plan entries.

---

## Decision log

<!-- Append timestamped one-liners as the plan progresses. -->
