-- Migration 033: Make property_type nullable in properties table
-- This allows properties to be created even when property_type is not specified in the spreadsheet

-- Remove NOT NULL constraint from property_type
ALTER TABLE properties 
ALTER COLUMN property_type DROP NOT NULL;

-- Also remove the CHECK constraint that limits property_type values
-- First, we need to find and drop the existing constraint
DO $$ 
DECLARE
    constraint_name TEXT;
BEGIN
    -- Find the constraint name
    SELECT conname INTO constraint_name
    FROM pg_constraint
    WHERE conrelid = 'properties'::regclass
    AND contype = 'c'
    AND pg_get_constraintdef(oid) LIKE '%property_type%';
    
    -- Drop the constraint if it exists
    IF constraint_name IS NOT NULL THEN
        EXECUTE format('ALTER TABLE properties DROP CONSTRAINT %I', constraint_name);
    END IF;
END $$;

-- Add a new CHECK constraint that allows NULL values
ALTER TABLE properties 
ADD CONSTRAINT properties_property_type_check 
CHECK (property_type IS NULL OR property_type IN ('detached_house', 'apartment', 'land', 'commercial', '戸建', 'マンション', '土地', '事業用'));

COMMENT ON COLUMN properties.property_type IS 'Property type - can be NULL if not specified. Accepts both English and Japanese values.';
