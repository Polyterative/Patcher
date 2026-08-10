-- Restrict anon reads on profiles to non-sensitive columns only; email is
-- deliberately omitted. Code audit confirmed no anon-reachable path selects
-- `*` or `email` from profiles (all call sites use explicit safe column
-- lists). authenticated role grants are left untouched.
revoke select on public.profiles from anon;
grant select (id, username, avatar_url, website, confirmed, public, created_at, updated_at)
  on public.profiles to anon;
