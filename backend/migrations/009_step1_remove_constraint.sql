-- Migration 009 - Step 1: Remove existing status constraint
-- This must be run first before adding new fields

-- Drop existing constraint (if it exists)
ALTER TABLE sellers DROP CONSTRAINT IF EXISTS sellers_status_check;

-- Verify constraint is removed
SELECT conname, contype, pg_get_constraintdef(oid) as definition
FROM pg_constraint
WHERE conrelid = 'sellers'::regclass
AND conname = 'sellers_status_check';
