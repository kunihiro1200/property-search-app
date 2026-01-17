-- Force PostgREST to reload its schema cache
-- This must be run in Supabase SQL Editor

-- Step 1: Send NOTIFY signal to PostgREST
NOTIFY pgrst, 'reload schema';

-- Step 2: Verify the column exists
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'property_listings'
  AND column_name = 'hidden_images';

-- Step 3: Verify the index exists
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'property_listings'
  AND indexname = 'idx_property_listings_hidden_images';
