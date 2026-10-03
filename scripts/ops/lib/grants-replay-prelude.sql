-- Target-side prelude of a grants replay (concatenated by capture-grants.sh
-- ahead of the generated statements). Preflight refuses anything that is not
-- the self-host or not a superuser session; helpers live in pg_temp and vanish
-- with the session.
SET search_path = pg_catalog;
SET client_min_messages = notice;

DO $pre$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'patcher_selfhost_marker') THEN
    RAISE EXCEPTION 'target lacks patcher_selfhost_marker: not proven to be the self-host, refusing';
  END IF;
  IF NOT (SELECT rolsuper FROM pg_roles WHERE rolname = current_user) THEN
    RAISE EXCEPTION 'replay must run as a superuser (self-host: supabase_admin), not %', current_user;
  END IF;
END
$pre$;

CREATE FUNCTION pg_temp.grantee_sql(oid) RETURNS text LANGUAGE sql STABLE AS $f$
  SELECT CASE WHEN $1 = 0 THEN 'PUBLIC' ELSE quote_ident(pg_get_userbyid($1)) END
$f$;

CREATE FUNCTION pg_temp.require_roles(want text[]) RETURNS void LANGUAGE plpgsql AS $f$
DECLARE missing text;
BEGIN
  SELECT string_agg(r, ', ' ORDER BY r) INTO missing
    FROM unnest(want) r WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = r);
  IF missing IS NOT NULL THEN
    RAISE EXCEPTION 'roles missing on target (create them first): %', missing;
  END IF;
END
$f$;

CREATE FUNCTION pg_temp.ensure_custom_role(r text, src_login boolean) RETURNS void LANGUAGE plpgsql AS $f$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = r) THEN
    -- Never LOGIN/password here: credentials are a separately approved step.
    EXECUTE format('CREATE ROLE %I NOLOGIN', r);
    RAISE WARNING 'created missing role % (NOLOGIN)%', r,
      CASE WHEN src_login THEN ' — source role can LOGIN; provision credentials separately' ELSE '' END;
  END IF;
END
$f$;

CREATE FUNCTION pg_temp.ensure_membership(role_name text, member_name text, admin boolean) RETURNS void LANGUAGE plpgsql AS $f$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = role_name)
     OR NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = member_name) THEN
    RAISE WARNING 'skipped membership % -> %: role missing on target', role_name, member_name;
    RETURN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_auth_members m
                  WHERE m.roleid = role_name::regrole AND m.member = member_name::regrole
                    AND (m.admin_option OR NOT admin)) THEN
    EXECUTE format('GRANT %I TO %I%s', role_name, member_name, CASE WHEN admin THEN ' WITH ADMIN OPTION' ELSE '' END);
  END IF;
END
$f$;

-- Revoke every privilege currently held on a relation (incl. column grants).
CREATE FUNCTION pg_temp.reset_rel(rel regclass) RETURNS void LANGUAGE plpgsql AS $f$
DECLARE c pg_class; kw text; g oid; cols text;
BEGIN
  SELECT * INTO c FROM pg_class WHERE oid = rel;
  kw := CASE WHEN c.relkind = 'S' THEN 'SEQUENCE' ELSE 'TABLE' END;
  FOR g IN SELECT DISTINCT a.grantee FROM aclexplode(coalesce(c.relacl,
             acldefault(CASE WHEN c.relkind = 'S' THEN 's' ELSE 'r' END::"char", c.relowner))) a LOOP
    EXECUTE format('REVOKE ALL ON %s %s FROM %s CASCADE', kw, rel, pg_temp.grantee_sql(g));
  END LOOP;
  SELECT string_agg(quote_ident(attname), ', ') INTO cols
    FROM pg_attribute WHERE attrelid = rel AND attnum > 0 AND NOT attisdropped;
  FOR g IN SELECT DISTINCT a.grantee FROM pg_attribute at, aclexplode(at.attacl) a
            WHERE at.attrelid = rel AND at.attacl IS NOT NULL LOOP
    EXECUTE format('REVOKE ALL (%s) ON TABLE %s FROM %s CASCADE', cols, rel, pg_temp.grantee_sql(g));
  END LOOP;
END
$f$;

CREATE FUNCTION pg_temp.reset_routine(fn regprocedure) RETURNS void LANGUAGE plpgsql AS $f$
DECLARE g oid;
BEGIN
  FOR g IN SELECT DISTINCT a.grantee FROM pg_proc p, aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) a
            WHERE p.oid = fn LOOP
    EXECUTE format('REVOKE ALL ON ROUTINE %s FROM %s CASCADE', fn, pg_temp.grantee_sql(g));
  END LOOP;
END
$f$;

CREATE FUNCTION pg_temp.reset_type(typ regtype) RETURNS void LANGUAGE plpgsql AS $f$
DECLARE g oid;
BEGIN
  FOR g IN SELECT DISTINCT a.grantee FROM pg_type t, aclexplode(coalesce(t.typacl, acldefault('T', t.typowner))) a
            WHERE t.oid = typ LOOP
    EXECUTE format('REVOKE ALL ON TYPE %s FROM %s CASCADE', typ, pg_temp.grantee_sql(g));
  END LOOP;
