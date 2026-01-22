-- Migration: Add hidden_images column to property_listings table
-- Purpose: Store array of hidden image file IDs for public property display

-- Add hidden_images column
ALTER TABLE property_listings
ADD COLUMN IF NOT EXISTS hidden_images TEXT[] DEFAULT '{}';

-- Add comment for documentation
COMMENT ON COLUMN property_listings.hidden_images IS 'Array of Google Drive file IDs that should be hidden from public display';

-- Create index for efficient querying
CREATE INDEX IF NOT EXISTS idx_property_listings_hidden_images 
ON property_listings USING GIN (hidden_images);
