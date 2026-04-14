# Patch Instance Open Gaps

> Remaining verification gaps and edge cases that still deserve targeted tests or explicit confirmation.

---

## Open Verification Gaps

### Legacy connections after adding copies

- Old patches may contain valid connections with `instance_id = null`.
- After adding visible copies to one of those modules, the UI and save path should continue to behave safely.
- Expected baseline: legacy connections remain valid and are not force-assigned to a specific new instance.

### Self-connection on the same instance

- Feedback-loop wiring on a single instance must stay allowed.
- Duplicate detection should reject only the exact same connection repeated.
- Connection counts should count a self-connection once, not twice.

### Same module, different instances

- Wiring `A(1)` into `A(2)` should be valid.
- Reverse direction should also be valid if it is a different connection.
- Saving and reloading must preserve the different instance identities.

### Cross-instance duplicate detection

- Duplicate detection should key off endpoint IDs plus both instance IDs.
- Repeating the same `A(1) -> A(2)` connection should be rejected.
- Changing direction or changing the actual CV endpoint should remain valid.

---

## When to remove items from this file

Move an item out of this file only when:

1. The behavior is explicitly covered by a targeted test, or
2. The product/engineering decision is documented elsewhere and no longer ambiguous
