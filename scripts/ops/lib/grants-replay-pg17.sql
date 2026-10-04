-- PG17+ targets: MAINTAIN (new in PG17) is part of ALL on relations. A PG15
-- source writes ALL as the full arwdDxt set, which pg_dump / pg_upgrade restore
-- as arwdDxtm; replaying the letters verbatim drops MAINTAIN, even from the
-- owner, so REFRESH MATERIALIZED VIEW (refresh_module_discovery_snapshot) and
-- VACUUM/ANALYZE by the owner fail. Add MAINTAIN wherever a grantee holds the
-- full PG15 set, on in-scope relations and table default privileges.
-- No-op on PG15/16 targets and when MAINTAIN is already present.
DO $pg17$
DECLARE
  full_set CONSTANT text[] := ARRAY['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'TRUNCATE', 'REFERENCES', 'TRIGGER'];
  r record;
BEGIN
  IF current_setting('server_version_num')::int < 170000 THEN RETURN; END IF;

  FOR r IN
    SELECT c.oid::regclass::text AS rel, a.grantee, a.is_grantable
      FROM pg_class c, aclexplode(c.relacl) a
     WHERE c.relnamespace IN ('public'::regnamespace, 'private'::regnamespace)
       AND c.relkind IN ('r', 'p', 'v', 'm', 'f')
       AND NOT EXISTS (SELECT 1 FROM pg_depend d WHERE d.classid = 'pg_class'::regclass AND d.objid = c.oid AND d.deptype = 'e')
     GROUP BY 1, 2, 3
    HAVING array_agg(a.privilege_type::text) @> full_set
       AND NOT bool_or(a.privilege_type = 'MAINTAIN')
  LOOP
    EXECUTE format('GRANT MAINTAIN ON TABLE %s TO %s%s', r.rel, pg_temp.grantee_sql(r.grantee),
                   CASE WHEN r.is_grantable THEN ' WITH GRANT OPTION' ELSE '' END);
  END LOOP;

  FOR r IN
    SELECT pg_get_userbyid(d.defaclrole) AS rolname, d.defaclnamespace::regnamespace::text AS nsp,
           a.grantee, a.is_grantable
      FROM pg_default_acl d, aclexplode(d.defaclacl) a
     WHERE d.defaclobjtype = 'r'
       AND (d.defaclnamespace IN ('public'::regnamespace, 'private'::regnamespace) OR d.defaclnamespace = 0)
     GROUP BY 1, 2, 3, 4, d.defaclnamespace
    HAVING array_agg(a.privilege_type::text) @> full_set
       AND NOT bool_or(a.privilege_type = 'MAINTAIN')
  LOOP
    EXECUTE format('ALTER DEFAULT PRIVILEGES FOR ROLE %I%s GRANT MAINTAIN ON TABLES TO %s%s', r.rolname,
                   CASE WHEN r.nsp = '-' THEN '' ELSE format(' IN SCHEMA %s', r.nsp) END,
                   pg_temp.grantee_sql(r.grantee),
                   CASE WHEN r.is_grantable THEN ' WITH GRANT OPTION' ELSE '' END);
  END LOOP;
END
$pg17$;
