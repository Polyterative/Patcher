\set ON_ERROR_STOP on
drop table if exists public._snap_:label;
create table public._snap_:label as
select 'policy' k, schemaname||'.'||tablename||'.'||policyname v from pg_policies
union all select 'bucket', id||'='||public from storage.buckets
union all select 'trigger', tgname from pg_trigger where tgrelid='public.app_feature_flags'::regclass and not tgisinternal
union all select 'fn', p.proname from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='private' and p.proname not in ('maint_ok')
union all select 'tbl', relname from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='private' and relkind='r';
