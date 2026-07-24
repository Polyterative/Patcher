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
- [~] Build safe MVP code/scaffolding; local migration and Durable Object foundations are written/validated, while request-path integration, remote apply, and infrastructure remain gated.
- [ ] Build the key-required, origin-protected modules/manufacturers API (Cloudflare Worker + Supavisor `api_reader` role + `api_v1_*` views + HMAC-pepper keys + Durable Object quota).

#### Layer 2 — Structural

- [ ] Add User Area key self-service, usage reporting (from `api_key_usage_monthly`), and key-required bulk JSONL export via private R2.

#### Layer 3 — Polish

- [ ] Add contract lifecycle/DX polish, retire widget-pilot alias, then public patch and rack endpoints via `public_id`.

Status: Reviewed plan adopted; local-only migration and Durable Object foundations are written, with Worker request-path integration, remote apply, credentials, Vault, and Cloudflare infrastructure still gated.
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
