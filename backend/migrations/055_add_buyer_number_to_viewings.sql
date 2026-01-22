-- Migration 055: Add buyer_number column to viewings table
-- This allows tracking which buyer number (current or past) a viewing result is associated with

-- Add buyer_number column to viewings table
ALTER TABLE viewings 
ADD COLUMN IF NOT EXISTS buyer_number TEXT;

-- Create index on buyer_number for performance
CREATE INDEX IF NOT EXISTS idx_viewings_buyer_number ON viewings(buyer_number);

-- Update existing records to use the current buyer number from the buyers table
UPDATE viewings v
SET buyer_number = b.buyer_number
FROM buyers b
WHERE v.buyer_id = b.buyer_id
AND v.buyer_number IS NULL;

-- Add comment to explain the column
COMMENT ON COLUMN viewings.buyer_number IS 'The buyer number (current or past) associated with this viewing. Allows tracking viewing results for past buyer numbers of the same person.';
