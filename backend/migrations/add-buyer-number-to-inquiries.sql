-- Add buyer_number column to property_inquiries table
ALTER TABLE property_inquiries
ADD COLUMN IF NOT EXISTS buyer_number INTEGER;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_property_inquiries_buyer_number
ON property_inquiries(buyer_number DESC);
