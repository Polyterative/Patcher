alter table public.reactions
  drop constraint reactions_supported_entity_type,
  add constraint reactions_supported_entity_type check (entity_type in (1, 2, 3));

alter table public.reaction_counts
  drop constraint reaction_counts_supported_entity_type,
  add constraint reaction_counts_supported_entity_type check (entity_type in (1, 2, 3));

create or replace function public.is_reaction_entity_eligible(
  p_entity_type smallint,
  p_entity_id bigint
)
returns boolean
language sql
stable
security definer
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
