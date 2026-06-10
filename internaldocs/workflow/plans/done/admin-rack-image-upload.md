<!-- Auto-split from TODO.md by scripts/split-todo.cjs. -->
<!-- Section: PRODUCT — Tier 0 (ship in any order; no external dependencies) -->

#### MEDIUM: Admin — Rack Image Upload

**Why:** Users often don't upload cover images for their racks. The admin needs to be able to
set or replace those images manually to improve the quality of public listings and social previews.
Regular users must **not** be able to update images on racks they don't own; only the admin can
edit any rack's image regardless of ownership.

**Access model (critical):**
- **Admin only** — image upload/replace is an admin-panel-only action. No user-facing UI for
  editing another user's rack image, ever.
- **RLS intent:** the existing `racks` RLS allows owners to update their own rows. The admin
  update must bypass RLS via a `SECURITY DEFINER` RPC (same pattern as the public_id RPCs) so
  that the admin's authenticated session can write `image_url` on any rack without touching
  the existing owner-scoped policies.
- **Never expose this RPC to `authenticated` or `anon` roles** — grant execute to the
  admin service-role key only (called server-side or via a dedicated admin Supabase client
  initialised with the service-role secret, not the anon key).

**Scope:**
- Admin panel only; no user-side upload path now or implied later.
- One image per rack (the cover/hero image); target field is `racks.image_url`.
- Upload via Supabase Storage bucket (reuse existing bucket or provision `rack-images` with
  public read / service-role write).
- No client-side image editing in Layer 1 — accept raw file, display with `object-fit: cover`.

**Checklist:**

- [x] Confirm `racks.image_url` column exists and is in `DatabaseStrings.ts`; add if missing.
- [x] Provision (or reuse) a `rack-images` Supabase Storage bucket — public read, service-role write only.
- [x] Add a `SECURITY DEFINER` RPC `admin_set_rack_image_url(p_rack_id int, p_url text)` — callable only via service-role; not granted to `anon` or `authenticated`.
- [x] Add `backend.admin.setRackImageUrl(rackId, url)` to `SupabaseService`, initialised with the service-role client (not the anon client).
- [x] Build `AdminRackImageUploadComponent` (file input → upload to Storage → call RPC → snackbar).
- [x] Wire the component into the admin rack detail view, behind the existing admin auth guard.
- [x] Verify existing `racks` RLS is **not** relaxed — only the new SECURITY DEFINER RPC changes what the admin can write.
- [x] Unit-test: upload triggers the correct storage path and RPC; error path shows snackbar; component is not reachable without admin role.

---

## Decision log

<!-- Append timestamped one-liners as the plan progresses. -->
- 2026-06-10 — kept the admin write path server-side behind SSR instead of exposing a service-role secret in browser code.
