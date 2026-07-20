alter table public.rack_modules
  add column orientation text not null default 'normal',
  add constraint rack_modules_orientation_check
    check (orientation in ('normal', 'rot180'));

comment on column public.rack_modules.orientation is
  'Placement-level module orientation. normal is the default; rot180 flips eligible 3U module placements by 180 degrees.';
