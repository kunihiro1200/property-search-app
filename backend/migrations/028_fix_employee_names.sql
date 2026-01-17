-- Migration 028: Fix employee names
-- This migration identifies and fixes employee records with invalid names
-- (encrypted strings, "不明", email addresses, etc.)

-- Note: This SQL file is for reference only.
-- The actual migration is performed by run-028-migration.ts
-- which queries Supabase Auth for correct user metadata.

-- The migration will:
-- 1. Identify employees with invalid names
-- 2. Query Supabase Auth for user metadata
-- 3. Extract proper names using the enhanced name extraction logic
-- 4. Update employee records with corrected names
