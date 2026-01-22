-- Migration 045: Add distribution_areas column to property_listings table
-- This column stores pre-calculated area numbers for email distribution

-- Add distribution_areas column
ALTER TABLE property_listings 
ADD COLUMN IF NOT EXISTS distribution_areas TEXT;

-- Add comment to column
COMMENT ON COLUMN property_listings.distribution_areas IS 'Pre-calculated area numbers for email distribution (e.g., "①,②,③,㊵")';

-- Create index for faster filtering during email distribution
CREATE INDEX IF NOT EXISTS idx_property_listings_distribution_areas 
ON property_listings(distribution_areas) 
WHERE distribution_areas IS NOT NULL;

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_property_listings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS trigger_update_property_listings_updated_at ON property_listings;

CREATE TRIGGER trigger_update_property_listings_updated_at
  BEFORE UPDATE ON property_listings
  FOR EACH ROW
  EXECUTE FUNCTION update_property_listings_updated_at();
