-- Migration 087: Remove comments column from sellers table
-- This column was added in migration 009 but does not exist in the spreadsheet
-- Removing it to maintain schema consistency between database and spreadsheet

-- ============================================================================
-- 1. Remove comments column from sellers table
-- ============================================================================

-- Drop the comments column if it exists
ALTER TABLE sellers DROP COLUMN IF EXISTS comments;

-- ============================================================================
-- 2. Reload PostgREST schema cache
-- ============================================================================

-- Notify PostgREST to reload its schema cache
NOTIFY pgrst, 'reload schema';

-- ============================================================================
-- Migration 087 Complete
-- The comments column has been removed from the sellers table
-- ============================================================================
