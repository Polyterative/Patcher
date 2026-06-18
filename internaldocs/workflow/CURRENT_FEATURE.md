# Current Feature / AI RAM

> **Rules for AI agents:**
> 1. Read this file when the task is about the active in-flight feature or explicitly references the current plan.
> 2. Keep it updated — check off steps, add discoveries.
> 3. One feature at a time — archive to [COMPLETED.md](./COMPLETED.md) when done, then reset.
> 4. This file owns implementation detail; `TODO.md` owns the backlog index, `plans/` owns per-task detail.
> 5. **Every feature uses three layers** (MVP → Structural → Polish). Define all three before coding. Complete each layer before starting the next. Layout before interactions.
> 6. **Append to the Decision log** for any non-obvious choice (library pick, data shape, fallback policy, scope cut). Future agents read this to avoid relitigating settled questions.

---

## Active

### E2E — Dedicated Test Account Cleanup

Plan: [`plans/e2e-dedicated-test-account-cleanup.md`](./plans/e2e-dedicated-test-account-cleanup.md)

Status: **Staged for next coordinator-loop.** Product owner approved cleanup/creation of dedicated test-account data when needed, with the explicit boundary that real user data must not be touched.

#### Why this is next

The just-completed tag-taxonomy bug is closed and archived. Per user priority, the loop should prefer small bugs/fixes and fastest-to-close tactical work before larger Marketplace/schema features. This E2E infrastructure item is already approved, unblocks screenshot/auth validation reliability, and has a narrow data-safety boundary.

#### Layer checklist

- [ ] MVP: inspect current E2E credential wiring, test-account identifiers, and existing auth E2E data dependencies without touching real user data.
- [ ] Structural: create or repair only dedicated test-account fixtures/data as needed, and document the safe cleanup path.
- [ ] Polish: run `pnpm test:e2e:auth` when credentials are available, record any secret-rotation follow-up, and keep generated E2E artifacts out of git.

#### Validation strategy

- Inspect relevant E2E scripts/specs and local env wiring first.
- Run targeted auth E2E validation with `pnpm test:e2e:auth` if dedicated credentials are configured in this environment.
- Run `node scripts/checks/check-docs.cjs` after workflow doc updates.

#### Decision log

- 2026-06-18T19:17+02:00 — Staged this as the next actionable task because the product owner pre-approved it, it is narrower than remaining Marketplace/schema work, and it must not touch real user data.
