-- Force PostgREST to reload its schema cache
-- Run this in Supabase SQL Editor

-- Method 1: Send NOTIFY signal to PostgREST
NOTIFY pgrst, 'reload schema';

-- Method 2: Verify the column exists
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'property_listings' 
AND column_name = 'hidden_images';

-- Method 3: Test a simple query
SELECT id, hidden_images 
FROM property_listings 
LIMIT 1;