END
$f$;

CREATE FUNCTION pg_temp.reset_schema(nsp text) RETURNS void LANGUAGE plpgsql AS $f$
DECLARE g oid;
BEGIN
  FOR g IN SELECT DISTINCT a.grantee FROM pg_namespace n, aclexplode(coalesce(n.nspacl, acldefault('n', n.nspowner))) a
            WHERE n.nspname = nsp LOOP
    EXECUTE format('REVOKE ALL ON SCHEMA %I FROM %s CASCADE', nsp, pg_temp.grantee_sql(g));
  END LOOP;
END
$f$;

CREATE FUNCTION pg_temp.defacl_word("char") RETURNS text LANGUAGE sql IMMUTABLE AS $f$
  SELECT CASE $1 WHEN 'r' THEN 'TABLES' WHEN 'S' THEN 'SEQUENCES' WHEN 'f' THEN 'FUNCTIONS'
                 WHEN 'T' THEN 'TYPES' WHEN 'n' THEN 'SCHEMAS' END
$f$;

-- Clear default privileges: all per-schema rows in the given schemas, and the
-- global effective defaults of the given roles (absent row = hardwired default).
CREATE FUNCTION pg_temp.reset_default_acls(roles text[], schemas text[]) RETURNS void LANGUAGE plpgsql AS $f$
DECLARE d record; g oid; r text; t "char"; eff aclitem[];
BEGIN
  FOR d IN SELECT pg_get_userbyid(x.defaclrole) AS rolname, n.nspname, x.defaclobjtype, x.defaclacl
             FROM pg_default_acl x JOIN pg_namespace n ON n.oid = x.defaclnamespace
            WHERE n.nspname = ANY (schemas) LOOP
    FOR g IN SELECT DISTINCT a.grantee FROM aclexplode(d.defaclacl) a LOOP
      EXECUTE format('ALTER DEFAULT PRIVILEGES FOR ROLE %I IN SCHEMA %I REVOKE ALL ON %s FROM %s CASCADE',
                     d.rolname, d.nspname, pg_temp.defacl_word(d.defaclobjtype), pg_temp.grantee_sql(g));
    END LOOP;
  END LOOP;
  FOREACH r IN ARRAY roles LOOP
    FOREACH t IN ARRAY ARRAY['r', 'S', 'f', 'T', 'n']::"char"[] LOOP
      SELECT coalesce((SELECT x.defaclacl FROM pg_default_acl x
                        WHERE x.defaclnamespace = 0 AND x.defaclrole = r::regrole AND x.defaclobjtype = t),
                      acldefault(CASE t WHEN 'S' THEN 's' ELSE t END, r::regrole)) INTO eff;
      FOR g IN SELECT DISTINCT a.grantee FROM aclexplode(eff) a LOOP
        EXECUTE format('ALTER DEFAULT PRIVILEGES FOR ROLE %I REVOKE ALL ON %s FROM %s CASCADE',
                       r, pg_temp.defacl_word(t), pg_temp.grantee_sql(g));
      END LOOP;
    END LOOP;
  END LOOP;
END
$f$;

-- Global default privileges the source left at the hardwired default: grant the
-- TARGET's acldefault() back (after reset_default_acls emptied it). Postgres drops
-- a global pg_default_acl row once it equals the default, so the target ends up
-- with no row — the same "absent" state as the source, whatever the major version.
CREATE FUNCTION pg_temp.restore_hardwired_default_acl(r text, t "char") RETURNS void LANGUAGE plpgsql AS $f$
DECLARE a record;
BEGIN
  FOR a IN SELECT grantee, is_grantable, string_agg(privilege_type, ', ') AS privs
             FROM aclexplode(acldefault(CASE t WHEN 'S' THEN 's' ELSE t END, r::regrole))
            GROUP BY grantee, is_grantable LOOP
    EXECUTE format('ALTER DEFAULT PRIVILEGES FOR ROLE %I GRANT %s ON %s TO %s%s', r, a.privs,
                   pg_temp.defacl_word(t), pg_temp.grantee_sql(a.grantee),
                   CASE WHEN a.is_grantable THEN ' WITH GRANT OPTION' ELSE '' END);
  END LOOP;
  IF EXISTS (SELECT 1 FROM pg_default_acl WHERE defaclnamespace = 0 AND defaclrole = r::regrole AND defaclobjtype = t) THEN
    RAISE EXCEPTION 'global default privileges of % on % did not return to the hardwired default', r, pg_temp.defacl_word(t);
  END IF;
END
$f$;

CREATE FUNCTION pg_temp.drop_policies(nsp text) RETURNS void LANGUAGE plpgsql AS $f$
DECLARE p record;
BEGIN
  FOR p IN SELECT schemaname, tablename, policyname FROM pg_policies WHERE schemaname = nsp LOOP
    EXECUTE format('DROP POLICY %I ON %I.%I', p.policyname, p.schemaname, p.tablename);
  END LOOP;
END
$f$;
