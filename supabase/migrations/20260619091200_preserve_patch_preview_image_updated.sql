-- Preserve patch graph freshness timestamps for preview-image-only updates.
--
-- `handle_updated_auto` currently refreshes public.patches.updated for every row
-- update. Patch SVG preview writes only change public.patches.image, so this
-- later-named BEFORE UPDATE trigger restores OLD.updated for that narrow case.

create or replace function public.tg_preserve_patch_preview_image_updated()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if NEW.image is distinct from OLD.image
    and (to_jsonb(NEW) - 'image' - 'updated') = (to_jsonb(OLD) - 'image' - 'updated') then
    NEW.updated := OLD.updated;
  end if;

  return NEW;
end;
$$;

drop trigger if exists zz_preserve_patch_preview_image_updated on public.patches;

create trigger zz_preserve_patch_preview_image_updated
  before update on public.patches
  for each row
  execute function public.tg_preserve_patch_preview_image_updated();
