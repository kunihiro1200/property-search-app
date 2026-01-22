-- Migration 008: Phase 1 Data Migration
-- This migration handles data migration for existing sellers table data
-- Run this AFTER migration 007 if you have existing data

-- Step 1: Generate seller numbers for existing sellers (if any)
-- This will assign sequential seller numbers starting from AA00001

DO $$
DECLARE
  seller_record RECORD;
  next_number INTEGER := 1;
  seller_num VARCHAR(7);
BEGIN
  -- Only process sellers without seller_number
  FOR seller_record IN 
    SELECT id FROM sellers 
    WHERE seller_number IS NULL 
    ORDER BY created_at ASC
  LOOP
    -- Generate seller number
    seller_num := 'AA' || LPAD(next_number::TEXT, 5, '0');
    
    -- Update seller
    UPDATE sellers 
    SET seller_number = seller_num 
    WHERE id = seller_record.id;
    
    -- Increment counter
    next_number := next_number + 1;
  END LOOP;
  
  -- Update sequence to match
  IF next_number > 1 THEN
    UPDATE seller_number_sequence 
    SET current_number = next_number - 1 
    WHERE id = 1;
    
    RAISE NOTICE 'Assigned seller numbers to % existing sellers', next_number - 1;
  ELSE
    RAISE NOTICE 'No existing sellers found without seller numbers';
  END IF;
END $$;

-- Step 2: Set default values for new Phase 1 fields
UPDATE sellers
SET 
  is_unreachable = COALESCE(is_unreachable, FALSE),
  duplicate_confirmed = COALESCE(duplicate_confirmed, FALSE),
  price_loss_list_entered = COALESCE(price_loss_list_entered, FALSE),
  version = COALESCE(version, 1)
WHERE 
  is_unreachable IS NULL 
  OR duplicate_confirmed IS NULL 
  OR price_loss_list_entered IS NULL
  OR version IS NULL;

-- Step 3: Migrate existing confidence field to confidence_level (if applicable)
-- Uncomment and adjust if you have an existing confidence field with different name
-- UPDATE sellers
-- SET confidence_level = 
--   CASE 
--     WHEN old_confidence_field = 'high' THEN 'A'
--     WHEN old_confidence_field = 'medium' THEN 'B'
--     WHEN old_confidence_field = 'low' THEN 'C'
--     ELSE confidence_level
--   END
-- WHERE confidence_level IS NULL AND old_confidence_field IS NOT NULL;

-- Step 4: Migrate existing inquiry data (if applicable)
-- Uncomment and adjust if you have existing inquiry fields with different names
-- UPDATE sellers
-- SET 
--   inquiry_source = COALESCE(inquiry_source, old_inquiry_source_field),
--   inquiry_year = COALESCE(inquiry_year, EXTRACT(YEAR FROM old_inquiry_date_field)::INTEGER),
--   inquiry_date = COALESCE(inquiry_date, old_inquiry_date_field::DATE),
--   inquiry_datetime = COALESCE(inquiry_datetime, old_inquiry_datetime_field)
-- WHERE 
--   (inquiry_source IS NULL AND old_inquiry_source_field IS NOT NULL)
--   OR (inquiry_year IS NULL AND old_inquiry_date_field IS NOT NULL)
--   OR (inquiry_date IS NULL AND old_inquiry_date_field IS NOT NULL)
--   OR (inquiry_datetime IS NULL AND old_inquiry_datetime_field IS NOT NULL);

-- Step 5: Create indexes on migrated data (if not already created)
-- These are already in migration 007, but we rerun to ensure they exist
CREATE INDEX IF NOT EXISTS idx_sellers_seller_number ON sellers(seller_number);
CREATE INDEX IF NOT EXISTS idx_sellers_inquiry_source ON sellers(inquiry_source);
CREATE INDEX IF NOT EXISTS idx_sellers_inquiry_year ON sellers(inquiry_year);
CREATE INDEX IF NOT EXISTS idx_sellers_is_unreachable ON sellers(is_unreachable);
CREATE INDEX IF NOT EXISTS idx_sellers_confidence_level ON sellers(confidence_level);
CREATE INDEX IF NOT EXISTS idx_sellers_duplicate_confirmed ON sellers(duplicate_confirmed);

-- Step 6: Analyze tables for query optimization
ANALYZE sellers;
ANALYZE seller_number_sequence;
ANALYZE seller_history;

-- Step 7: Verify data integrity
DO $$
DECLARE
  seller_count INTEGER;
  sellers_without_number INTEGER;
  duplicate_seller_numbers INTEGER;
BEGIN
  -- Count total sellers
  SELECT COUNT(*) INTO seller_count FROM sellers;
  
  -- Count sellers without seller_number
  SELECT COUNT(*) INTO sellers_without_number 
  FROM sellers 
  WHERE seller_number IS NULL;
  
  -- Count duplicate seller numbers
  SELECT COUNT(*) INTO duplicate_seller_numbers
  FROM (
    SELECT seller_number, COUNT(*) as cnt
    FROM sellers
    WHERE seller_number IS NOT NULL
    GROUP BY seller_number
    HAVING COUNT(*) > 1
  ) duplicates;
  
  -- Report results
  RAISE NOTICE '=== Data Migration Verification ===';
  RAISE NOTICE 'Total sellers: %', seller_count;
  RAISE NOTICE 'Sellers without seller_number: %', sellers_without_number;
  RAISE NOTICE 'Duplicate seller numbers: %', duplicate_seller_numbers;
  
  -- Raise error if data integrity issues found
  IF sellers_without_number > 0 THEN
    RAISE EXCEPTION 'Data integrity error: % sellers without seller_number', sellers_without_number;
  END IF;
  
  IF duplicate_seller_numbers > 0 THEN
    RAISE EXCEPTION 'Data integrity error: % duplicate seller numbers found', duplicate_seller_numbers;
  END IF;
  
  RAISE NOTICE 'Data migration completed successfully!';
END $$;

-- Step 8: Add comments for documentation
COMMENT ON COLUMN sellers.seller_number IS 'Migrated: Unique seller identifier in format AA{5-digit number}';
COMMENT ON COLUMN sellers.inquiry_source IS 'Migrated: Source of inquiry (e.g., ウ for Ieul, L for Lifull)';
COMMENT ON COLUMN sellers.confidence_level IS 'Migrated: Seller confidence level (A, B, B_PRIME, C, D, E, DUPLICATE)';
COMMENT ON COLUMN sellers.is_unreachable IS 'Migrated: Flag indicating if seller is currently unreachable';
COMMENT ON COLUMN sellers.duplicate_confirmed IS 'Migrated: Flag indicating if duplicate status has been confirmed';
COMMENT ON COLUMN sellers.version IS 'Migrated: Version number for optimistic locking';
