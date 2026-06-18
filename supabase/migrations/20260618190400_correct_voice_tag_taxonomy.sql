-- Keep Voice limited to instrument / sound identity tags.
-- Move technical module-role tags to existing functional groups.

update public.tags
set type = 4
where type is distinct from 4
  and name in ('Full Voice', 'VCO');

update public.tags
set type = 9
where type is distinct from 9
  and name in ('VCA');
