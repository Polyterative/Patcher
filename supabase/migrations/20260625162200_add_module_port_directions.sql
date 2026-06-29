alter table public.module_ins
  add column direction text not null default 'input',
  add constraint module_ins_direction_supported
    check (direction in ('input', 'bidirectional', 'passive'));

alter table public.module_outs
  add column direction text not null default 'output',
  add constraint module_outs_direction_supported
    check (direction in ('output', 'bidirectional', 'passive'));

comment on column public.module_ins.direction is
  'Semantic port direction. Existing input rows default to input; bidirectional/passive support is additive.';

comment on column public.module_outs.direction is
  'Semantic port direction. Existing output rows default to output; bidirectional/passive support is additive.';
