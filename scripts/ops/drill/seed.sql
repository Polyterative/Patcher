-- Synthetic drill dataset for the self-host rollback harness.
--
-- Load AFTER bootstrap-stubs.sql + a hosted `public` schema dump, into a fresh
-- (empty) database, as a normal session (triggers active, no replica mode):
--   psql "$URL" -X -v ON_ERROR_STOP=1 -f scripts/ops/drill/seed.sql
--
-- Fully synthetic: no real people, all emails are @example.test.
-- Deterministic: fixed uuids, fixed timestamps, explicit public_ids. Identity /
-- serial ids are left to default; on a fresh schema they start at 1, and the
-- literal ids referenced below rely on that (guarded at the top).
-- Several triggers stamp now() into parent rows (racks/patches/collections
-- "updated", reaction_counts/shipping_addresses "updated_at"); the final block
-- resets those to fixed values so two clusters seeded at different times hash
-- identically.

\set ON_ERROR_STOP 1
BEGIN;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.modules) OR EXISTS (SELECT 1 FROM auth.users)
     OR (SELECT is_called FROM public."EuroModules_id_seq") THEN
    RAISE EXCEPTION 'seed.sql expects an empty, freshly restored schema';
  END IF;
END $$;

-- ---------------------------------------------------------------- auth users
INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
SELECT '00000000-0000-0000-0000-000000000000',
       ('00000000-0000-4000-8000-00000000000' || i)::uuid,
       'authenticated', 'authenticated',
       'drill-user' || i || '@example.test',
       '$2a$10$drilldrilldrilldrilldrilldrilldrilldrilldrilldrillxx',
       timestamptz '2026-01-01 00:00:00+00' + (i || ' hours')::interval,
       '{"provider":"email","providers":["email"]}'::jsonb,
       jsonb_build_object('username', 'drill_user_' || i),
       timestamptz '2026-01-01 00:00:00+00' + (i || ' hours')::interval,
       timestamptz '2026-01-01 00:00:00+00' + (i || ' hours')::interval
FROM generate_series(1, 5) AS i ORDER BY i;

INSERT INTO auth.identities (provider_id, user_id, identity_data, provider,
  last_sign_in_at, created_at, updated_at, id)
SELECT ('00000000-0000-4000-8000-00000000000' || i),
       ('00000000-0000-4000-8000-00000000000' || i)::uuid,
       jsonb_build_object('sub', '00000000-0000-4000-8000-00000000000' || i,
                          'email', 'Drill-User' || i || '@example.test',
                          'email_verified', true),
       'email',
       timestamptz '2026-01-02 00:00:00+00' + (i || ' hours')::interval,
       timestamptz '2026-01-01 00:00:00+00' + (i || ' hours')::interval,
       timestamptz '2026-01-01 00:00:00+00' + (i || ' hours')::interval,
       ('10000000-0000-4000-8000-00000000000' || i)::uuid
FROM generate_series(1, 5) AS i ORDER BY i;

INSERT INTO public.profiles (id, updated_at, username, avatar_url, website, confirmed, email, created_at, public)
SELECT ('00000000-0000-4000-8000-00000000000' || i)::uuid,
       timestamptz '2026-01-01 00:00:00+00' + (i || ' hours')::interval,
       'drill_user_' || i,
       NULL,
       CASE WHEN i = 1 THEN 'https://drill.example.test' END,
       true,
       'drill-user' || i || '@example.test',
       timestamp '2026-01-01 00:00:00' + (i || ' hours')::interval,
       i <> 5
FROM generate_series(1, 5) AS i ORDER BY i;

-- ---------------------------------------------------------------- catalogue
INSERT INTO public.standards (name) VALUES ('Eurorack'), ('Buchla');            -- ids 1,2
INSERT INTO public.tags (name, type) VALUES                                     -- ids 1..4
  ('Oscillator', 1), ('Filter', 1), ('Envelope', 1), ('Utility', 1);

