-- Simulated self-host bake-in writes, for the rollback drill.
--
-- Run on cluster B ONLY, after A and B were both seeded with seed.sql, as a
-- normal session (triggers active), in one transaction:
--   psql "$DRILL_SELFHOST_URL" -X -v ON_ERROR_STOP=1 -f scripts/ops/drill/mutate-bakein.sql
-- Rows are looked up by natural keys / fixed uuids rather than by assumed ids.

\set ON_ERROR_STOP 1
BEGIN;

-- Scenario: new signup (auth user + identity + profile)
INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
VALUES ('00000000-0000-0000-0000-000000000000', '00000000-0000-4000-8000-000000000006',
  'authenticated', 'authenticated', 'drill-user6@example.test',
  '$2a$10$drilldrilldrilldrilldrilldrilldrilldrilldrilldrillxx', '2026-10-05 00:00:00+00',
  '{"provider":"email","providers":["email"]}', '{"username":"drill_user_6"}',
  '2026-10-05 00:00:00+00', '2026-10-05 00:00:00+00');
INSERT INTO auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at, id)
VALUES ('00000000-0000-4000-8000-000000000006', '00000000-0000-4000-8000-000000000006',
  '{"sub":"00000000-0000-4000-8000-000000000006","email":"drill-user6@example.test","email_verified":true}',
  'email', '2026-10-05 00:00:00+00', '2026-10-05 00:00:00+00', '2026-10-05 00:00:00+00',
  '10000000-0000-4000-8000-000000000006');
INSERT INTO public.profiles (id, username, confirmed, email, created_at, updated_at)
VALUES ('00000000-0000-4000-8000-000000000006', 'drill_user_6', true, 'drill-user6@example.test',
  '2026-10-05 00:00:00', '2026-10-05 00:00:00+00');

-- Scenario: profile edit (moddatetime re-stamps updated_at)
UPDATE public.profiles
   SET website = 'https://user2.example.test', avatar_url = 'drill/avatars/user2.png'
 WHERE id = '00000000-0000-4000-8000-000000000002';

-- Scenario: new rack with modules
INSERT INTO public.racks (name, created, updated, authorid, hp, rows, public, public_id)
VALUES ('Bake-in Rack', '2026-10-05 01:00:00', '2026-10-05 01:00:00',
  '00000000-0000-4000-8000-000000000006', 84, 1, true, 'drillRack004');
INSERT INTO public.rack_modules (rackid, moduleid, "row", "column", selected_panel_id)
SELECT r.id, m, 0, (m - 1) * 8, NULL
FROM public.racks r, unnest(ARRAY[1, 7]) AS m
WHERE r.public_id = 'drillRack004' ORDER BY m;

-- Scenario: rack_module removed
DELETE FROM public.rack_modules
 WHERE rackid = (SELECT id FROM public.racks WHERE public_id = 'drillRack001') AND moduleid = 2;

-- Scenario: new patch with module instances + connections
INSERT INTO public.patches (name, created, updated, description, authorid, public, linked_rack_id, public_id)
SELECT 'Bake-in Patch', '2026-10-05 02:00:00', '2026-10-05 02:00:00', 'made on self-host',
       '00000000-0000-4000-8000-000000000006', true, r.id, 'drillPatch04'
FROM public.racks r WHERE r.public_id = 'drillRack004';
INSERT INTO public.patch_module_instances (patch_id, module_id, instance_label)
SELECT p.id, m, 'inst-' || m
FROM public.patches p, unnest(ARRAY[1, 7]) AS m
WHERE p.public_id = 'drillPatch04' ORDER BY m;
INSERT INTO public.patch_connections (patchid, a, b, notes, ordinal, instance_id_a, instance_id_b)
SELECT p.id, o.id, i.id, 'bake-in cable', 1, ia.id, ib.id
FROM public.patches p
JOIN public.patch_module_instances ia ON ia.patch_id = p.id AND ia.module_id = 1
JOIN public.patch_module_instances ib ON ib.patch_id = p.id AND ib.module_id = 7
JOIN public.module_outs o ON o.moduleid = 1 AND o.name = 'Main Out'
JOIN public.module_ins  i ON i.moduleid = 7 AND i.name = 'Audio In'
WHERE p.public_id = 'drillPatch04';

-- Scenario: patch connection deleted
DELETE FROM public.patch_connections
 WHERE patchid = (SELECT id FROM public.patches WHERE public_id = 'drillPatch01') AND ordinal = 3;

-- Scenario: user_modules toggle (delete + re-insert same key, different kind)
DELETE FROM public.user_modules
 WHERE moduleid = 4 AND profileid = '00000000-0000-4000-8000-000000000002';
