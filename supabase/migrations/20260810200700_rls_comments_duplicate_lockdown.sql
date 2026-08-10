-- Lock out API roles from the unused comments_duplicate table (no client code
-- references it). Table is preserved, not dropped, per owner instruction.
alter table public.comments_duplicate enable row level security;
revoke all on public.comments_duplicate from anon, authenticated;