INSERT INTO public.manufacturers (name, "websiteURL", logo, "adminUser", verified_at, verified_by, tagline, description, social_links)
VALUES                                                                           -- ids 1..3
  ('Drill Audio', 'https://drill-audio.example.test', NULL, NULL,
   '2026-01-05 00:00:00+00', '00000000-0000-4000-8000-000000000001',
   'Synthetic modules for drills', 'Fictional manufacturer.', '{"site":"https://drill-audio.example.test"}'),
  ('Example Instruments', 'https://instruments.example.test', NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  ('Synthetic Circuits', 'https://circuits.example.test', NULL, NULL, NULL, NULL, 'Not real', NULL, '{}');

INSERT INTO public.modules (name, "manufacturerId", created, updated, hp, "manualURL", public,
  "isComplete", "isDIY", standard, additional, switches, description, submitter, "isApproved",
  "powerPos12", "powerNeg12", "powerPos5", depth, weight, store_url)
SELECT 'Drill Module ' || lpad(i::text, 2, '0'),
       ((i - 1) % 3) + 1,
       timestamptz '2026-01-10 00:00:00+00' + (i || ' hours')::interval,
       timestamptz '2026-01-10 00:00:00+00' + (i || ' hours')::interval,
       (4 + (i % 5) * 2)::smallint,
       'https://manuals.example.test/module-' || i || '.pdf',
       i <> 11,
       i % 2 = 0,
       i = 9,
       CASE WHEN i = 12 THEN 2 ELSE 1 END,
       '{}'::json,
       '[]'::json,
       'Synthetic module number ' || i,
       '00000000-0000-4000-8000-000000000001',
       i <> 10,
       20 + i, 10 + i, CASE WHEN i % 4 = 0 THEN 5 END, 25 + i, 80 + i,
       NULL
FROM generate_series(1, 12) AS i ORDER BY i;                                     -- ids 1..12

-- Two ins + two outs per module: module m has ins/outs ids (2m-1, 2m).
INSERT INTO public.module_ins (name, min, max, moduleid, "isDCC", "isAudio", "isVOCT", "isApproved", authorid)
SELECT CASE WHEN j = 1 THEN 'V/Oct In' ELSE 'Audio In' END, -5, 5, m,
       false, j = 2, j = 1, true, '00000000-0000-4000-8000-000000000001'
FROM generate_series(1, 12) AS m, generate_series(1, 2) AS j ORDER BY m, j;
INSERT INTO public.module_outs (name, min, max, moduleid, "isDCC", "isAudio", "isVOCT", "isApproved", authorid)
SELECT CASE WHEN j = 1 THEN 'Main Out' ELSE 'Aux Out' END, -5, 5, m,
       j = 2, j = 1, false, true, '00000000-0000-4000-8000-000000000002'
FROM generate_series(1, 12) AS m, generate_series(1, 2) AS j ORDER BY m, j;

INSERT INTO public.module_panels (created, updated, color, filename, moduleid, "isApproved", description)
SELECT timestamp '2026-01-11 00:00:00' + (m || ' hours')::interval,
       timestamp '2026-01-11 00:00:00' + (m || ' hours')::interval,
       (m % 3)::smallint, 'drill/module-' || m || '-panel.png', m, true, 'Front panel'
FROM generate_series(1, 12) AS m ORDER BY m;                                     -- ids 1..12

INSERT INTO public.module_tags (moduleid, tagid)
SELECT m, ((m - 1) % 4) + 1 FROM generate_series(1, 12) AS m ORDER BY m;        -- ids 1..12

-- ---------------------------------------------------------------- price hub
INSERT INTO public.stores (slug, name, country_code, base_url, search_url_template, adapter_kind,
  currency_hint, active, price_tracking_enabled, rate_limit_per_day, created_at, updated_at)
VALUES
  ('drill-shop-eu', 'Drill Shop EU', 'DE', 'https://shop-eu.example.test',
   'https://shop-eu.example.test/search?q={q}', 'shopify_product_json', 'EUR', true, true, 50,
   '2026-01-15 00:00:00+00', '2026-01-15 00:00:00+00'),
  ('drill-shop-us', 'Drill Shop US', 'US', 'https://shop-us.example.test',
   NULL, 'woocommerce_store_api', 'USD', true, false, 20,
   '2026-01-15 00:00:00+00', '2026-01-15 00:00:00+00');                         -- ids 1,2

INSERT INTO public.module_store_listings (module_id, store_id, product_url, external_product_id,
  active, verification_status, last_checked_at, last_success_at, next_check_at, failure_count,
  created_at, updated_at, last_raw_meta)
SELECT m, s, 'https://shop-' || CASE s WHEN 1 THEN 'eu' ELSE 'us' END || '.example.test/p/module-' || m,
       's' || s || 'm' || m, true, CASE WHEN m = 1 THEN 'verified' ELSE 'candidate' END,
       '2026-02-01 00:00:00+00', '2026-02-01 00:00:00+00', '2026-02-02 00:00:00+00', 0,
       '2026-01-16 00:00:00+00', '2026-01-16 00:00:00+00', '{"seed":true}'
FROM (VALUES (1,1),(1,2),(1,3),(1,4),(2,1),(2,2)) AS v(s, m) ORDER BY s, m;    -- ids 1..6

INSERT INTO public.module_price_snapshots (listing_id, observed_at, price_amount_minor, currency,
  availability, source, raw_meta, created_at)
VALUES
  (1, '2026-02-01 00:00:00+00', 19900, 'EUR', 'in_stock', 'scraper', '{"v":1}', '2026-02-01 00:00:00+00'),
  (1, '2026-03-01 00:00:00+00', 18900, 'EUR', 'in_stock', 'scraper', '{"v":2}', '2026-03-01 00:00:00+00'),
  (2, '2026-02-01 00:00:00+00', NULL, NULL, 'out_of_stock', 'api', '{}', '2026-02-01 00:00:00+00'),
  (5, '2026-02-01 00:00:00+00', 21900, 'USD', 'preorder', 'manual', '{}', '2026-02-01 00:00:00+00');

-- ---------------------------------------------------------------- racks
INSERT INTO public.racks (name, created, updated, description, authorid, hp, rows, locked, public, image, public_id)
VALUES                                                                           -- ids 1..3
  ('Drill Rack One',   '2026-02-10 00:00:00', '2026-02-10 00:00:00', 'Main case', '00000000-0000-4000-8000-000000000001', 84, 2, false, true,  NULL, 'drillRack001'),
  ('Drill Rack Two',   '2026-02-11 00:00:00', '2026-02-11 00:00:00', NULL,        '00000000-0000-4000-8000-000000000002', 104, 3, false, true, NULL, 'drillRack002'),
  ('Drill Rack Three', '2026-02-12 00:00:00', '2026-02-12 00:00:00', 'Private',   '00000000-0000-4000-8000-000000000003', 42, 1, true, false,  NULL, 'drillRack003');

INSERT INTO public.rack_modules (rackid, moduleid, "row", "column", created, updated, selected_panel_id, orientation)
VALUES                                                                           -- ids 1..6
  (1, 1, 0, 0,  '2026-02-10 01:00:00', '2026-02-10 01:00:00', 1, 'normal'),
  (1, 2, 0, 10, '2026-02-10 01:00:00', '2026-02-10 01:00:00', NULL, 'normal'),
  (1, 3, 1, 0,  '2026-02-10 01:00:00', '2026-02-10 01:00:00', 3, 'rot180'),
  (2, 4, 0, 0,  '2026-02-11 01:00:00', '2026-02-11 01:00:00', 4, 'normal'),
  (2, 5, 0, 8,  '2026-02-11 01:00:00', '2026-02-11 01:00:00', NULL, 'normal'),
  (3, 6, 0, 0,  '2026-02-12 01:00:00', '2026-02-12 01:00:00', NULL, 'normal');

-- ---------------------------------------------------------------- patches
INSERT INTO public.patches (name, created, updated, description, authorid, public, tags, linked_rack_id, public_id, image)
VALUES                                                                           -- ids 1..3
  ('Drill Patch One',   '2026-03-01 00:00:00', '2026-03-01 00:00:00', 'Basic voice', '00000000-0000-4000-8000-000000000001', true,  '{bass,drill}', 1, 'drillPatch01', NULL),
  ('Drill Patch Two',   '2026-03-02 00:00:00', '2026-03-02 00:00:00', NULL,          '00000000-0000-4000-8000-000000000002', true,  '{}',           2, 'drillPatch02', NULL),
  ('Drill Patch Three', '2026-03-03 00:00:00', '2026-03-03 00:00:00', 'Private',     '00000000-0000-4000-8000-000000000003', false, '{ambient}',    NULL, 'drillPatch03', NULL);

INSERT INTO public.patch_module_instances (patch_id, module_id, instance_label)
VALUES (1, 1, 'VCO'), (1, 2, 'VCF'), (1, 3, 'VCA'),                             -- ids 1..3
       (2, 4, NULL), (2, 5, NULL),                                              -- ids 4,5
       (3, 6, 'A'), (3, 7, 'B');                                                -- ids 6,7

-- a = module_outs.id, b = module_ins.id (module m: 2m-1, 2m)
INSERT INTO public.patch_connections (patchid, a, b, notes, ordinal, instance_id_a, instance_id_b)
VALUES
  (1, 1,  3,  'osc to filter',  1, 1, 2),
  (1, 3,  5,  'filter to vca',  2, 2, 3),
  (1, 2,  6,  'aux mod',        3, 1, 3),
  (2, 7,  9,  NULL,             1, 4, 5),
  (3, 11, 13, 'drone',          1, 6, 7);

-- ---------------------------------------------------------------- collections
INSERT INTO public.module_collections (authorid, name, description, image, public, public_id, created, updated)
VALUES                                                                           -- ids 1,2
  ('00000000-0000-4000-8000-000000000001', 'Drill Favourites', 'Public list', NULL, true,  'drillColl001', '2026-03-10 00:00:00', '2026-03-10 00:00:00'),
  ('00000000-0000-4000-8000-000000000002', 'Drill Wishlist',   NULL,          NULL, false, 'drillColl002', '2026-03-11 00:00:00', '2026-03-11 00:00:00');

INSERT INTO public.module_collection_entries (collection_id, module_id, ordinal, note, created, updated)
VALUES                                                                           -- ids 1..5
  (1, 1, 1, 'first',  '2026-03-10 01:00:00', '2026-03-10 01:00:00'),
  (1, 2, 2, NULL,     '2026-03-10 01:00:00', '2026-03-10 01:00:00'),
  (1, 8, 3, NULL,     '2026-03-10 01:00:00', '2026-03-10 01:00:00'),
  (2, 4, 1, 'maybe',  '2026-03-11 01:00:00', '2026-03-11 01:00:00'),
  (2, 9, 2, NULL,     '2026-03-11 01:00:00', '2026-03-11 01:00:00');

-- ---------------------------------------------------------------- user collections
INSERT INTO public.user_modules (moduleid, profileid, updated, kind) VALUES
  (1, '00000000-0000-4000-8000-000000000001', '2026-04-01 00:00:00', 'HAS'),
  (2, '00000000-0000-4000-8000-000000000001', '2026-04-01 00:00:00', 'HAS'),
  (3, '00000000-0000-4000-8000-000000000001', '2026-04-01 00:00:00', 'HAS'),
  (4, '00000000-0000-4000-8000-000000000002', '2026-04-02 00:00:00', 'HAS'),
  (1, '00000000-0000-4000-8000-000000000002', '2026-04-02 00:00:00', 'WANTS'),
  (5, '00000000-0000-4000-8000-000000000003', '2026-04-03 00:00:00', 'SELLS'),
  (6, '00000000-0000-4000-8000-000000000003', '2026-04-03 00:00:00', 'HAS'),
  (2, '00000000-0000-4000-8000-000000000004', '2026-04-04 00:00:00', 'WANTS');

INSERT INTO public.user_module_tags (authorid, moduletagid) VALUES
  ('00000000-0000-4000-8000-000000000002', 1),
  ('00000000-0000-4000-8000-000000000002', 2),
  ('00000000-0000-4000-8000-000000000003', 5);

INSERT INTO public.user_module_acquisitions (profileid, moduleid, acquired_at, price_amount_minor, currency, source, note, created_at, updated_at)
VALUES                                                                           -- ids 1..3
  ('00000000-0000-4000-8000-000000000001', 1, '2026-04-01', 15000, 'EUR', 'new',  'launch day', '2026-04-01 00:00:00+00', '2026-04-01 00:00:00+00'),
  ('00000000-0000-4000-8000-000000000001', 2, '2026-04-01', NULL,  NULL,  'gift', NULL,         '2026-04-01 00:00:00+00', '2026-04-01 00:00:00+00'),
  ('00000000-0000-4000-8000-000000000003', 6, '2026-04-03', 9900,  'USD', 'used', NULL,         '2026-04-03 00:00:00+00', '2026-04-03 00:00:00+00');

-- ---------------------------------------------------------------- social
INSERT INTO public.comments (created, updated, "authorId", content, "entityId", "entityType")
VALUES                                                                           -- ids 1..4
  ('2026-05-01 00:00:00+00', '2026-05-01 00:00:00+00', '00000000-0000-4000-8000-000000000002', 'Great module', 1, 1),
  ('2026-05-01 01:00:00+00', '2026-05-01 01:00:00+00', '00000000-0000-4000-8000-000000000003', 'Nice rack',    1, 2),
  ('2026-05-01 02:00:00+00', '2026-05-01 02:00:00+00', '00000000-0000-4000-8000-000000000004', 'Cool patch',   1, 3),
  ('2026-05-01 03:00:00+00', '2026-05-01 03:00:00+00', '00000000-0000-4000-8000-000000000001', 'Hello',        2, 10);

INSERT INTO public.comments_duplicate (created, updated, "authorId", content, "entityId", "entityType", "moduleId")
VALUES ('2026-05-01 00:00:00+00', '2026-05-01 00:00:00+00', '00000000-0000-4000-8000-000000000002', 'Legacy copy', 1, 1, 1);

-- reaction_counts is maintained by the reactions trigger (never inserted directly).
INSERT INTO public.reactions (user_id, entity_type, entity_id, kind, created_at) VALUES
  ('00000000-0000-4000-8000-000000000002', 1, 1, 'COOL', '2026-05-02 00:00:00+00'),
  ('00000000-0000-4000-8000-000000000003', 1, 1, 'COOL', '2026-05-02 01:00:00+00'),
  ('00000000-0000-4000-8000-000000000005', 1, 2, 'COOL', '2026-05-02 02:00:00+00'),
  ('00000000-0000-4000-8000-000000000002', 2, 1, 'COOL', '2026-05-02 03:00:00+00'),
  ('00000000-0000-4000-8000-000000000004', 3, 1, 'COOL', '2026-05-02 04:00:00+00');

INSERT INTO public.module_flags (module_id, user_id, category, note, created_at, resolved)
VALUES                                                                           -- ids 1,2
  (7, '00000000-0000-4000-8000-000000000003', 'wrong_data', 'HP looks off', '2026-05-03 00:00:00+00', false),
  (8, '00000000-0000-4000-8000-000000000004', 'duplicate',  NULL,           '2026-05-03 01:00:00+00', true);

-- ---------------------------------------------------------------- marketplace
INSERT INTO public.marketplace_listings (id, public_id, seller_profileid, moduleid, title_override, description,
  condition, asking_price_amount_minor, asking_price_currency, open_to_offers, ships_from_country,
  shipping_options, shipping_notes, external_link, status, created_at, updated_at, expires_at)
VALUES ('20000000-0000-4000-8000-000000000001', 'drillList001', '00000000-0000-4000-8000-000000000003', 5,
  NULL, 'Barely used, synthetic listing.', 'excellent', 12000, 'EUR', true, 'IT',
  '{tracked,pickup}', 'Ships in 2 days', NULL, 'active',
  '2026-06-01 00:00:00+00', '2026-06-01 00:00:00+00', '2026-09-01 00:00:00+00');

INSERT INTO public.listing_media (id, listing_id, kind, url, storage_path, position, mime_type, created_at)
SELECT ('30000000-0000-4000-8000-00000000000' || p)::uuid,
       '20000000-0000-4000-8000-000000000001', 'image',
       'https://images.patcher.xyz/marketplace-listings/' || path, path, p - 1,
       CASE WHEN p = 1 THEN 'image/jpeg' ELSE 'image/webp' END,
       timestamptz '2026-06-01 00:00:00+00' + (p || ' minutes')::interval
FROM (SELECT p, '00000000-0000-4000-8000-000000000003/20000000-0000-4000-8000-000000000001/photo-' || p
                || CASE WHEN p = 1 THEN '.jpg' ELSE '.webp' END AS path
      FROM generate_series(1, 2) AS p) s ORDER BY p;

INSERT INTO public.shipping_addresses (id, profileid, label, recipient_name, line1, line2, city, region,
  postal_code, country_code, is_default, created_at, updated_at)
VALUES
  ('40000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000003', 'Home', 'Drill User Three',
   '1 Example Street', NULL, 'Testville', NULL, '00001', 'IT', true,  '2026-06-02 00:00:00+00', '2026-06-02 00:00:00+00'),
  ('40000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000003', 'Studio', 'Drill User Three',
   '2 Sample Road', 'Unit 4', 'Testville', 'TV', '00002', 'IT', false, '2026-06-02 01:00:00+00', '2026-06-02 01:00:00+00'),
  ('40000000-0000-4000-8000-000000000003', '00000000-0000-4000-8000-000000000002', 'Home', 'Drill User Two',
   '3 Mock Avenue', NULL, 'Placeholder City', NULL, NULL, 'DE', true,  '2026-06-02 02:00:00+00', '2026-06-02 02:00:00+00');

-- ---------------------------------------------------------------- public API
INSERT INTO public.api_tiers (code, monthly_quota, per_minute_quota, description, created_at) VALUES
  ('free', 10000, 60,  'Drill free tier', '2026-01-01 00:00:00+00'),
  ('pro',  500000, 600, 'Drill pro tier',  '2026-01-01 00:00:00+00');

INSERT INTO public.api_keys (id, profile_id, key_prefix, key_hash, tier_code, monthly_quota_override,
  per_minute_quota_override, label, created_at, updated_at, rotated_at, revoked_at, last_used_at)
VALUES ('50000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000001', 'pk_drill01',
  extensions.digest('drill-not-a-real-key-1', 'sha256'), 'free', NULL, NULL, 'drill key',
  '2026-07-01 00:00:00+00', '2026-07-01 00:00:00+00', NULL, NULL, '2026-09-15 00:00:00+00');

INSERT INTO public.api_key_usage_monthly (key_id, month, used, updated_at) VALUES
  ('50000000-0000-4000-8000-000000000001', '2026-09-01', 42, '2026-09-15 00:00:00+00');

-- ---------------------------------------------------------------- determinism fix-up
-- Child-row triggers and BEFORE triggers stamped now() into these columns while
-- seeding; pin them so independently seeded clusters are byte-identical. Replica
-- mode is used ONLY for this normalisation (so moddatetime doesn't re-stamp);
-- every row above was inserted with triggers active.
SET LOCAL session_replication_role = replica;
UPDATE public.racks              SET updated    = created;
UPDATE public.patches            SET updated    = created;
UPDATE public.module_collections SET updated    = created;
UPDATE public.shipping_addresses SET updated_at = created_at;
UPDATE public.reaction_counts    SET updated_at = '2026-05-02 00:00:00+00';
SET LOCAL session_replication_role = origin;

REFRESH MATERIALIZED VIEW public.module_discovery_snapshot;

COMMIT;
