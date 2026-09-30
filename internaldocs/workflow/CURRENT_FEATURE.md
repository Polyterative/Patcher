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

### Supabase Cached Egress overquota — plan: [plans/supabase-cached-egress-overquota.md](./plans/supabase-cached-egress-overquota.md)

#### Layer 1 — MVP (stop the full-table fetches)

- [x] Rack search server-side filter + range
- [x] Collection covers via proxy + long cacheControl
- [x] Targeted specs + lint green

#### Layer 2 — Structural (shrink repeat payloads)

- [x] Patch search server-side + module fallback capped
- [x] Current-user lists verified narrow (no change)
- [x] Detail projections reviewed (trim skipped, needs audit)

#### Layer 3 — Polish (defer + densify what remains)

- [x] Import burst capped (20× worst-case cut)
- [x] Image sizing + count trims reviewed (both skipped with evidence)
- [x] Below-fold lazy-load investigated (queued as follow-up)
- [ ] Egress headroom verified on dashboard (user-side, then close #161)

#### Batch 2 (same issue)

- [x] Below-fold reads deferred to viewport demand
- [ ] Homepage discovery double-fire + history fan-out
- [ ] `getUserRacksPaginated *` narrow/remove
- [ ] Patch-editor collection pull minimal
- [ ] `rackedModules` short-TTL cache
- [ ] Min-chars gate on server search

Updated: 2026-09-29

Recent completed checkpoints are archived in [COMPLETED.md](./COMPLETED.md); their validation
notes and decisions live in the matching plan files (e.g.
[GitHub issue #140](https://github.com/Polyterative/Patcher/issues/140),
[GitHub issue #152](https://github.com/Polyterative/Patcher/issues/152)).

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
