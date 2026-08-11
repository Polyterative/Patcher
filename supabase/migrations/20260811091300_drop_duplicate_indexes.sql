-- Drop redundant duplicate indexes flagged by the performance advisor
-- (duplicate_index). Each dropped index is identical to a surviving primary
-- key or sibling index on the same columns. comments_id_key and
-- comments_duplicate_id_key are UNIQUE constraints, so they are dropped as
-- constraints (the primary keys keep enforcing uniqueness on id).
-- module_tags_tagid_fkey depended on tags_id_uindex, so it is re-created
-- against tags_pkey (same column, same semantics) in the same transaction.

alter table public.comments drop constraint if exists comments_id_key;
alter table public.comments_duplicate drop constraint if exists comments_duplicate_id_key;
drop index if exists public.module_ins_moduleid_idx;    -- keeps module_ins_moduleid_index
drop index if exists public.module_outs_moduleid_idx;   -- keeps module_outs_moduleid_index
drop index if exists public.module_tags_id_uindex;      -- keeps module_tags_pk
drop index if exists public.formats_id_uindex;          -- keeps formats_pk (standards)

alter table public.module_tags drop constraint module_tags_tagid_fkey;
drop index public.tags_id_uindex;                       -- keeps tags_pkey
alter table public.module_tags
  add constraint module_tags_tagid_fkey
  foreign key (tagid) references public.tags(id) on update cascade on delete cascade;
