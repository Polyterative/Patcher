-- Foreign-key orphan proof. Loads under session_replication_role = replica skip
-- every RI trigger, so nothing else would notice a dangling reference.
-- Checks EVERY foreign key whose referencing or referenced table lives in
-- public or auth (multi-column keys, MATCH SIMPLE: rows with a NULL key column
-- are exempt, as Postgres itself would treat them). Read-only; RAISEs (and so
-- aborts the surrounding transaction) when any orphan exists.
DO $fkcheck$
DECLARE
  fk record;
  orphans bigint;
  bad text[] := '{}';
  checked int := 0;
BEGIN
  FOR fk IN
    SELECT c.conname, c.conrelid::regclass AS child, c.confrelid::regclass AS parent,
           (SELECT string_agg(format('c.%I', a.attname), ', ' ORDER BY k.ord)
              FROM unnest(c.conkey) WITH ORDINALITY k(attnum, ord)
              JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = k.attnum) AS child_cols,
           (SELECT string_agg(format('p.%I', a.attname), ', ' ORDER BY k.ord)
              FROM unnest(c.confkey) WITH ORDINALITY k(attnum, ord)
              JOIN pg_attribute a ON a.attrelid = c.confrelid AND a.attnum = k.attnum) AS parent_cols,
           (SELECT string_agg(format('c.%I IS NOT NULL', a.attname), ' AND ')
              FROM unnest(c.conkey) k(attnum)
              JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = k.attnum) AS not_null
      FROM pg_constraint c
     WHERE c.contype = 'f'
       AND (c.connamespace IN ('public'::regnamespace, 'auth'::regnamespace)
            OR (SELECT relnamespace FROM pg_class WHERE oid = c.confrelid)
               IN ('public'::regnamespace, 'auth'::regnamespace))
     ORDER BY 2, 1
  LOOP
    EXECUTE format('SELECT count(*) FROM %s c WHERE %s AND NOT EXISTS (SELECT 1 FROM %s p WHERE (%s) = (%s))',
                   fk.child, fk.not_null, fk.parent, fk.child_cols, fk.parent_cols)
      INTO orphans;
    checked := checked + 1;
    IF orphans > 0 THEN
      bad := bad || format('%s.%s -> %s: %s orphan row(s)', fk.child, fk.conname, fk.parent, orphans);
    END IF;
  END LOOP;
  IF cardinality(bad) > 0 THEN
    RAISE EXCEPTION 'FK orphan proof FAILED: %', array_to_string(bad, '; ');
  END IF;
  RAISE NOTICE 'FK orphan proof OK (% foreign keys checked)', checked;
END
$fkcheck$;
