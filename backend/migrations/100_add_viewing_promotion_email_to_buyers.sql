-- Migration: Add viewing_promotion_email column to buyers table
-- Date: 2026-02-07
-- Description: Add viewing_promotion_email column for tracking viewing promotion email status

-- Add viewing_promotion_email column
ALTER TABLE buyers
ADD COLUMN IF NOT EXISTS viewing_promotion_email TEXT;

-- Add comment
COMMENT ON COLUMN buyers.viewing_promotion_email IS '内覧促進メール（不要）';

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_buyers_viewing_promotion_email ON buyers(viewing_promotion_email);
