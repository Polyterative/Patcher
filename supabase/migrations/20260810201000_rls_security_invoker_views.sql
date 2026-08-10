-- Flip three unused SECURITY DEFINER views to security_invoker so they
-- enforce the querying user's own RLS/permissions instead of the view
-- creator's. Views are preserved (not dropped); no client code references
-- them (only declared in DbPaths/generated types, never queried).
alter view public.rack_modules_grouped_by_moduleid set (security_invoker = true);
alter view public.module_flag_counts set (security_invoker = true);
alter view public.patches_for_modules set (security_invoker = true);
