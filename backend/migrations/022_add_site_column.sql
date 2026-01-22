-- Migration 022: Add site column to sellers table
-- This migration adds a site field to track the website/channel from which seller inquiries originated

-- Add site column to sellers table
ALTER TABLE sellers ADD COLUMN site VARCHAR(100) NULL;

-- Add index on site column for analytics queries
CREATE INDEX idx_sellers_site ON sellers(site);

-- Add comment to document the column
COMMENT ON COLUMN sellers.site IS 'Website or channel from which the seller inquiry originated (e.g., ウビ, HP, at-home)';
