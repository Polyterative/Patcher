<!-- Auto-split from TODO.md by scripts/split-todo.cjs. -->
<!-- Section: INFRA (independent; pick any time a product task is blocked) -->

#### HIGH: Angular modernization — signals, `inject()`, standalone, `takeUntilDestroyed`

**Why:** The project is on Angular 21 but written largely in pre-signals style: scans show
**1,210 `.subscribe(` calls vs only 342 `takeUntil`** (latent leak risk), **178 NgModule /
`standalone:false` references**, **445 `ngOnInit`s**, and only **~37** signal / `inject()` /
`input()` occurrences across 174 components. This blocks future zoneless mode, makes CD
inconsistent (332 `ChangeDetectionStrategy` mentions across 174 components — not uniformly
OnPush), and keeps boilerplate high.

**Scope:**
- Run the official Angular schematics: `ng generate @angular/core:standalone` and
  `ng generate @angular/core:control-flow` for mechanical wins first.
- Migrate `SubManager` internally to `takeUntilDestroyed(inject(DestroyRef))` so every
  subclass benefits automatically; deprecate manual `takeUntil(this.destroy$)` patterns over
  time.
- Default new components to `ChangeDetectionStrategy.OnPush`; audit existing components and
  enable OnPush where safe.
- Convert hot leaf components to signal inputs / `computed()` for measurable CD wins.
  Candidates: `rack-visual-model`, `module-list` rows, `patch-graph` nodes, `mat-form-entity`.
- Split the four God-files (each crossing 900–1,900 LOC) discovered during the audit:
  `supabase-queries.ts`, `patch-detail-data.service.ts`, `rack-detail-data.service.ts`,
  `module-editor.component.ts`.

**Sequencing:** This task can interleave with the type-safety task above — modernising a file
is a natural time to also kill its `any`s.

- [ ] Run standalone + control-flow schematics; commit the mechanical diff.
- [ ] Rewire `SubManager` to `DestroyRef` + `takeUntilDestroyed`; keep API back-compatible.
- [ ] OnPush audit across `src/app/components/**` and `src/app/features/**`.
- [ ] Convert at least three hot leaf components to signal inputs as a pilot.
- [ ] Split each of the four God-files into focused sub-services / sub-components.

---

## Decision log

<!-- Append timestamped one-liners as the plan progresses. -->

