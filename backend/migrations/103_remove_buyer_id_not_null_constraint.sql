-- Migration: Remove buyer_id from primary key and make it nullable
-- Reason: buyer_id is not used in the application, buyer_number is the primary key
-- Date: 2026-02-08

-- Step 1: Drop the existing primary key constraint
ALTER TABLE buyers DROP CONSTRAINT IF EXISTS buyers_pkey;

-- Step 2: Add buyer_number as the new primary key
ALTER TABLE buyers ADD PRIMARY KEY (buyer_number);

-- Step 3: Remove NOT NULL constraint from buyer_id (now that it's not in the primary key)
ALTER TABLE buyers ALTER COLUMN buyer_id DROP NOT NULL;

-- Step 4: Add comment to clarify that buyer_id is not used
COMMENT ON COLUMN buyers.buyer_id IS 'Legacy UUID column - not used in application. Primary key is buyer_number.';
