-- Simple test for hidden_images column (text[] type)
-- Run each step separately in Supabase SQL Editor

-- Step 1: Check if column exists
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'property_listings' 
AND column_name = 'hidden_images';

-- Step 2: Check current value for AA13129
SELECT 
  property_number, 
  hidden_images,
  pg_typeof(hidden_images) as column_type
FROM property_listings
WHERE property_number = 'AA13129';

-- Step 3: Try to set to empty array (use ARRAY[] or '{}' for text[])
UPDATE property_listings
SET hidden_images = '{}'
WHERE property_number = 'AA13129'
RETURNING property_number, hidden_images;

-- Step 4: Try to add a test file ID (use ARRAY[] syntax)
UPDATE property_listings
SET hidden_images = ARRAY['test-file-id-12345']
WHERE property_number = 'AA13129'
RETURNING property_number, hidden_images;

-- Step 5: Try to append another file ID (use array_append)
UPDATE property_listings
SET hidden_images = array_append(hidden_images, 'test-file-id-67890')
WHERE property_number = 'AA13129'
RETURNING property_number, hidden_images;

-- Step 6: Remove a specific file ID (use array_remove)
UPDATE property_listings
SET hidden_images = array_remove(hidden_images, 'test-file-id-12345')
WHERE property_number = 'AA13129'
RETURNING property_number, hidden_images;

-- Step 7: Reset to empty array
UPDATE property_listings
SET hidden_images = '{}'
WHERE property_number = 'AA13129'
RETURNING property_number, hidden_images;
