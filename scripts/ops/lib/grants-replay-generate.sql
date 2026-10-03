-- Generates the body of a verbatim ownership + privilege replay from the
-- connected (source) database. ONE read-only SELECT (no temp objects), so
-- capture-grants.sh runs it with default_transaction_read_only=on.
-- search_path=pg_catalog (set by the caller) makes every regclass /
-- regprocedure / policy expression print schema-qualified.
--
-- Scope (keep in sync with verify-staging-parity-deep.sh):
--   object schemas  public, private      owners + relation/sequence/routine/
--                                        type ACLs + column ACLs
--   schema ACLs     public, private, storage
--   default privs   per-schema rows in the object schemas + global rows of
--                   every role that owns an in-scope object
--   memberships     any membership with a non-platform role on either side,
--                   plus pgsodium_keyiduser -> postgres (api_vault_permissions)
--   policies        storage schema only (public policies ride the schema dump
--                   and are already compared by the deep gate)
-- Extension member objects are skipped (the extension owns their ACLs).
-- ACLs replay as the EFFECTIVE ACL (NULL -> acldefault), so the target ends up
-- with exactly the source's grantee/privilege set.
--
-- Output: one statement per row, ordered by (section, object, step).
-- Target-side helpers (pg_temp.reset_*, ensure_*) come from
-- grants-replay-prelude.sql.

