-- Add property_number column to property_inquiries table
ALTER TABLE property_inquiries
ADD COLUMN IF NOT EXISTS property_number TEXT;

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_property_inquiries_property_number
ON property_inquiries(property_number);

-- Add comment
COMMENT ON COLUMN property_inquiries.property_number IS '物件番号（AA形式）';
