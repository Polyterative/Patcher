-- The public_id helpers are internal trigger helpers. They must run as
-- SECURITY DEFINER to access pgcrypto in `extensions`, but should not be
-- callable directly through PostgREST RPC.

revoke execute on function public.generate_public_id(int) from public, anon, authenticated;
revoke execute on function public.tg_set_public_id() from public, anon, authenticated;
