-- Migration 035: Remove property_type check constraint
-- This allows storing abbreviated property types from the spreadsheet

-- Remove the existing check constraint
ALTER TABLE properties DROP CONSTRAINT IF EXISTS properties_property_type_check;

-- The property_type column will now accept any text value
-- This allows us to store the abbreviated forms from the spreadsheet:
-- "戸" (detached house), "マ" (apartment), "土" (land), etc.
