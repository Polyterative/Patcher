-- Rolls back 20261023130000_maintenance_gate_extras.sql. Restores recorded bucket visibility exactly. Safe to re-run.
begin;
set lock_timeout = '5s';

drop trigger if exists zz_maint_flag_changed on public.app_feature_flags;

do $$
begin
  if to_regclass('private.maint_bucket_state') is not null and to_regclass('storage.buckets') is not null then
    update storage.buckets b set public = s.original_public
      from private.maint_bucket_state s where b.id = s.bucket_id and b.public is distinct from s.original_public;
  end if;
  if to_regclass('storage.objects') is not null then
    begin
      execute 'drop policy if exists maint_gate_objects on storage.objects';
      execute 'drop policy if exists maint_admin_select_objects on storage.objects';
    exception when insufficient_privilege then
      raise warning 'maintenance gate extras rollback: cannot drop storage.objects policies as %; drop maint_gate_objects and maint_admin_select_objects manually', current_user;
    end;
  end if;
  if to_regclass('private.maint_extras_state') is not null then
    declare r record;
    begin
      for r in select obj from private.maint_extras_state where kind = 'api_policy' loop
        if to_regclass(format('public.%I', r.obj)) is not null then
          execute format('drop policy if exists maint_gate_api on public.%I', r.obj);
        end if;
      end loop;
    end;
  end if;
end $$;

drop function if exists private.maint_flag_changed();
drop function if exists private.maint_flag_on();
drop function if exists private.maint_sync_buckets();
drop function if exists private.maint_bucket_admin(text);
drop function if exists private.maint_bucket_ok(text);
drop table if exists private.maint_bucket_state;
drop table if exists private.maint_extras_state;

commit;
