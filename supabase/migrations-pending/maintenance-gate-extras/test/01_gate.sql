create schema if not exists t;
create or replace function t.run_as(p_role text, p_app_role text, p_sql text) returns text language plpgsql as $$
declare res text;
begin
  perform set_config('request.jwt.claims',
    case when p_app_role is null then '{}' else jsonb_build_object('sub','00000000-0000-0000-0000-00000000000a','app_metadata', jsonb_build_object('role', p_app_role))::text end, true);
  execute format('set local role %I', p_role);
  begin execute p_sql into res; exception when others then res := 'ERR:' || sqlerrm; end;
  reset role;
  return res;
end $$;
create or replace function t.expect(p_label text, p_actual text, p_expected text) returns void language plpgsql as $$
begin
  if p_actual is distinct from p_expected then raise exception 'FAIL %: expected %, got %', p_label, p_expected, p_actual; end if;
end $$;
create or replace function t.set_flag(p_state text) returns void language plpgsql as $$
begin
  if p_state = 'missing' then delete from public.app_feature_flags where key = 'maintenanceModeEnabled'; return; end if;
  insert into public.app_feature_flags values ('maintenanceModeEnabled','production', p_state = 'on')
    on conflict (key, environment) do update set enabled = excluded.enabled;
  insert into public.app_feature_flags values ('maintenanceModeEnabled','development', p_state <> 'on')
    on conflict (key, environment) do update set enabled = excluded.enabled;
end $$;

do $$
declare
  tbl text; role_ text; state text; n text;
begin
  -- 1. API roles: all 8 tables, flag off => rows, on => none, missing => rows
  foreach state in array array['off','on','missing'] loop
    perform t.set_flag(state);
    foreach tbl in array array['modules','manufacturers','module_ins','module_outs','module_panels','module_tags','tags','standards'] loop
      foreach role_ in array array['api_view_owner','api_reader'] loop
        n := t.run_as(role_, null, format('select count(*)::text from public.%I', tbl));
        perform t.expect(format('api %s %s %s', state, role_, tbl), n, case when state = 'on' then '0' else '1' end);
      end loop;
    end loop;
  end loop;
  -- API roles stay closed even with an admin-looking claim (no JWT identity is trusted for them? they would pass maint_ok)
  -- note: api roles never carry a JWT in production; documented in README.

  perform t.set_flag('on');
  perform t.expect('flag probe on', t.run_as('api_reader', null, 'select private.maint_flag_on()::text'), 'true');
  perform t.set_flag('off');
  perform t.expect('flag probe off', t.run_as('api_reader', null, 'select private.maint_flag_on()::text'), 'false');
  perform t.set_flag('missing');
  perform t.expect('flag probe missing', t.run_as('api_reader', null, 'select private.maint_flag_on()::text'), 'false');

  -- 2. buckets follow the flag; only recorded (originally public) ones are touched
  perform t.set_flag('on');
  perform t.expect('on home-resources', (select public::text from storage.buckets where id='home-resources'), 'false');
  perform t.expect('on racks', (select public::text from storage.buckets where id='racks'), 'false');
  perform t.expect('on unrelated untouched', (select public::text from storage.buckets where id='unrelated'), 'true');
  perform t.expect('on private stays private', (select public::text from storage.buckets where id='manufacturer-logos'), 'false');
  perform t.set_flag('off');
  perform t.expect('off restores', (select string_agg(id || '=' || public::text, ',' order by id) from storage.buckets),
    'home-resources=true,manufacturer-logos=false,marketplace-listings=false,module-panels=true,other-private=false,patches=true,racks=true,unrelated=true');
  perform t.set_flag('on'); perform t.set_flag('missing');
  perform t.expect('missing restores', (select public::text from storage.buckets where id='racks'), 'true');
  perform t.set_flag('on');
  delete from public.app_feature_flags where key='maintenanceModeEnabled' and environment='development';
  perform t.expect('development row change ignored', (select public::text from storage.buckets where id='racks'), 'false');
  perform t.set_flag('off');

  -- 3. storage.objects: anon/authenticated blocked on recorded buckets while on; admin may read; other buckets unaffected
  perform t.set_flag('on');
  perform t.expect('obj anon recorded', t.run_as('anon', null, $q$select count(*)::text from storage.objects where bucket_id='racks'$q$), '0');
  perform t.expect('obj user recorded', t.run_as('authenticated', 'user', $q$select count(*)::text from storage.objects where bucket_id='racks'$q$), '0');
  perform t.expect('obj admin recorded', t.run_as('authenticated', 'admin', $q$select count(*)::text from storage.objects where bucket_id='racks'$q$), '1');
  perform t.expect('obj anon other bucket', t.run_as('anon', null, $q$select count(*)::text from storage.objects where bucket_id='unrelated'$q$), '0');  -- no permissive policy for it
  perform t.expect('obj user other bucket write', t.run_as('authenticated', 'user', $q$with i as (insert into storage.objects (bucket_id,name) values ('unrelated','w.png') returning 1) select count(*)::text from i$q$), '1');
  perform t.expect('obj user recorded write blocked', left(t.run_as('authenticated', 'user', $q$insert into storage.objects (bucket_id,name) values ('racks','w2.png')$q$), 4), 'ERR:');
  perform t.set_flag('off');
  perform t.expect('obj anon off', t.run_as('anon', null, $q$select count(*)::text from storage.objects where bucket_id='racks'$q$), '1');
end $$;
