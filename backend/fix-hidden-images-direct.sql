-- ============================================
-- Direct SQL Fix for hidden_images Column
-- Execute this in Supabase SQL Editor
-- ============================================

-- Step 1: Add the column (safe to run multiple times)
ALTER TABLE property_listings
ADD COLUMN IF NOT EXISTS hidden_images TEXT[] DEFAULT '{}';

-- Step 2: Add column comment
COMMENT ON COLUMN property_listings.hidden_images IS '非表示にした画像のファイルIDリスト';

-- Step 3: Create GIN index for efficient array searches
CREATE INDEX IF NOT EXISTS idx_property_listings_hidden_images
ON property_listings USING GIN (hidden_images);

-- Step 4: Force PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';

-- Step 5: Verify the column exists
SELECT 
  column_name, 
  data_type, 
  column_default,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'property_listings' 
AND column_name = 'hidden_images';

-- Expected output:
-- column_name    | data_type | column_default | is_nullable
-- hidden_images  | ARRAY     | '{}'::text[]   | YES
