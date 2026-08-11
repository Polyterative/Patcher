-- Add covering indexes for foreign keys flagged by the performance advisor
-- (unindexed_foreign_keys). All tables are small, so plain CREATE INDEX is
-- instant; comments_duplicate is intentionally skipped (locked-down, unused).

create index if not exists api_keys_tier_code_idx on public.api_keys (tier_code);
create index if not exists comments_authorid_idx on public.comments ("authorId");
create index if not exists manufacturers_verified_by_idx on public.manufacturers (verified_by);
create index if not exists module_flags_module_id_idx on public.module_flags (module_id);
create index if not exists module_flags_user_id_idx on public.module_flags (user_id);
create index if not exists module_ins_authorid_idx on public.module_ins (authorid);
create index if not exists module_outs_authorid_idx on public.module_outs (authorid);
create index if not exists module_tags_tagid_idx on public.module_tags (tagid);
create index if not exists modules_standard_idx on public.modules (standard);
create index if not exists patch_connections_instance_id_a_idx on public.patch_connections (instance_id_a);
create index if not exists patch_connections_instance_id_b_idx on public.patch_connections (instance_id_b);
create index if not exists patch_module_instances_module_id_idx on public.patch_module_instances (module_id);
create index if not exists patch_module_instances_patch_id_idx on public.patch_module_instances (patch_id);
create index if not exists patches_authorid_idx on public.patches (authorid);
create index if not exists rack_modules_moduleid_idx on public.rack_modules (moduleid);
create index if not exists rack_modules_selected_panel_id_idx on public.rack_modules (selected_panel_id);
create index if not exists user_module_tags_moduletagid_idx on public.user_module_tags (moduletagid);
