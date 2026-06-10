drop policy if exists "Admins can update any rack" on public.racks;

create policy "Admins can update any rack"
on public.racks
for update
to authenticated
using (
  coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'admin'
)
with check (
  coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'admin'
);
