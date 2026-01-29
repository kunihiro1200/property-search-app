-- Add spreadsheet_url column to property_listings table
-- This column stores the URL of the individual property spreadsheet from the gyomu list

ALTER TABLE property_listings
ADD COLUMN IF NOT EXISTS spreadsheet_url TEXT;

-- Add comment
COMMENT ON COLUMN property_listings.spreadsheet_url IS 'URL of the individual property spreadsheet (from gyomu list)';