INSERT INTO public.user_modules (moduleid, profileid, updated, kind)
VALUES (4, '00000000-0000-4000-8000-000000000002', '2026-10-05 03:00:00', 'SELLS');

-- Scenario: reaction removed + new reaction (no-PK table; counts via trigger)
DELETE FROM public.reactions
 WHERE user_id = '00000000-0000-4000-8000-000000000003' AND entity_type = 1 AND entity_id = 1 AND kind = 'COOL';
INSERT INTO public.reactions (user_id, entity_type, entity_id, kind, created_at)
VALUES ('00000000-0000-4000-8000-000000000006', 2,
        (SELECT id FROM public.racks WHERE public_id = 'drillRack002'), 'COOL', '2026-10-05 04:00:00+00');

-- Scenario: module_collection deleted (entries cascade)
DELETE FROM public.module_collections WHERE public_id = 'drillColl002';

-- Scenario: comment edited
UPDATE public.comments
   SET content = 'Great module (edited on self-host)', updated = '2026-10-05 05:00:00+00'
 WHERE "authorId" = '00000000-0000-4000-8000-000000000002' AND "entityType" = 1 AND "entityId" = 1;

-- Scenario: module_flags insert (id is GENERATED ALWAYS)
INSERT INTO public.module_flags (module_id, user_id, category, note, created_at)
VALUES (3, '00000000-0000-4000-8000-000000000006', 'wrong_data', 'flagged during bake-in', '2026-10-05 06:00:00+00');

-- Scenario: new marketplace listing with media
INSERT INTO public.marketplace_listings (id, public_id, seller_profileid, moduleid, description, condition,
  asking_price_amount_minor, asking_price_currency, ships_from_country, shipping_options, status, created_at, updated_at)
VALUES ('20000000-0000-4000-8000-000000000002', 'drillList002', '00000000-0000-4000-8000-000000000001', 1,
  'Listed during bake-in.', 'good', 9900, 'EUR', 'DE', '{tracked}', 'active',
  '2026-10-05 07:00:00+00', '2026-10-05 07:00:00+00');
INSERT INTO public.listing_media (id, listing_id, url, storage_path, position, mime_type, created_at)
VALUES ('30000000-0000-4000-8000-000000000011', '20000000-0000-4000-8000-000000000002',
  'https://images.patcher.xyz/marketplace-listings/00000000-0000-4000-8000-000000000001/20000000-0000-4000-8000-000000000002/front.png',
  '00000000-0000-4000-8000-000000000001/20000000-0000-4000-8000-000000000002/front.png',
  0, 'image/png', '2026-10-05 07:01:00+00');

-- Scenario: shipping address default switch (trigger clears the old default)
UPDATE public.shipping_addresses SET is_default = true
 WHERE id = '40000000-0000-4000-8000-000000000002';

-- Scenario: api_key_usage_monthly bump (existing month + a new month row)
UPDATE public.api_key_usage_monthly SET used = used + 5, updated_at = '2026-10-05 08:00:00+00'
 WHERE key_id = '50000000-0000-4000-8000-000000000001' AND month = '2026-09-01';
INSERT INTO public.api_key_usage_monthly (key_id, month, used, updated_at)
VALUES ('50000000-0000-4000-8000-000000000001', '2026-10-01', 3, '2026-10-05 08:00:00+00');

-- Scenario: new price snapshot
INSERT INTO public.module_price_snapshots (listing_id, observed_at, price_amount_minor, currency, availability, source, raw_meta, created_at)
SELECT l.id, '2026-10-05 09:00:00+00', 17900, 'EUR', 'in_stock', 'scraper', '{"v":3}', '2026-10-05 09:00:00+00'
FROM public.module_store_listings l JOIN public.stores s ON s.id = l.store_id
WHERE s.slug = 'drill-shop-eu' AND l.module_id = 1;

-- Scenario: catalogue UPDATE on a big table (modules; moddatetime re-stamps "updated")
UPDATE public.modules SET description = description || ' (revised on self-host)', "isComplete" = true
 WHERE name IN ('Drill Module 01', 'Drill Module 03', 'Drill Module 05');

-- Scenario: advance a sequence beyond max(id) (insert then delete; gap remains)
INSERT INTO public.tags (name, type) VALUES ('Bake-in Temp Tag', 1);
DELETE FROM public.tags WHERE name = 'Bake-in Temp Tag';
INSERT INTO public.comments ("authorId", content, "entityId", "entityType")
VALUES ('00000000-0000-4000-8000-000000000006', 'temp', 1, 1);
DELETE FROM public.comments WHERE "authorId" = '00000000-0000-4000-8000-000000000006' AND content = 'temp';

REFRESH MATERIALIZED VIEW public.module_discovery_snapshot;

COMMIT;
