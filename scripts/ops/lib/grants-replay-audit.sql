-- Least-privilege audit for the Public Open API surface
-- (20260724133200_api_identity.sql:65-69, 344-355; 20260724133300_api_v1_views.sql:224).
-- Read-only: a DO block that only inspects catalogs and RAISEs on violation.
-- Appended to every grants replay (a violation aborts the whole transaction),
-- and run on its own against the source at capture time.
DO $audit$
DECLARE bad text[] := '{}'; f text; r text; t text;
BEGIN
  FOREACH f IN ARRAY ARRAY['private.mint_api_key(uuid,text,text)', 'public.verify_api_key(bytea)',
                           'public.record_api_key_usage(uuid,date,integer)', 'public.create_api_key(text)',
                           'public.create_partner_api_key(uuid,text)', 'public.revoke_api_key(uuid)'] LOOP
    IF to_regprocedure(f) IS NULL THEN bad := bad || ('missing function ' || f); CONTINUE; END IF;
    FOREACH r IN ARRAY ARRAY['anon', 'authenticated', 'api_reader'] LOOP
      IF has_function_privilege(r, f, 'EXECUTE')
         AND NOT (r = 'api_reader' AND f IN ('public.verify_api_key(bytea)', 'public.record_api_key_usage(uuid,date,integer)'))
         AND NOT (r = 'authenticated' AND f IN ('public.create_api_key(text)', 'public.revoke_api_key(uuid)')) THEN
        bad := bad || format('%s can EXECUTE %s', r, f);
      END IF;
    END LOOP;
  END LOOP;
  FOREACH f IN ARRAY ARRAY['public.verify_api_key(bytea)', 'public.record_api_key_usage(uuid,date,integer)'] LOOP
    IF to_regprocedure(f) IS NOT NULL AND NOT has_function_privilege('api_reader', f, 'EXECUTE') THEN
      bad := bad || format('api_reader cannot EXECUTE %s', f);
    END IF;
  END LOOP;
  FOREACH t IN ARRAY ARRAY['public.api_tiers', 'public.api_keys', 'public.api_key_usage_monthly'] LOOP
    IF to_regclass(t) IS NULL THEN bad := bad || ('missing table ' || t); CONTINUE; END IF;
    FOREACH r IN ARRAY ARRAY['anon', 'api_reader'] LOOP
      IF has_table_privilege(r, t, 'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')
         OR has_any_column_privilege(r, t, 'SELECT,INSERT,UPDATE,REFERENCES') THEN
        bad := bad || format('%s has privileges on %s', r, t);
      END IF;
    END LOOP;
    IF has_table_privilege('authenticated', t, 'INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')
       OR (t = 'public.api_tiers' AND has_table_privilege('authenticated', t, 'SELECT')) THEN
      bad := bad || format('authenticated has more than SELECT-own on %s', t);
    END IF;
  END LOOP;
  IF EXISTS (SELECT 1 FROM pg_class WHERE relnamespace = 'public'::regnamespace AND relkind = 'v'
               AND relname LIKE 'api\_v1\_%' AND pg_get_userbyid(relowner) <> 'api_view_owner') THEN
    bad := bad || 'api_v1_* view not owned by api_view_owner'::text;
  END IF;
  IF cardinality(bad) > 0 THEN
    RAISE EXCEPTION 'least-privilege audit FAILED: %', array_to_string(bad, '; ');
  END IF;
  RAISE NOTICE 'least-privilege audit OK';
END
$audit$;
