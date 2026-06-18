<!-- Auto-split from TODO.md by scripts/dev/split-todo.cjs. -->
<!-- Section: INFRA (independent; pick any time a product task is blocked) -->

#### HIGH: E2E — Dedicated Test Account Cleanup

## Status

`[x]` Completed. Dedicated local E2E credentials now point at a newly created login-verified `patcher-e2e-*` Supabase auth account; workflow code handles first-login profile completion and serializes authenticated E2E runs to avoid single-account data races.


**Why:** E2E credentials are coupled to a personal Supabase account — should use a dedicated test account.

## Scope boundary

- Dedicated E2E/test-account data may be cleaned up or recreated as needed.
- Do not touch, mutate, or delete real user data.
- GitHub secret rotation may be documented as a follow-up if credentials are unavailable from this environment.

- [x] Create dedicated Supabase test account (email/password)
- [x] Update local `.env` with dedicated credentials
- [ ] Rotate GitHub secrets `E2E_TEST_EMAIL` + `E2E_TEST_PASSWORD` — blocked by current GitHub token permissions
- [x] Re-run `pnpm test:e2e:auth` to confirm

---

## Decision log

<!-- Append timestamped one-liners as the plan progresses. -->

- 2026-06-18T19:17+02:00 — Coordinator staged this task next after closing the tag-taxonomy bug; user pre-approved dedicated test-account cleanup/creation as long as real user data is not touched.

- 2026-06-18T12:17+02:00 — CTO approved treating local `.env` E2E credentials as approved for local E2E work when populated. In this worktree the keys are present but empty, so local auth verification could not run; GitHub Actions secret rotation is deferred and not completed.
- 2026-06-18T19:50+02:00 — Created a new login-verified dedicated Supabase auth account using a `patcher-e2e-*` address and updated local `.env`; no real user data was mutated.
- 2026-06-18T19:51+02:00 — GitHub secret rotation attempted with `gh secret set E2E_TEST_EMAIL` / `E2E_TEST_PASSWORD` but the token lacks repository secret permissions (`HTTP 403`); queueing this as a maintainer-permission follow-up rather than blocking local E2E cleanup.
- 2026-06-18T19:57+02:00 — Auth harness now ignores blank `.env` template values, completes first-login profile setup, and runs auth E2E with one worker by default because the suite mutates a single dedicated account.
- 2026-06-18T20:05+02:00 — Validation passed: targeted auth service unit tests, auth login E2E, rack context-menu E2E, multi-instance E2E, and full `pnpm test:e2e:auth`; reviewer approved after the duplicate profile-submit race was fixed.

## Approval queue / follow-up

- **GitHub secret rotation:** current CLI token cannot write repository Actions secrets. Maintainer with `actions:secrets` permission should set `E2E_TEST_EMAIL` and `E2E_TEST_PASSWORD` to the dedicated local `.env` values, then re-run the auth E2E workflow in CI if/when a workflow consumes those secrets.

