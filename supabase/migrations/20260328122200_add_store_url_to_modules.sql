-- Add store_url column to modules table
-- Stores a "buy new" URL, manually curated per module (Price Hub prerequisite)
ALTER TABLE modules ADD COLUMN IF NOT EXISTS store_url text;

-- Only admins can write store_url; everyone can read it
-- Existing RLS on modules table covers SELECT (public read).
-- We rely on the app-layer admin check in update.moduleStoreUrl(), which
-- is consistent with how manualURL and other admin-only fields are handled.
