-- Scope comment inserts to authenticated users, and require the inserted
-- authorId to match the caller's own auth.uid() (app already sets authorId
-- from the logged-in user's session).
drop policy if exists "allow all writes" on public.comments;
create policy "comments_insert_own" on public.comments
  for insert to authenticated
  with check ((select auth.uid()) = "authorId");
