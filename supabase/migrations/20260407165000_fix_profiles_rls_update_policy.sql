-- Ensure RLS is enabled on profiles (idempotent)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
-- Drop existing update policy if any (to recreate cleanly)
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
-- Allow authenticated users to update their own row
CREATE POLICY "profiles_update_own"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);
-- Ensure SELECT policy exists so getRichUserSession$ works after update
DROP POLICY IF EXISTS "profiles_select_own" ON profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
CREATE POLICY "profiles_select_own"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (true);
