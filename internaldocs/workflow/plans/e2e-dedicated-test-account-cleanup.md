<!-- Auto-split from TODO.md by scripts/dev/split-todo.cjs. -->
<!-- Section: INFRA (independent; pick any time a product task is blocked) -->

#### HIGH: E2E — Dedicated Test Account Cleanup

**Why:** E2E credentials are coupled to a personal Supabase account — should use a dedicated test account.

- [ ] Create dedicated Supabase test account (email/password)
- [ ] Update local `.env` and rotate GitHub secrets `E2E_TEST_EMAIL` + `E2E_TEST_PASSWORD`
- [ ] Re-run `pnpm test:e2e:auth` to confirm

---

## Decision log

<!-- Append timestamped one-liners as the plan progresses. -->

- 2026-06-18T12:17+02:00 — CTO approved treating local `.env` E2E credentials as approved for local E2E work when populated. In this worktree the keys are present but empty, so local auth verification could not run; GitHub Actions secret rotation is deferred and not completed.
