do $$ begin
  if exists (select * from public._snap_before except select * from public._snap_after)
     or exists (select * from public._snap_after except select * from public._snap_before) then
    raise exception 'FAIL: rollback did not restore the original state';
  end if;
end $$;
