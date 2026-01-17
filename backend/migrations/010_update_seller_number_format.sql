-- Update Seller Number Format to 5-digit padding
-- Changes format from AA{number} to AA{5-digit number} (e.g., AA00001, AA00002)
-- Migration 010

-- ============================================================================
-- 1. Update the generate_seller_number function to use 5-digit padding
-- ============================================================================

CREATE OR REPLACE FUNCTION generate_seller_number()
RETURNS VARCHAR(50) AS $$
DECLARE
    next_num INTEGER;
    seller_num VARCHAR(50);
BEGIN
    -- Get and increment the sequence number atomically
    UPDATE seller_number_sequence 
    SET current_number = current_number + 1,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = 1
    RETURNING current_number INTO next_num;
    
    -- Format as AA{5-digit number with zero padding}
    seller_num := 'AA' || LPAD(next_num::TEXT, 5, '0');
    
    RETURN seller_num;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION generate_seller_number IS 'Generates the next sequential seller number in format AA{5-digit number} (e.g., AA00001, AA00002)';

-- ============================================================================
-- 2. Update existing seller numbers to 5-digit format (if any exist)
-- ============================================================================

-- This will update any existing seller numbers that don't have 5-digit padding
-- For example: AA1 -> AA00001, AA123 -> AA00123
UPDATE sellers
SET seller_number = 'AA' || LPAD(SUBSTRING(seller_number FROM 3)::TEXT, 5, '0')
WHERE seller_number IS NOT NULL 
  AND seller_number ~ '^AA\d+'
  AND LENGTH(seller_number) < 7; -- Only update if not already 5 digits

-- ============================================================================
-- 3. Add validation constraint for seller number format
-- ============================================================================

-- Drop existing constraint if it exists
ALTER TABLE sellers DROP CONSTRAINT IF EXISTS sellers_seller_number_format_check;

-- Add new constraint to ensure 5-digit format
ALTER TABLE sellers ADD CONSTRAINT sellers_seller_number_format_check 
CHECK (seller_number IS NULL OR seller_number ~ '^AA\d{5}$');

COMMENT ON CONSTRAINT sellers_seller_number_format_check ON sellers IS 'Ensures seller number follows format AA{5-digit number}';

-- ============================================================================
-- Migration 010 Complete
-- Seller numbers now use 5-digit format: AA00001, AA00002, etc.
-- ============================================================================
