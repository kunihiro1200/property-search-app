-- Migration 012: Make prefecture and city nullable in properties table
-- This allows creating properties without specifying prefecture and city

-- Make prefecture nullable
ALTER TABLE properties 
ALTER COLUMN prefecture DROP NOT NULL;

-- Make city nullable
ALTER TABLE properties 
ALTER COLUMN city DROP NOT NULL;

-- Add comment
COMMENT ON COLUMN properties.prefecture IS 'Prefecture (optional)';
COMMENT ON COLUMN properties.city IS 'City (optional)';
