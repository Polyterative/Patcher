-- Restore identity sequence parity after explicit-ID module I/O imports.
lock table public.module_ins in share row exclusive mode;
lock table public.module_outs in share row exclusive mode;

do $$
declare
  module_ins_max_id bigint;
  module_outs_max_id bigint;
begin
  select max(id) into module_ins_max_id from public.module_ins;
  if module_ins_max_id is not null then
    perform setval(
      pg_get_serial_sequence('public.module_ins', 'id'),
      module_ins_max_id,
      true
    );
  end if;

  select max(id) into module_outs_max_id from public.module_outs;
  if module_outs_max_id is not null then
    perform setval(
      pg_get_serial_sequence('public.module_outs', 'id'),
      module_outs_max_id,
      true
    );
  end if;
end;
$$;
