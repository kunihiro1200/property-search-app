-- Migration 087 Rollback: Restore comments column to sellers table
-- This script restores the comments column that was removed in migration 087

-- ============================================================================
-- 1. Restore comments column to sellers table
-- ============================================================================

-- Add the comments column back with the same data type as in migration 009
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS comments TEXT;

-- ============================================================================
-- 2. Restore column comment documentation
-- ============================================================================

-- Restore the column comment as it was in migration 009
COMMENT ON COLUMN sellers.comments IS 'コメント（ヒアリング内容）';

-- ============================================================================
-- 3. Reload PostgREST schema cache
-- ============================================================================

-- Notify PostgREST to reload its schema cache
NOTIFY pgrst, 'reload schema';

-- ============================================================================
-- Migration 087 Rollback Complete
-- The comments column has been restored to the sellers table
-- ============================================================================
