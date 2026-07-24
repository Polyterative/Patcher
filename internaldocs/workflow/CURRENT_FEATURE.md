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

### Public Open API — plan: [plans/public-open-api.md](./plans/public-open-api.md)

#### Layer 1 — MVP

- [x] Revise plan and pass backend review (`APPROVE WITH CHANGES`).
- [x] Obtain product approval for the reviewed implementation baseline.
- [x] Build and validate the complete local MVP Worker, Durable Object, OpenAPI contract, and migration foundation.
- [x] Document the local MVP Worker and operator rollout/rollback gates.
- [ ] Execute the batched owner-present rollout window (Supabase apply + `pnpm updateBackendTypes`, Vault pepper, `api_reader` LOGIN, Hyperdrive, Durable Object namespace, Worker secret + deploy, preview route, preview keys, smoke/quota/revocation/cache tests, DNS custom domain, WAF, then flag flip).

#### Layer 2 — Structural

- [x] Approve the designer brief: a dedicated Public API section inside `/user/account`, after account identity rows and before the Danger Zone.
- [ ] Land the flag-gated `DeveloperApiKeysComponent` + `DeveloperApiKeysDataService` under `src/app/features/backbone/user-management/developer-api-keys/`.
- [x] Add the `developerApiEnabled` feature flag (off in generated production environments, on in development).
- [ ] Add `SupabaseService.apiKeys` namespace and `DatabaseStrings` entries for `api_keys` / `api_tiers` / `api_key_usage_monthly` after approved migration/type generation.
- [ ] After the batched window: run `pnpm updateBackendTypes`, commit generated types, flip the flag on, and add key-required bulk JSONL export via private R2.

#### Layer 3 — Polish

- [ ] Add contract lifecycle/DX polish, retire widget-pilot alias, then public patch and rack endpoints via `public_id`.
- [ ] Enforce the confirmed per-profile active-key cap in a `CHECK` migration.
- [ ] Remove the `developerApiEnabled` feature flag once the API is public and stable.

Status: Local MVP + docs + migrations reviewed and complete. Structural UI work (backend namespace, flag-gated User Area panel, data service, tests) is autonomous once designer confirms placement; all remote applies, credentials, and the preview-to-public promotion are batched into a single owner-present window described in the plan's "Batched manual-operator window" section.
Updated: 2026-07-24

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
