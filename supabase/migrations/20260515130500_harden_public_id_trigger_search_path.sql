-- Pin the public_id trigger helper to pg_catalog while keeping calls to public
-- functions schema-qualified.

create or replace function public.tg_set_public_id()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
begin
  if NEW.public_id is null or NEW.public_id = '' then
    NEW.public_id := public.generate_public_id();
  end if;
  return NEW;
end;
$$;
