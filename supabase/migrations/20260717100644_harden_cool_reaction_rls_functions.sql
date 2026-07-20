create or replace function public.is_reaction_entity_eligible(
  p_entity_type smallint,
  p_entity_id bigint
)
returns boolean
language sql
stable
security invoker
set search_path = public
as $$
  select case
    when p_entity_type = 1 then exists (
      select 1
      from public.modules m
      where m.id = p_entity_id
        and m.public = true
    )
    when p_entity_type = 2 then exists (
      select 1
      from public.racks r
      where r.id = p_entity_id
        and r.public = true
    )
    when p_entity_type = 3 then exists (
      select 1
      from public.patches p
      where p.id = p_entity_id
        and p.public = true
    )
    else false
  end;
$$;

revoke execute on function public.maintain_reaction_counts() from public;
revoke execute on function public.maintain_reaction_counts() from anon;
revoke execute on function public.maintain_reaction_counts() from authenticated;

drop policy if exists "reactions_select_own" on public.reactions;
create policy "reactions_select_own"
  on public.reactions
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "reactions_insert_own_eligible" on public.reactions;
create policy "reactions_insert_own_eligible"
  on public.reactions
  for insert
  to authenticated
  with check (
    (select auth.uid()) = user_id
    and public.is_reaction_entity_eligible(entity_type, entity_id)
  );

drop policy if exists "reactions_delete_own" on public.reactions;
create policy "reactions_delete_own"
  on public.reactions
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);
