-- Migration: Add viewing_mobile column to buyers table
-- Date: 2026-02-07
-- Description: Add viewing_mobile field for tracking viewing format (自社物件/他社物件/立会/立会不要)

-- Add viewing_mobile column
ALTER TABLE buyers ADD COLUMN IF NOT EXISTS viewing_mobile TEXT;

-- Add comment
COMMENT ON COLUMN buyers.viewing_mobile IS '内覧形態（自社物件/他社物件/立会/立会不要）';
