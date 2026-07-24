-- Public Open API v1 security-barrier views and least-privilege read grants.

revoke all on table
  public.modules,
  public.manufacturers,
  public.standards,
  public.tags,
  public.module_ins,
  public.module_outs,
  public.module_tags,
  public.module_panels
from api_reader;

revoke all on table
  public.modules,
  public.manufacturers,
  public.standards,
  public.tags,
  public.module_ins,
  public.module_outs,
  public.module_tags,
  public.module_panels
from api_view_owner;

grant select (
  id,
  name,
  description,
  hp,
  standard,
  "manufacturerId",
  depth,
  "depthMax",
  "isDIY",
  "manualURL",
  "powerNeg12",
  "powerPos12",
  "powerPos5",
  switches,
  weight,
  "public",
  "isApproved",
  submitter
) on table public.modules to api_view_owner;

grant select (
  id,
  name,
  description,
  tagline,
  "websiteURL",
  social_links,
  logo
) on table public.manufacturers to api_view_owner;

grant select (id, name) on table public.standards to api_view_owner;
grant select (id, name, type) on table public.tags to api_view_owner;
grant select (id, moduleid, name, "isAudio", "isDCC", "isVOCT", min, max, "isApproved") on table public.module_ins to api_view_owner;
grant select (id, moduleid, name, "isAudio", "isDCC", "isVOCT", min, max, "isApproved") on table public.module_outs to api_view_owner;
grant select (id, moduleid, tagid) on table public.module_tags to api_view_owner;
grant select (id, moduleid, color, description, "isApproved") on table public.module_panels to api_view_owner;

create index if not exists modules_public_approved_idx
  on public.modules (id)
  where "public" and "isApproved" and submitter is not null;

create index if not exists modules_public_approved_mfr_idx
  on public.modules ("manufacturerId")
  where "public" and "isApproved" and submitter is not null;

create index if not exists module_ins_moduleid_idx
  on public.module_ins (moduleid);

create index if not exists module_outs_moduleid_idx
  on public.module_outs (moduleid);

create index if not exists module_tags_moduleid_idx
  on public.module_tags (moduleid);

create index if not exists module_panels_moduleid_idx
  on public.module_panels (moduleid);

drop policy if exists "api_view_owner_select_publishable_modules" on public.modules;
create policy "api_view_owner_select_publishable_modules"
  on public.modules
  as permissive
  for select
  to api_view_owner
  using ("public" and "isApproved" and submitter is not null);

drop policy if exists "api_view_owner_select_publishable_manufacturers" on public.manufacturers;
create policy "api_view_owner_select_publishable_manufacturers"
  on public.manufacturers
  as permissive
  for select
  to api_view_owner
  using (
    exists (
      select 1
      from public.modules m
      where m."manufacturerId" = manufacturers.id
        and m."public"
        and m."isApproved"
        and m.submitter is not null
    )
  );

create or replace view public.api_v1_modules
with (security_barrier = on)
as
select
  m.id,
  m.name,
  m.description,
  m.hp,
  m.standard,
  m."manufacturerId",
  m.depth,
  m."depthMax",
  m."isDIY",
  m."manualURL",
  m."powerNeg12",
  m."powerPos12",
  m."powerPos5",
  m.switches,
  m.weight
from public.modules m
where m."public"
  and m."isApproved"
  and m.submitter is not null;

create or replace view public.api_v1_manufacturers
with (security_barrier = on)
as
select
  mf.id,
  mf.name,
  mf.description,
  mf.tagline,
  mf."websiteURL",
  mf.social_links,
  mf.logo
from public.manufacturers mf
where exists (
  select 1
  from public.modules m
  where m."manufacturerId" = mf.id
    and m."public"
    and m."isApproved"
    and m.submitter is not null
);

create or replace view public.api_v1_standards
with (security_barrier = on)
as
select
  s.id,
  s.name
from public.standards s;

create or replace view public.api_v1_tags
with (security_barrier = on)
as
select
  t.id,
  t.name,
  t.type
from public.tags t;

create or replace view public.api_v1_module_ins
with (security_barrier = on)
as
select
  i.id,
  i.moduleid,
  i.name,
  i."isAudio",
  i."isDCC",
  i."isVOCT",
  i.min,
  i.max
from public.module_ins i
join public.api_v1_modules m on m.id = i.moduleid
where i."isApproved";

create or replace view public.api_v1_module_outs
with (security_barrier = on)
as
select
  o.id,
  o.moduleid,
  o.name,
  o."isAudio",
  o."isDCC",
  o."isVOCT",
  o.min,
  o.max
from public.module_outs o
join public.api_v1_modules m on m.id = o.moduleid
where o."isApproved";

create or replace view public.api_v1_module_tags
with (security_barrier = on)
as
select
  mt.id,
  mt.moduleid,
  mt.tagid
from public.module_tags mt
join public.api_v1_modules m on m.id = mt.moduleid;

create or replace view public.api_v1_module_panels
with (security_barrier = on)
as
select
  p.id,
  p.moduleid,
  p.color,
  p.description
from public.module_panels p
join public.api_v1_modules m on m.id = p.moduleid
where p."isApproved";

alter view public.api_v1_modules owner to api_view_owner;
alter view public.api_v1_manufacturers owner to api_view_owner;
alter view public.api_v1_standards owner to api_view_owner;
alter view public.api_v1_tags owner to api_view_owner;
alter view public.api_v1_module_ins owner to api_view_owner;
alter view public.api_v1_module_outs owner to api_view_owner;
alter view public.api_v1_module_tags owner to api_view_owner;
alter view public.api_v1_module_panels owner to api_view_owner;

revoke all on table
  public.api_v1_modules,
  public.api_v1_manufacturers,
  public.api_v1_standards,
  public.api_v1_tags,
  public.api_v1_module_ins,
  public.api_v1_module_outs,
  public.api_v1_module_tags,
  public.api_v1_module_panels
from public, anon, authenticated;

grant select on table
  public.api_v1_modules,
  public.api_v1_manufacturers,
  public.api_v1_standards,
  public.api_v1_tags,
  public.api_v1_module_ins,
  public.api_v1_module_outs,
  public.api_v1_module_tags,
  public.api_v1_module_panels
to api_reader;

comment on view public.api_v1_modules is
  'Public Open API v1 allowlist. security_definer_view advisor accepted: api_view_owner owns a security_barrier view with narrow base-column grants so api_reader has zero base-table grants.';
comment on view public.api_v1_manufacturers is
  'Public Open API v1 allowlist. security_definer_view advisor accepted: manufacturers are exposed only when a publishable module exists.';
comment on view public.api_v1_standards is
  'Public Open API v1 reference allowlist. security_definer_view advisor accepted for consistent api_reader view-only access.';
comment on view public.api_v1_tags is
  'Public Open API v1 reference allowlist. security_definer_view advisor accepted for consistent api_reader view-only access.';
comment on view public.api_v1_module_ins is
  'Public Open API v1 allowlist. security_definer_view advisor accepted; rows are transitively tied to publishable modules.';
comment on view public.api_v1_module_outs is
  'Public Open API v1 allowlist. security_definer_view advisor accepted; rows are transitively tied to publishable modules.';
comment on view public.api_v1_module_tags is
  'Public Open API v1 allowlist. security_definer_view advisor accepted; mappings are transitively tied to publishable modules.';
comment on view public.api_v1_module_panels is
  'Public Open API v1 allowlist. security_definer_view advisor accepted; rows are transitively tied to publishable modules.';
