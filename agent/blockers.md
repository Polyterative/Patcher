# Blockers

## Open: Wishlist nav placement (Module Possession States — Layer 2)

**Raised:** 2026-05-15
**Context:** ROADMAP.md Tier 0 § Module Possession States — open question #2.
**Question:** Where does the Wishlist (WANTS modules) live in navigation?
- Option A: Sibling page to "My Modules" (e.g. `/user/wishlist`)
- Option B: A tab inside "My Modules" (e.g. `My Modules | Wishlist | For Sale`)
**Blocked work:** Layer 2 "My Modules" filtering and Wishlist surface.
**Action required:** Human decision. When resolved, update `CURRENT_FEATURE.md` Layer 2 checklist.

## Advisory: user_modules (and 8 other tables) have RLS disabled

**Raised:** 16-05-2026
**Source:** Supabase security advisor
**Severity:** Critical (per Supabase advisory)
**Details:** `public.user_modules` has Row Level Security disabled. Also affected:
`module_ins`, `module_outs`, `tags`, `module_tags`, `user_module_tags`, `standards`,
`module_panels`, `comments_duplicate`. With RLS off, any client with the anon key can
read or modify every row in these tables.
**Note:** Disabling was possibly intentional for read-friendly public access to module
metadata. Enabling RLS without policies will block all access — policies must be
designed first.
**Action required:** Human review and decision before enabling RLS. Do NOT auto-apply.
**Remediation SQL** (do not run without approval):
```sql
ALTER TABLE public.user_modules ENABLE ROW LEVEL SECURITY;
-- (similarly for module_ins, module_outs, tags, module_tags, user_module_tags, standards, module_panels, comments_duplicate)
```
