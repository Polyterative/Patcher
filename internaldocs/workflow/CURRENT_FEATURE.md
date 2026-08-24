# Current Feature / AI RAM

> **Rules for AI agents:**
> 1. Read this file when the task is about the active in-flight feature or explicitly references the current plan.
> 2. This file owns **only** the pointer to the active plan file and the live layer checklist.
>    Every durable fact — validation notes, decisions, discoveries, acceptance evidence — goes
>    directly into the linked `plans/<slug>.md`, so nothing needs migrating at archive time.
> 3. One feature at a time — when done, add one line to [COMPLETED.md](./COMPLETED.md), move the
>    plan to `plans/done/`, and reset this file to `_No active feature._` (bump `Updated:`).
> 4. `TODO.md` owns the backlog index **and the Approvals ledger** (standing approvals, pending
>    questions, denials). Do not keep an approval queue here — register gates there.
> 5. **Every feature uses three layers** (MVP → Structural → Polish). Define all three before coding. Complete each layer before starting the next. Layout before interactions.
> 6. **Append non-obvious choices to the plan file's Decision log** (library pick, data shape, fallback policy, scope cut) — not to this file.
> 7. Bump the `Updated:` date whenever you touch this file. A stale date is lint-flagged.

---

## Active

### Auth resilience — plan: [plans/auth-resilience.md](./plans/auth-resilience.md)

#### Layer 1 — MVP

- [x] S1 auth-request retry committed as `dc6afca6`.
- [x] S2 recovery-session integrity committed as `083b549a`.
- [x] S3 OAuth callback settlement committed as `83227c2c`.
- [x] S4 destructive-action retry QA-PASS; implementation increment uncommitted pending coordinator commit.

#### Layer 2 — Structural

- [x] Preserve layered auth access and browser-only recovery boundaries.

#### Layer 3 — Polish

- [ ] Complete and validate S4, then archive the plan.

Status: S1-S3 are committed on `develop`; S4 is QA-PASS and uncommitted pending the coordinator commit. Production publication is not confirmed.
Updated: 2026-08-24

<!-- The prior Public Open API active checklist remains below for continuity; its durable plan is unchanged. -->

### Public Open API — plan: [plans/public-open-api.md](./plans/public-open-api.md)

#### Layer 1 — MVP

- [x] Revise plan and pass backend review (`APPROVE WITH CHANGES`).
- [x] Obtain product approval for the reviewed implementation baseline.
- [x] Build and validate the complete local MVP Worker, Durable Object, OpenAPI contract, and migration foundation.
- [x] Document the local MVP Worker and operator rollout/rollback gates.
- [x] Execute the owner-present remote foundation and authenticated smoke window (Supabase apply + generated types, Vault pepper, `api_reader` LOGIN, direct-endpoint Hyperdrive, Durable Object, Worker secret/upload, temporary smoke route, partner-key rotation/revocation/reactivation, usage, catalogue, ETag/HEAD, and cache tests).
- [~] Complete public promotion: `api.patcher.xyz` is live, production smoke/monitoring checks pass, the temporary smoke Worker is deleted, and the owner deferred outer WAF protection; the production UI flag shipped with the `6.6.0`/`6.7.0` app releases (2026-08-17/2026-08-20) — only final live-doc/archive cleanup remains.

#### Layer 2 — Structural

- [x] Approve the designer brief: a dedicated Public API section inside `/user/account`, after account identity rows and before the Danger Zone.
- [x] Land the flag-gated `DeveloperApiKeysComponent` + `DeveloperApiKeysDataService` under `src/app/features/backbone/user-management/developer-api-keys/`.
- [x] Add the `developerApiEnabled` feature flag (off in generated production environments, on in development).
- [x] Add `SupabaseService.apiKeys` namespace and `DatabaseStrings` entries for `api_keys` / `api_tiers` / `api_key_usage_monthly` after approved migration/type generation.
- [ ] The production flag shipped in `6.6.0`/`6.7.0`; still needed: key-required bulk JSONL export via private R2.

#### Layer 3 — Polish

- [ ] Add contract lifecycle/DX polish, retire widget-pilot alias, then public patch and rack endpoints via `public_id`.
- [x] Add the stable-slot contract to the consolidated local identity migration (`rotated_at`, full `UNIQUE (profile_id)`, atomic UPSERT rewrites preserving `id` + tier/overrides) and extend the static contract tests; remote apply stays inside the batched operator window.
- [ ] Remove the `developerApiEnabled` feature flag once the API is public and stable.

Status: The API is live at `api.patcher.xyz`; production catalogue/auth/quota/cache checks pass and the temporary smoke Worker is deleted. The owner approved launch without outer WAF for now. `developerApiEnabled` shipped to production with the `6.6.0` (2026-08-17) and `6.7.0` (2026-08-20) releases; `production` and `develop` are now even. Remaining: final live-doc/archive cleanup (see the plan's "Docs updates after the API is truly live" checklist), then Layer 2 bulk JSONL export and Layer 3 contract polish/flag removal.
Updated: 2026-08-22

Recent completed checkpoints are archived in [COMPLETED.md](./COMPLETED.md); their validation
notes and decisions live in the matching plan files (e.g.
[`plans/marketplace-shipping-address-book.md`](./plans/marketplace-shipping-address-book.md),
[`plans/module-cool-appreciation-button.md`](./plans/module-cool-appreciation-button.md)).

## Empty template

Copy this skeleton when a new feature becomes active; keep all three layers defined before coding.
Validation notes and the Decision log live in the linked plan file, not here.

```markdown
### <Feature name> — plan: [plans/<slug>.md](./plans/<slug>.md)

#### Layer 1 — MVP

- [ ] ...

#### Layer 2 — Structural

- [ ] ...

#### Layer 3 — Polish

- [ ] ...
```
