create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  requested_username text;
  fallback_username text;
  resolved_username text;
begin
  requested_username := nullif(trim(coalesce(new.raw_user_meta_data ->> 'username', '')), '');
  fallback_username := 'user_' || substring(new.id::text, 1, 8);

  if requested_username is not null
    and not exists (
      select 1
      from public.profiles
      where username = requested_username
    ) then
    resolved_username := requested_username;
  else
    resolved_username := fallback_username;
  end if;

  insert into public.profiles (
    id,
    email,
    username,
    confirmed,
    created_at,
    updated_at
  )
  values (
    new.id,
    coalesce(new.email, ''),
    resolved_username,
    new.email_confirmed_at is not null,
    now(),
    now()
  )
  on conflict (id) do update
  set
    email = excluded.email,
    confirmed = excluded.confirmed,
    updated_at = excluded.updated_at;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();
