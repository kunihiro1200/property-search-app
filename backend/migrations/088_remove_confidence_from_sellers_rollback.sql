-- Migration 088 Rollback: Restore confidence column to sellers table
-- Date: 2026-01-16
-- Description: Add back the confidence column if needed for rollback

-- Add the confidence column back
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS confidence TEXT;

-- Add column comment
COMMENT ON COLUMN sellers.confidence IS '確度レベル（A, B, B'', C, D, E, DUPLICATE）';

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';

-- Verification query (run separately to verify)
-- SELECT column_name, data_type 
-- FROM information_schema.columns 
-- WHERE table_name = 'sellers' 
-- AND column_name = 'confidence';
-- Expected: 1 row with data_type = 'text'
