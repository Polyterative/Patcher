# Patch Instance Open Gaps

> Remaining verification gaps and edge cases that still deserve targeted tests or explicit confirmation.

---

## Open Verification Gaps

*All gaps below were closed as of 2026-05-14. The section is preserved for reference.*

### Legacy connections after adding copies ✅ Closed

- Old patches may contain valid connections with `instance_id = null`.
- After adding visible copies to one of those modules, the UI and save path should continue to behave safely.
- Expected baseline: legacy connections remain valid and are not force-assigned to a specific new instance.
- **Covered by:** `patch-detail-data-service-instances.spec.ts` — Scenario L (4 tests): coexistence, no-scrub on unrelated delete, null→undefined normalization.

### Self-connection on the same instance ✅ Closed

- Feedback-loop wiring on a single instance must stay allowed.
- Duplicate detection should reject only the exact same connection repeated.
- Connection counts should count a self-connection once, not twice.
- **Covered by:** `patch-detail-data-service-instances.spec.ts` — Scenario P (4 tests): accept self-connection, reject duplicate, scrub on delete, count as 1.

### Same module, different instances ✅ Closed

- Wiring `A(1)` into `A(2)` should be valid.
- Reverse direction should also be valid if it is a different connection.
- Saving and reloading must preserve the different instance identities.
- **Covered by:** `patch-detail-data-service-instances.spec.ts` — Scenario Q (3 tests): accept cross-instance, count correctly, partial scrub on delete. Scenario 27f (3 tests): DB mapping roundtrip.

### Cross-instance duplicate detection ✅ Closed

- Duplicate detection should key off endpoint IDs plus both instance IDs.
- Repeating the same `A(1) -> A(2)` connection should be rejected.
- Changing direction or changing the actual CV endpoint should remain valid.
- **Covered by:** `patch-detail-data-service-instances.spec.ts` — Scenario R (3 tests): reject exact duplicate, accept reversed, accept different instance assignment.

---

## When to remove items from this file

Move an item out of this file only when:

1. The behavior is explicitly covered by a targeted test, or
2. The product/engineering decision is documented elsewhere and no longer ambiguous
