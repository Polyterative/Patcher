<!-- Auto-split from TODO.md by scripts/split-todo.cjs. -->
<!-- Section: INFRA (independent; pick any time a product task is blocked) -->

#### HIGH: E2E — Multi-Instance Patching

**Why:** Auto-instance feature has 30 unit tests but no E2E coverage through the real UI.
**Depends on:** Dedicated test account (above).

- [ ] Open patch in editor → verify collection modules appear as cards
- [ ] "Add Copy" from 0 instances → verify 2 cards with labels (1)(2)
- [ ] "Add Copy" again → verify 3 cards
- [ ] Connect CV from instance (1) → verify connection recorded
- [ ] Same output CV to instance (2) → verify accepted
- [ ] Same connection again → verify rejected as duplicate
- [ ] Delete instance with connections → verify confirmation dialog
- [ ] Confirm deletion → instance removed, connections scrubbed, remaining renumbered
- [ ] Save + reload → connections and instances survive roundtrip
- [ ] Legacy patch (pre-instance) → loads and displays correctly

---

## Decision log

<!-- Append timestamped one-liners as the plan progresses. -->

