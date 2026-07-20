-- Marketplace listing media cap hardening.
-- Serialize per-listing media limit checks so concurrent inserts cannot exceed
-- the approved 8-image cap.

create or replace function public.tg_listing_media_enforce_limit()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_count integer;
begin
  perform pg_advisory_xact_lock(hashtext(new.listing_id::text));

  select count(*)::integer
    into v_count
    from public.listing_media lm
    where lm.listing_id = new.listing_id
      and (tg_op <> 'UPDATE' or lm.id is distinct from new.id);

  if v_count >= 8 then
    raise exception 'Marketplace listings support at most 8 images';
  end if;

  return new;
end;
$$;

revoke execute on function public.tg_listing_media_enforce_limit() from public, anon, authenticated;
