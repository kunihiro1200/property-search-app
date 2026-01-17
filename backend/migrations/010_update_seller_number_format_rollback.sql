-- Rollback Migration 010: Revert Seller Number Format
-- Reverts format from AA{5-digit number} back to AA{number}

-- ============================================================================
-- 1. Revert the generate_seller_number function to original format
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
    
    -- Format as AA{number} (no padding)
    seller_num := 'AA' || next_num::TEXT;
    
    RETURN seller_num;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION generate_seller_number IS 'Generates the next sequential seller number in format AA{number}';

-- ============================================================================
-- 2. Remove the format validation constraint
-- ============================================================================

ALTER TABLE sellers DROP CONSTRAINT IF EXISTS sellers_seller_number_format_check;

-- ============================================================================
-- Rollback Complete
-- ============================================================================
