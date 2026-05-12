# Blockers

## 2026-05-12T12:17:17+02:00

- **External blocker:** The existing `supabase/migrations/20260512112500_add_linked_rack_id_to_patches.sql` migration has not been applied to the live Supabase environment yet.
- **Why it matters:** Unlinked patch creation now works again because the app omits `linked_rack_id` unless it is explicitly selected, but selected linked-rack persistence still depends on the live database actually having the nullable `patches.linked_rack_id` column.
- **Minimum human input needed:** Apply the migration in the target Supabase environment, then confirm when the live schema includes `patches.linked_rack_id`.
