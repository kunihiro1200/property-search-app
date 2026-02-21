-- Add pet_allowed column to property_listings table
-- This column stores pet information for apartment properties (BB column from spreadsheet)

ALTER TABLE property_listings
ADD COLUMN IF NOT EXISTS pet_allowed TEXT;

-- Add comment to the column
COMMENT ON COLUMN property_listings.pet_allowed IS 'ペット可否（BB列）- マンションの場合のみ使用';
