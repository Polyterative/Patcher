create table public.reactions (
  user_id uuid not null references auth.users(id) on delete cascade,
  entity_type smallint not null,
  entity_id bigint not null,
  kind text not null default 'COOL',
  created_at timestamp with time zone not null default now(),
  constraint reactions_entity_id_positive check (entity_id > 0),
  constraint reactions_supported_entity_type check (entity_type in (1, 2)),
  constraint reactions_supported_kind check (kind = 'COOL'),
  constraint reactions_unique_user_entity_kind unique (user_id, entity_type, entity_id, kind)
);

create table public.reaction_counts (
  entity_type smallint not null,
  entity_id bigint not null,
  kind text not null default 'COOL',
  total integer not null default 0,
  updated_at timestamp with time zone not null default now(),
  constraint reaction_counts_entity_id_positive check (entity_id > 0),
  constraint reaction_counts_supported_entity_type check (entity_type in (1, 2)),
  constraint reaction_counts_supported_kind check (kind = 'COOL'),
  constraint reaction_counts_total_non_negative check (total >= 0),
  constraint reaction_counts_pkey primary key (entity_type, entity_id, kind)
);

create index reactions_user_kind_created_idx
  on public.reactions (user_id, kind, created_at desc);

create index reactions_entity_kind_idx
  on public.reactions (entity_type, entity_id, kind);

create index reaction_counts_entity_kind_total_idx
  on public.reaction_counts (entity_type, kind, total desc);

create function public.is_reaction_entity_eligible(
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
    else false
  end;
$$;

create function public.maintain_reaction_counts()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if TG_OP = 'INSERT' then
    insert into public.reaction_counts (entity_type, entity_id, kind, total, updated_at)
    values (NEW.entity_type, NEW.entity_id, NEW.kind, 1, now())
    on conflict (entity_type, entity_id, kind)
    do update set
      total = public.reaction_counts.total + 1,
      updated_at = now();
    return NEW;
  end if;

  if TG_OP = 'DELETE' then
    update public.reaction_counts
    set total = greatest(total - 1, 0),
        updated_at = now()
    where entity_type = OLD.entity_type
      and entity_id = OLD.entity_id
      and kind = OLD.kind;

    delete from public.reaction_counts
    where entity_type = OLD.entity_type
      and entity_id = OLD.entity_id
      and kind = OLD.kind
      and total = 0;
    return OLD;
  end if;

  return null;
end;
$$;

create trigger reactions_after_insert_counts
after insert on public.reactions
for each row execute function public.maintain_reaction_counts();

create trigger reactions_after_delete_counts
after delete on public.reactions
for each row execute function public.maintain_reaction_counts();

alter table public.reactions enable row level security;
alter table public.reaction_counts enable row level security;

create policy "reactions_select_own"
  on public.reactions
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "reactions_insert_own_eligible"
  on public.reactions
  for insert
  to authenticated
  with check (
    auth.uid() = user_id
    and public.is_reaction_entity_eligible(entity_type, entity_id)
  );

create policy "reactions_delete_own"
  on public.reactions
  for delete
  to authenticated
  using (auth.uid() = user_id);

create policy "reaction_counts_select_public_eligible"
  on public.reaction_counts
  for select
  to anon, authenticated
  using (public.is_reaction_entity_eligible(entity_type, entity_id));
