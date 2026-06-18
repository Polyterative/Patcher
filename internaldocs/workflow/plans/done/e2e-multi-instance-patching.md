<!-- Auto-split from TODO.md by scripts/dev/split-todo.cjs. -->
<!-- Section: INFRA (independent; pick any time a product task is blocked) -->

#### HIGH: E2E — Multi-Instance Patching

**Why:** Auto-instance feature has 30 unit tests but no E2E coverage through the real UI.
**Depends on:** Dedicated test account (above).

- [x] Open patch in editor → verify collection modules appear as cards
- [x] "Add Copy" from 0 instances → verify 2 cards with labels (1)(2)
- [x] "Add Copy" again → verify 3 cards
- [x] Connect CV from instance (1) → verify connection recorded
- [x] Same output CV to instance (2) → verify accepted
- [x] Same connection again → verify rejected as duplicate
- [x] Delete instance with connections → verify confirmation dialog
- [x] Confirm deletion → instance removed, connections scrubbed, remaining renumbered
- [x] Save + reload → connections and instances survive roundtrip
- [x] Legacy patch (pre-instance) → loads and displays correctly

Progress note: `e2e/auth-patch-multi-instance.spec.ts` now executes locally with committed Supabase URL/anon-key fallbacks, and the targeted auth E2E run verifies opening collection cards, adding copies, label reload persistence, instance-aware connection recording/duplicate refusal, connection+instance reload, connected-instance deletion confirmation, confirmed deletion scrub/renumber persistence, and no-instance legacy patch loading using stable module 1025.

---

## Decision log

<!-- Append timestamped one-liners as the plan progresses. -->

- 2026-06-18T12:17+02:00 — Local `.env` E2E credentials are approved for local authoring, but secret values must never be printed, committed, or exposed. GitHub Actions secret rotation remains deferred and incomplete.
- 2026-06-18T12:17+02:00 — Added `e2e/auth-patch-multi-instance.spec.ts` with the four Chunk B happy paths and fixed the auth runner so `--include="**/auth-patch-multi-instance.spec.ts"` maps to Playwright file selection. Connection, destructive, and legacy cases remain deferred pending live auth verification and deterministic data.
- 2026-06-18T12:17+02:00 — Targeted auth command exited 0 but skipped because this worktree's `.env` keys are present with empty values; do not mark the checklist complete until the command executes the spec with non-empty local credentials.
- 2026-06-18T13:04+02:00 — Aligned the multi-instance spec with sibling E2E Supabase fallback constants and fixed its labeled-copy card locator; `pnpm test:e2e:auth --include="**/auth-patch-multi-instance.spec.ts"` ran 4/4 non-skipped tests green. Connection-case authoring paused because no approved connectable module (manufacturer + ≥1 input + ≥1 output CV) is currently available through the test account/catalogue setup.
- 2026-06-18T14:18+02:00 — Deterministic module 1025 (Maths) worked for multi-instance connection coverage; added targeted UI tests for instance-aware recording, accepted cross-instance wiring, and duplicate rejection.
- 2026-06-18T17:13+02:00 — Finished Chunk D in `e2e/auth-patch-multi-instance.spec.ts`: added connection+instance reload, connected-instance delete confirmation/cancel, confirmed delete scrub+renumber persistence via read-only REST assertions, and a no-instance legacy patch load case. Targeted auth spec ran 11/11 green; `pnpm lint` exited 0 with pre-existing `any` warnings in unrelated E2E files.
