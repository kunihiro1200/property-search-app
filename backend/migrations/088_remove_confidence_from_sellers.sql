-- Migration 088: Remove confidence column from sellers table
-- Date: 2026-01-16
-- Description: Drop the confidence column from sellers table as it was never added to the database

-- Drop the confidence column if it exists
ALTER TABLE sellers DROP COLUMN IF EXISTS confidence;

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';

-- Verification query (run separately to verify)
-- SELECT column_name, data_type 
-- FROM information_schema.columns 
-- WHERE table_name = 'sellers' 
-- AND column_name = 'confidence';
-- Expected: 0 rows (column should not exist)
