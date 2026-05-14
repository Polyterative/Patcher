# Acceptance Checklist

- [x] Linked-rack state model is documented: `Unlinked`, `Linked and available`, `Linked but diverged`, `Linked but unavailable`.
- [x] Text-first compatibility/status language is documented for `In linked rack`, `In collection only`, and `Linked rack unavailable`.
- [x] Degraded-state and back-compat expectations are documented without changing collection-first editing.
- [x] Focused acceptance scenarios are documented for create-from-rack, create-without-rack, change/clear, stale rack, and viewer-no-access.
- [x] Nullable schema/backend support for `linked_rack_id` is implemented.
- [x] Existing-patch owner UI choose/change/clear flows are implemented.
- [x] Patch creation can optionally set the linked rack.
- [x] Linked-rack create/edit writes degrade safely while the live schema rollout is pending.
- [x] Privacy-safe viewer rendering is implemented.
