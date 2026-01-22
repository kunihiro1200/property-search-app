-- Rollback Migration 051: Remove Soft Delete Support
-- This script reverses all changes made in 051_add_soft_delete_support.sql

-- ============================================================================
-- Part 1: Remove sync_logs columns
-- ============================================================================

ALTER TABLE sync_logs 
DROP COLUMN IF EXISTS deleted_seller_numbers;

ALTER TABLE sync_logs 
DROP COLUMN IF EXISTS deleted_sellers_count;

-- ============================================================================
-- Part 2: Drop seller_deletion_audit table
-- ============================================================================

DROP TABLE IF EXISTS seller_deletion_audit CASCADE;

-- ============================================================================
-- Part 3: Remove deleted_at from properties table
-- ============================================================================

-- Drop indexes first
DROP INDEX IF EXISTS idx_properties_active;
DROP INDEX IF EXISTS idx_properties_deleted_at;

-- Drop column
ALTER TABLE properties 
DROP COLUMN IF EXISTS deleted_at;

-- ============================================================================
-- Part 4: Remove deleted_at from sellers table
-- ============================================================================

-- Drop indexes first
DROP INDEX IF EXISTS idx_sellers_active;
DROP INDEX IF EXISTS idx_sellers_deleted_at;

-- Drop column
ALTER TABLE sellers 
DROP COLUMN IF EXISTS deleted_at;

-- ============================================================================
-- Success message
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE 'Migration 051 rollback completed successfully!';
    RAISE NOTICE 'Removed soft delete support from sellers and properties tables';
    RAISE NOTICE 'Dropped seller_deletion_audit table';
    RAISE NOTICE 'Removed deletion tracking from sync_logs table';
END $$;
