-- Remove hidden_images column from property_listings table
-- This script removes the column that was incorrectly added

-- Drop the column if it exists
ALTER TABLE property_listings 
DROP COLUMN IF EXISTS hidden_images;

-- Drop the index if it exists
DROP INDEX IF EXISTS idx_property_listings_hidden_images;

-- Verify the column is removed
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'property_listings'
  AND column_name = 'hidden_images';

-- This should return no rows if successful
