ALTER TABLE patches
  ADD COLUMN IF NOT EXISTS linked_rack_id bigint
  REFERENCES racks(id)
  ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS patches_linked_rack_id_idx
  ON patches(linked_rack_id);