WITH
obj_nsp AS (
  SELECT oid, nspname FROM pg_namespace WHERE nspname IN ('public', 'private')
),
acl_nsp AS (
  SELECT oid, nspname, nspowner, coalesce(nspacl, acldefault('n', nspowner)) AS acl
    FROM pg_namespace WHERE nspname IN ('public', 'private', 'storage')
),
rels AS (
  SELECT c.oid, c.relkind, c.relowner, c.oid::regclass::text AS qname,
         coalesce(c.relacl, acldefault(CASE WHEN c.relkind = 'S' THEN 's' ELSE 'r' END::"char", c.relowner)) AS acl,
         CASE c.relkind WHEN 'S' THEN 'SEQUENCE' WHEN 'v' THEN 'VIEW' WHEN 'm' THEN 'MATERIALIZED VIEW'
                        WHEN 'f' THEN 'FOREIGN TABLE' ELSE 'TABLE' END AS alter_kw,
         CASE WHEN c.relkind = 'S' THEN 'SEQUENCE' ELSE 'TABLE' END AS grant_kw,
         -- Sequences owned by a column follow their table's owner (ALTER would error).
         (c.relkind = 'S' AND EXISTS (
            SELECT 1 FROM pg_depend d
             WHERE d.classid = 'pg_class'::regclass AND d.objid = c.oid
               AND d.refclassid = 'pg_class'::regclass AND d.deptype IN ('a', 'i'))) AS owned_seq
    FROM pg_class c
   WHERE c.relnamespace IN (SELECT oid FROM obj_nsp)
     AND c.relkind IN ('r', 'p', 'v', 'm', 'f', 'S')
     AND NOT EXISTS (SELECT 1 FROM pg_depend d WHERE d.classid = 'pg_class'::regclass AND d.objid = c.oid AND d.deptype = 'e')
),
routines AS (
  SELECT p.oid, p.prokind, p.proowner, p.oid::regprocedure::text AS qname,
         coalesce(p.proacl, acldefault('f', p.proowner)) AS acl
    FROM pg_proc p
   WHERE p.pronamespace IN (SELECT oid FROM obj_nsp)
     AND NOT EXISTS (SELECT 1 FROM pg_depend d WHERE d.classid = 'pg_proc'::regclass AND d.objid = p.oid AND d.deptype = 'e')
),
types AS (
  SELECT t.oid, t.typtype, t.typowner, t.oid::regtype::text AS qname,
         coalesce(t.typacl, acldefault('T', t.typowner)) AS acl
    FROM pg_type t
   WHERE t.typnamespace IN (SELECT oid FROM obj_nsp)
     AND t.typtype IN ('e', 'd', 'r', 'c')
     AND (t.typtype <> 'c' OR (SELECT relkind FROM pg_class WHERE oid = t.typrelid) = 'c')
     AND NOT EXISTS (SELECT 1 FROM pg_depend d WHERE d.classid = 'pg_type'::regclass AND d.objid = t.oid AND d.deptype = 'e')
),
col_acls AS (
  SELECT r.qname, at.attnum, at.attname, a.grantee, a.privilege_type, a.is_grantable
    FROM rels r
    JOIN pg_attribute at ON at.attrelid = r.oid AND at.attnum > 0 AND NOT at.attisdropped AND at.attacl IS NOT NULL,
         aclexplode(at.attacl) a
),
defacl_roles AS (
  SELECT DISTINCT pg_get_userbyid(o) AS rolname FROM (
    SELECT relowner FROM rels UNION SELECT proowner FROM routines UNION SELECT typowner FROM types
    UNION SELECT nspowner FROM pg_namespace WHERE oid IN (SELECT oid FROM obj_nsp)
  ) s(o)
  WHERE pg_get_userbyid(o) NOT LIKE 'pg\_%'  -- predefined roles (pg_database_owner) never create objects
),
defacls AS (
  -- per-schema rows (additive to the global defaults)
  SELECT pg_get_userbyid(d.defaclrole) AS rolname, n.nspname, d.defaclobjtype AS objtype, d.defaclacl AS acl
    FROM pg_default_acl d JOIN obj_nsp n ON n.oid = d.defaclnamespace
  UNION ALL
  -- global effective rows (absent row = hardwired default)
  SELECT r.rolname, NULL, t.objtype,
         coalesce((SELECT d.defaclacl FROM pg_default_acl d
                    WHERE d.defaclnamespace = 0 AND d.defaclrole = r.rolname::regrole AND d.defaclobjtype = t.objtype),
                  acldefault(CASE t.objtype WHEN 'S' THEN 's' ELSE t.objtype END, r.rolname::regrole))
    FROM defacl_roles r
   CROSS JOIN (VALUES ('r'::"char"), ('S'), ('f'), ('T'), ('n')) t(objtype)
),
roles_flagged AS (
  SELECT oid, rolname, rolcanlogin,
         (rolname ~ '^(pg_|supabase|pgsodium)'
          OR rolname IN ('postgres', 'anon', 'authenticated', 'service_role', 'authenticator',
                         'dashboard_user', 'pgbouncer', 'cli_login_postgres')) AS platform
    FROM pg_roles
),
memberships AS (
  SELECT r.rolname AS role_name, m2.rolname AS member_name, bool_or(m.admin_option) AS admin_option
    FROM pg_auth_members m
    JOIN roles_flagged r ON r.oid = m.roleid
    JOIN roles_flagged m2 ON m2.oid = m.member
   WHERE NOT r.platform OR NOT m2.platform
      OR (r.rolname = 'pgsodium_keyiduser' AND m2.rolname = 'postgres')
   GROUP BY 1, 2
),
storage_policies AS (
  SELECT * FROM pg_policies WHERE schemaname = 'storage'
),
-- Every role the replay references (must exist on the target).
needed_roles AS (
  SELECT DISTINCT r FROM (
    SELECT pg_get_userbyid(relowner) FROM rels
    UNION SELECT pg_get_userbyid(proowner) FROM routines
    UNION SELECT pg_get_userbyid(typowner) FROM types
    UNION SELECT pg_get_userbyid(nspowner) FROM acl_nsp
    UNION SELECT pg_get_userbyid(a.grantee) FROM rels, aclexplode(acl) a WHERE a.grantee <> 0
    UNION SELECT pg_get_userbyid(a.grantee) FROM routines, aclexplode(acl) a WHERE a.grantee <> 0
    UNION SELECT pg_get_userbyid(a.grantee) FROM types, aclexplode(acl) a WHERE a.grantee <> 0
    UNION SELECT pg_get_userbyid(a.grantee) FROM acl_nsp, aclexplode(acl) a WHERE a.grantee <> 0
    UNION SELECT pg_get_userbyid(grantee) FROM col_acls WHERE grantee <> 0
    UNION SELECT rolname FROM defacls
    UNION SELECT pg_get_userbyid(a.grantee) FROM defacls, aclexplode(acl) a WHERE a.grantee <> 0
    UNION SELECT r FROM storage_policies, unnest(roles) r WHERE r <> 'public'
  ) s(r)
),
stmts(sec, k, ord, stmt) AS (
  -- 1. header
  SELECT 1, '', 0, format($h$-- Generated section: source PostgreSQL %s, captured %s UTC.$h$,
                          current_setting('server_version'), to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD HH24:MI:SS'))
  -- 2. roles + memberships
  UNION ALL SELECT 2, '', 0, '-- 2. Roles + memberships'
  UNION ALL
  SELECT 2, '', 1, format('SELECT pg_temp.ensure_custom_role(%L, %L);', rf.rolname, rf.rolcanlogin)
    FROM roles_flagged rf
   WHERE NOT rf.platform
     AND rf.rolname IN (SELECT r FROM needed_roles UNION SELECT role_name FROM memberships UNION SELECT member_name FROM memberships)
  UNION ALL
  SELECT 2, '', 2, format('SELECT pg_temp.require_roles(ARRAY[%s]::text[]);', string_agg(quote_literal(r), ', ' ORDER BY r))
    FROM needed_roles
  UNION ALL
  SELECT 2, '', 3,
         format('SELECT pg_temp.ensure_membership(%L, %L, %L);', role_name, member_name, admin_option)
    FROM memberships
  -- 3. owners
  UNION ALL SELECT 3, '', 0, '-- 3. Owners'
  UNION ALL
  SELECT 3, 'a' || nspname, 1, format('ALTER SCHEMA %I OWNER TO %I;', nspname, pg_get_userbyid(nspowner)) FROM acl_nsp
  UNION ALL
  SELECT 3, 'b' || qname, 1, format('ALTER %s %s OWNER TO %I;', CASE WHEN typtype = 'd' THEN 'DOMAIN' ELSE 'TYPE' END,
                                    qname, pg_get_userbyid(typowner)) FROM types
  UNION ALL
  SELECT 3, CASE WHEN relkind = 'S' THEN 'd' ELSE 'c' END || qname, 1,
         format('ALTER %s %s OWNER TO %I;', alter_kw, qname, pg_get_userbyid(relowner)) FROM rels WHERE NOT owned_seq
  UNION ALL
  SELECT 3, 'e' || qname, 1, format('ALTER %s %s OWNER TO %I;', CASE WHEN prokind = 'a' THEN 'AGGREGATE' ELSE 'ROUTINE' END,
                                    qname, pg_get_userbyid(proowner)) FROM routines
  -- 4. privileges: reset each object to nothing, then grant the source's effective ACL
  UNION ALL SELECT 4, '', 0, '-- 4. Privileges (reset to nothing, then grant the source''s effective ACL)'
  UNION ALL
  SELECT 4, 'a' || nspname, 1, format('SELECT pg_temp.reset_schema(%L);', nspname) FROM acl_nsp
  UNION ALL
  SELECT 4, 'a' || nspname, 2,
         format('GRANT %s ON SCHEMA %I TO %s%s;', string_agg(a.privilege_type, ', ' ORDER BY a.privilege_type), nspname,
                CASE WHEN a.grantee = 0 THEN 'PUBLIC' ELSE quote_ident(pg_get_userbyid(a.grantee)) END,
                CASE WHEN a.is_grantable THEN ' WITH GRANT OPTION' ELSE '' END)
    FROM acl_nsp, aclexplode(acl) a GROUP BY nspname, a.grantee, a.is_grantable
  UNION ALL
  SELECT 4, 'b' || qname, 1, format('SELECT pg_temp.reset_type(%L);', qname) FROM types
  UNION ALL
  SELECT 4, 'b' || qname, 2,
         format('GRANT %s ON TYPE %s TO %s%s;', string_agg(a.privilege_type, ', ' ORDER BY a.privilege_type), qname,
                CASE WHEN a.grantee = 0 THEN 'PUBLIC' ELSE quote_ident(pg_get_userbyid(a.grantee)) END,
                CASE WHEN a.is_grantable THEN ' WITH GRANT OPTION' ELSE '' END)
    FROM types, aclexplode(acl) a GROUP BY qname, a.grantee, a.is_grantable
  UNION ALL
  SELECT 4, 'c' || qname, 1, format('SELECT pg_temp.reset_rel(%L);', qname) FROM rels
  UNION ALL
  SELECT 4, 'c' || qname, 2,
         format('GRANT %s ON %s %s TO %s%s;', string_agg(a.privilege_type, ', ' ORDER BY a.privilege_type), grant_kw, qname,
                CASE WHEN a.grantee = 0 THEN 'PUBLIC' ELSE quote_ident(pg_get_userbyid(a.grantee)) END,
                CASE WHEN a.is_grantable THEN ' WITH GRANT OPTION' ELSE '' END)
    FROM rels, aclexplode(acl) a GROUP BY qname, grant_kw, a.grantee, a.is_grantable
  UNION ALL
  SELECT 4, 'c' || qname, 3,
         format('GRANT %s (%s) ON TABLE %s TO %s%s;', privilege_type, string_agg(quote_ident(attname), ', ' ORDER BY attnum), qname,
                CASE WHEN grantee = 0 THEN 'PUBLIC' ELSE quote_ident(pg_get_userbyid(grantee)) END,
                CASE WHEN is_grantable THEN ' WITH GRANT OPTION' ELSE '' END)
    FROM col_acls GROUP BY qname, grantee, privilege_type, is_grantable
  UNION ALL
  SELECT 4, 'd' || qname, 1, format('SELECT pg_temp.reset_routine(%L);', qname) FROM routines
  UNION ALL
  SELECT 4, 'd' || qname, 2,
         format('GRANT %s ON ROUTINE %s TO %s%s;', string_agg(a.privilege_type, ', ' ORDER BY a.privilege_type), qname,
                CASE WHEN a.grantee = 0 THEN 'PUBLIC' ELSE quote_ident(pg_get_userbyid(a.grantee)) END,
                CASE WHEN a.is_grantable THEN ' WITH GRANT OPTION' ELSE '' END)
    FROM routines, aclexplode(acl) a GROUP BY qname, a.grantee, a.is_grantable
  -- 5. default privileges
  UNION ALL SELECT 5, '', 0, '-- 5. Default privileges'
  UNION ALL
  SELECT 5, '', 1, format('SELECT pg_temp.reset_default_acls(ARRAY[%s]::text[], ARRAY[%s]::text[]);',
                          coalesce((SELECT string_agg(quote_literal(rolname), ', ' ORDER BY rolname) FROM defacl_roles), ''),
                          (SELECT string_agg(quote_literal(nspname), ', ' ORDER BY nspname) FROM obj_nsp))
  UNION ALL
  SELECT 5, coalesce(d.nspname, '') || '/' || d.rolname || '/' || d.objtype::text, 2,
         format('ALTER DEFAULT PRIVILEGES FOR ROLE %I%s GRANT %s ON %s TO %s%s;',
                d.rolname, CASE WHEN d.nspname IS NULL THEN '' ELSE format(' IN SCHEMA %I', d.nspname) END,
                string_agg(a.privilege_type, ', ' ORDER BY a.privilege_type),
                CASE d.objtype WHEN 'r' THEN 'TABLES' WHEN 'S' THEN 'SEQUENCES' WHEN 'f' THEN 'FUNCTIONS'
                               WHEN 'T' THEN 'TYPES' WHEN 'n' THEN 'SCHEMAS' END,
                CASE WHEN a.grantee = 0 THEN 'PUBLIC' ELSE quote_ident(pg_get_userbyid(a.grantee)) END,
                CASE WHEN a.is_grantable THEN ' WITH GRANT OPTION' ELSE '' END)
    FROM defacls d, aclexplode(d.acl) a GROUP BY d.rolname, d.nspname, d.objtype, a.grantee, a.is_grantable
  -- 6. storage policies
  UNION ALL SELECT 6, '', 0, '-- 6. Storage policies (drop all on target, recreate the source set)'
  UNION ALL SELECT 6, '', 1, 'SELECT pg_temp.drop_policies(''storage'');'
  UNION ALL
  SELECT 6, tablename || '/' || policyname, 2,
         format('CREATE POLICY %I ON %I.%I AS %s FOR %s TO %s%s%s;',
                policyname, schemaname, tablename, permissive, cmd,
                (SELECT string_agg(CASE WHEN r = 'public' THEN 'PUBLIC' ELSE quote_ident(r) END, ', ' ORDER BY r) FROM unnest(roles) r),
                CASE WHEN qual IS NULL THEN '' ELSE ' USING (' || qual || ')' END,
                CASE WHEN with_check IS NULL THEN '' ELSE ' WITH CHECK (' || with_check || ')' END)
    FROM storage_policies
)
SELECT stmt FROM stmts ORDER BY sec, k COLLATE "C", ord, stmt COLLATE "C";
