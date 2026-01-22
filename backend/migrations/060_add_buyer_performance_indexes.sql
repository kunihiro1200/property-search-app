-- Migration 060: Add performance indexes for buyer lookups
-- These indexes optimize related buyer queries and email/phone lookups

-- Index on buyers.email for faster related buyer lookups
CREATE INDEX IF NOT EXISTS idx_buyers_email_lookup 
ON buyers(email) 
WHERE email IS NOT NULL;

-- Index on buyers.phone_number for faster related buyer lookups  
CREATE INDEX IF NOT EXISTS idx_buyers_phone_number_lookup 
ON buyers(phone_number) 
WHERE phone_number IS NOT NULL;

-- Index on buyers.reception_date for faster sorting
CREATE INDEX IF NOT EXISTS idx_buyers_reception_date_desc 
ON buyers(reception_date DESC NULLS LAST);

-- Composite index for email and phone lookups
CREATE INDEX IF NOT EXISTS idx_buyers_email_phone_composite 
ON buyers(email, phone_number) 
WHERE email IS NOT NULL OR phone_number IS NOT NULL;

-- Index on property_listings.property_number for faster joins (if table exists)
DO $$
BEGIN
    IF EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'property_listings'
    ) THEN
        CREATE INDEX IF NOT EXISTS idx_property_listings_property_number 
        ON property_listings(property_number);
    END IF;
END $$;
