-- Migration 104: Add Logical Deletion Support for Buyers
-- Adds deleted_at column to buyers table and creates buyer_deletion_audit table

-- ============================================================================
-- 1. Add deleted_at column to buyers table
-- ============================================================================

ALTER TABLE buyers 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Add index for query performance
CREATE INDEX IF NOT EXISTS idx_buyers_deleted_at ON buyers(deleted_at);

-- Add comment
COMMENT ON COLUMN buyers.deleted_at IS '論理削除日時（NULLの場合はアクティブ）';

-- ============================================================================
-- 2. Create buyer_deletion_audit table
-- ============================================================================

CREATE TABLE IF NOT EXISTS buyer_deletion_audit (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  buyer_id UUID,
  buyer_number TEXT NOT NULL,
  deleted_at TIMESTAMP WITH TIME ZONE NOT NULL,
  deleted_by TEXT NOT NULL,
  reason TEXT,
  buyer_data JSONB NOT NULL,
  can_recover BOOLEAN DEFAULT TRUE,
  recovered_at TIMESTAMP WITH TIME ZONE,
  recovered_by TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for query performance
CREATE INDEX IF NOT EXISTS idx_buyer_deletion_audit_buyer_number ON buyer_deletion_audit(buyer_number);
CREATE INDEX IF NOT EXISTS idx_buyer_deletion_audit_deleted_at ON buyer_deletion_audit(deleted_at);
CREATE INDEX IF NOT EXISTS idx_buyer_deletion_audit_recovered_at ON buyer_deletion_audit(recovered_at);
CREATE INDEX IF NOT EXISTS idx_buyer_deletion_audit_can_recover ON buyer_deletion_audit(can_recover);

-- Add comments
COMMENT ON TABLE buyer_deletion_audit IS '買主削除監査ログ';
COMMENT ON COLUMN buyer_deletion_audit.buyer_id IS '買主ID（UUID）';
COMMENT ON COLUMN buyer_deletion_audit.buyer_number IS '買主番号';
COMMENT ON COLUMN buyer_deletion_audit.deleted_at IS '削除日時';
COMMENT ON COLUMN buyer_deletion_audit.deleted_by IS '削除実行者';
COMMENT ON COLUMN buyer_deletion_audit.reason IS '削除理由';
COMMENT ON COLUMN buyer_deletion_audit.buyer_data IS '削除時の買主データ（JSONB）';
COMMENT ON COLUMN buyer_deletion_audit.can_recover IS '復元可能フラグ';
COMMENT ON COLUMN buyer_deletion_audit.recovered_at IS '復元日時';
COMMENT ON COLUMN buyer_deletion_audit.recovered_by IS '復元実行者';

-- ============================================================================
-- Migration Complete
-- ============================================================================
