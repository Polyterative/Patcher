-- Enforce that username is never NULL or blank.
-- App layer already validates this, but defence-in-depth at the DB level
-- prevents any direct API or future code path from writing an empty username.

-- First: fix any existing rows with NULL or blank usernames so the constraint can be applied.
-- These are accounts that slipped through without completing profile setup.
-- Assign them a recognisable placeholder so the user can still change it via the app.
UPDATE profiles
SET username = 'user_' || substring(id::text, 1, 8)
WHERE username IS NULL
   OR trim(username) = '';

-- Now safe to add the constraints.
ALTER TABLE profiles
    ADD CONSTRAINT profiles_username_not_null CHECK (username IS NOT NULL),
  ADD CONSTRAINT profiles_username_not_empty CHECK (trim(username) <> '');
