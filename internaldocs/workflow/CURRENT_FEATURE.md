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

### Insights — recent price drops — plan: [plans/insights-price-drops.md](./plans/insights-price-drops.md)

#### Layer 1 — MVP

- [x] New `module-price-drops.utils.ts` with strict reliability filter + specs
- [x] `ApplicationStatisticsService.priceDrops$` over discovery Top modules via existing per-module histories + module names
- [x] Insights page card after Makers with Insight 1 (count) + Insight 2 (biggest reliable drop + link), empty/error/suppressed states, method note
- [x] Targeted specs (format fns, mapper branches, component shown-state) + `pnpm lint` clean

#### Layer 2 — Structural

- [x] Verify cache keys (`priceHub` bust) and no N+1 blowup (cached discovery + bounded per-module histories + one `publicModulesByIds` for top drops only)
- [x] Confirm RLS anon-readable (already granted), no policy change

#### Layer 3 — Polish

- [x] Copy review (zero-bullshit, tabular numerals), mobile 36rem static check
- [ ] Live screenshot re-verify (needs `pnpm start` — dev server down, user consent required)

Updated: 2026-09-14

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
