-- Migration: Add performance indexes for buyer detail API
-- Purpose: Improve query performance for related buyers and inquiry history
-- Date: 2025-01-XX

-- Add index on buyers.email for related buyer lookups
CREATE INDEX IF NOT EXISTS idx_buyers_email 
ON buyers(email) 
WHERE email IS NOT NULL;

-- Add index on buyers.phone_number for related buyer lookups
CREATE INDEX IF NOT EXISTS idx_buyers_phone_number 
ON buyers(phone_number) 
WHERE phone_number IS NOT NULL;

-- Add index on buyers.reception_date for sorting inquiry history
CREATE INDEX IF NOT EXISTS idx_buyers_reception_date_desc 
ON buyers(reception_date DESC NULLS LAST);

-- Add index on property_listings.property_number for inquiry history joins
CREATE INDEX IF NOT EXISTS idx_property_listings_property_number 
ON property_listings(property_number) 
WHERE property_number IS NOT NULL;

-- Add composite index for buyer lookups by email and phone
CREATE INDEX IF NOT EXISTS idx_buyers_email_phone 
ON buyers(email, phone_number) 
WHERE email IS NOT NULL OR phone_number IS NOT NULL;

-- Verify indexes were created
DO $$
BEGIN
  RAISE NOTICE 'Indexes created successfully for buyer detail API performance';
END $$;
