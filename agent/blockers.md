# Blockers

No open blockers.

> This file (and the rest of `agent/*.md`) was last actively maintained 2026-06-16. For
> current project state, use `internaldocs/workflow/CURRENT_FEATURE.md` and
> `internaldocs/workflow/TODO.md` — they are the actively-maintained source of truth.

## Resolved

- **Wishlist nav placement (Module Possession States — Layer 2)** — raised 2026-05-15,
  resolved 2026-06-11: shipped as a "Wishlist" view alongside "My Modules" in the user-area
  surface (not a separate top-level page). See `internaldocs/workflow/plans/done/module-possession-states.md`
  Decision log.
- **Advisory: user_modules (and 8 other tables) had RLS disabled** — raised 16-05-2026,
  Critical per Supabase security advisor. Verified resolved 2026-08-25: direct query of
  `pg_class.relrowsecurity` confirms RLS is enabled on all 9 tables (`user_modules`,
  `module_ins`, `module_outs`, `tags`, `module_tags`, `user_module_tags`, `standards`,
  `module_panels`, `comments_duplicate`); the current Supabase security advisor reports no
  `rls_disabled_in_public` findings.
