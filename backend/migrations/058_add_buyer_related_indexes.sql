-- Migration: Add indexes for related buyer search
-- Description: Add indexes on phone_number and email columns for efficient related buyer detection
-- Date: 2024-12-29

-- Add index on phone_number for related buyer search
CREATE INDEX IF NOT EXISTS idx_buyers_phone_number 
ON buyers(phone_number) 
WHERE phone_number IS NOT NULL;

-- Add index on email for related buyer search
CREATE INDEX IF NOT EXISTS idx_buyers_email 
ON buyers(email) 
WHERE email IS NOT NULL;

-- Add comment to explain the purpose
COMMENT ON INDEX idx_buyers_phone_number IS 'Index for efficient related buyer detection by phone number';
COMMENT ON INDEX idx_buyers_email IS 'Index for efficient related buyer detection by email address';
