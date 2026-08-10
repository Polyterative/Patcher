-- Pin the mutable search_path flagged by the security advisor. The function
-- body only references schema-qualified public.profiles, so this is safe.
alter function public.handle_new_profile_poly() set search_path = '';
