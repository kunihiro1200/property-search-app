-- Migration 021: Update confidence field to new values
-- This migration updates the confidence_level field to support new confidence values

-- Drop old constraint
ALTER TABLE sellers DROP CONSTRAINT IF EXISTS sellers_confidence_level_check;

-- Update confidence_level to support new values
ALTER TABLE sellers 
  ADD CONSTRAINT sellers_confidence_level_check 
  CHECK (confidence_level IN ('A', 'B', 'B_PRIME', 'C', 'D', 'E', 'DUPLICATE'));

-- Rename confidence_level to confidence for consistency
ALTER TABLE sellers RENAME COLUMN confidence_level TO confidence;

-- Drop old motivation column if it exists (this will also drop idx_sellers_motivation automatically)
ALTER TABLE sellers DROP COLUMN IF EXISTS motivation;

-- Update index name
DROP INDEX IF EXISTS idx_sellers_confidence_level;
DROP INDEX IF EXISTS idx_sellers_motivation;
CREATE INDEX IF NOT EXISTS idx_sellers_confidence ON sellers(confidence);

-- Update comments
COMMENT ON COLUMN sellers.confidence IS 'Assessment of seller likelihood to proceed with sale (A/B/B_PRIME/C/D/E/DUPLICATE)';
