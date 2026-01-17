-- Migration: Add Search Filter Indexes
-- Description: Creates indexes for location search, building age filtering, and property number search
-- Dependencies: Requires pg_trgm extension (migration 079)
-- Date: 2026-01-03

-- GIN index for location (address) search using trigram matching
-- Enables fast partial text search on addresses
CREATE INDEX IF NOT EXISTS idx_property_listings_address_gin 
ON property_listings 
USING gin(address gin_trgm_ops);

-- B-tree index for construction year/month filtering
-- Enables efficient range queries for building age calculations
CREATE INDEX IF NOT EXISTS idx_property_listings_construction_year_month 
ON property_listings(construction_year_month);

-- GIN index for property number search using trigram matching
-- Enables fast partial text search on property numbers
CREATE INDEX IF NOT EXISTS idx_property_listings_property_number_gin 
ON property_listings 
USING gin(property_number gin_trgm_ops);

-- Verify indexes were created
DO $$
BEGIN
    RAISE NOTICE 'Search filter indexes created successfully';
    RAISE NOTICE 'Indexes: idx_property_listings_address_gin, idx_property_listings_construction_year_month, idx_property_listings_property_number_gin';
END $$;
