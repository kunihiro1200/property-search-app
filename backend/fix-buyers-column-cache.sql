-- Fix PostgREST Schema Cache Issue for buyers.last_synced_at
-- This script drops and recreates the column to force PostgREST to recognize it

-- Step 1: Drop existing column and index
DROP INDEX IF EXISTS idx_buyers_last_synced_at;
ALTER TABLE buyers DROP COLUMN IF EXISTS last_synced_at;

-- Step 2: Wait a moment (execute this in a separate query if needed)
-- SELECT pg_sleep(2);

-- Step 3: Recreate column
ALTER TABLE buyers ADD COLUMN last_synced_at TIMESTAMP WITH TIME ZONE;

-- Step 4: Recreate index
CREATE INDEX idx_buyers_last_synced_at ON buyers(last_synced_at DESC);

-- Step 5: Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';

-- Step 6: Verify the column exists
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'buyers'
AND column_name = 'last_synced_at';
