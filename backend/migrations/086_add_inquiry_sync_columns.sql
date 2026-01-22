-- Add sync status columns to property_inquiries table for buyer sheet synchronization
-- Migration 086: Add inquiry sync columns

-- Add sync status columns
ALTER TABLE property_inquiries
ADD COLUMN IF NOT EXISTS sheet_sync_status VARCHAR(20) DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS sheet_sync_error_message TEXT,
ADD COLUMN IF NOT EXISTS sheet_row_number INTEGER,
ADD COLUMN IF NOT EXISTS sheet_synced_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS sync_retry_count INTEGER DEFAULT 0;

-- Add index for efficient querying of pending inquiries
CREATE INDEX IF NOT EXISTS idx_property_inquiries_sync_status 
ON property_inquiries(sheet_sync_status, created_at);

-- Add comments for documentation
COMMENT ON COLUMN property_inquiries.sheet_sync_status IS '買主リストへの同期ステータス（pending, synced, failed）';
COMMENT ON COLUMN property_inquiries.sheet_sync_error_message IS '同期エラーメッセージ';
COMMENT ON COLUMN property_inquiries.sheet_row_number IS '買主リストの転記先行番号';
COMMENT ON COLUMN property_inquiries.sheet_synced_at IS '買主リストへの転記完了日時';
COMMENT ON COLUMN property_inquiries.sync_retry_count IS '同期再試行回数';
