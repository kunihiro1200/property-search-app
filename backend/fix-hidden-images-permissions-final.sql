-- FINAL FIX: hidden_images column permissions for PostgREST
-- Root cause: PostgREST needs explicit column-level permissions

-- Step 1: Drop and recreate to ensure clean state
ALTER TABLE property_listings DROP COLUMN IF EXISTS hidden_images CASCADE;

-- Step 2: Recreate the column
ALTER TABLE property_listings 
ADD COLUMN hidden_images TEXT[] DEFAULT '{}';

-- Step 3: Add comment
COMMENT ON COLUMN property_listings.hidden_images IS '非表示にした画像のファイルIDリスト';

-- Step 4: Create index
CREATE INDEX IF NOT EXISTS idx_property_listings_hidden_images 
ON property_listings USING GIN (hidden_images);

-- Step 5: Grant table-level permissions
GRANT SELECT, UPDATE ON property_listings TO anon;
GRANT SELECT, UPDATE ON property_listings TO authenticated;
GRANT ALL ON property_listings TO service_role;

-- Step 6: Grant explicit column-level permissions (THIS IS THE KEY)
GRANT SELECT (hidden_images), UPDATE (hidden_images) ON property_listings TO anon;
GRANT SELECT (hidden_images), UPDATE (hidden_images) ON property_listings TO authenticated;

-- Step 7: Ensure RLS policies allow access
ALTER TABLE property_listings ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow anon to read property_listings" ON property_listings;
DROP POLICY IF EXISTS "Allow authenticated to update property_listings" ON property_listings;
DROP POLICY IF EXISTS "Allow service_role full access to property_listings" ON property_listings;

-- Create comprehensive policies
CREATE POLICY "Allow anon to read property_listings" 
ON property_listings FOR SELECT 
TO anon 
USING (true);

CREATE POLICY "Allow authenticated to update property_listings" 
ON property_listings FOR UPDATE 
TO authenticated 
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow service_role full access to property_listings" 
ON property_listings FOR ALL 
TO service_role 
USING (true)
WITH CHECK (true);

-- Step 8: Reload PostgREST schema
NOTIFY pgrst, 'reload schema';

-- Verification queries (run these after to confirm)
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'property_listings' AND column_name = 'hidden_images';
-- SELECT grantee, privilege_type FROM information_schema.column_privileges WHERE table_name = 'property_listings' AND column_name = 'hidden_images';
-- SELECT * FROM pg_policies WHERE tablename = 'property_listings';
