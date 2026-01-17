-- Migration 057: Add buyer sync logs table
-- Purpose: Track buyer sync operations from Google Sheets

-- Create buyer_sync_logs table
CREATE TABLE IF NOT EXISTS buyer_sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sync_started_at TIMESTAMPTZ NOT NULL,
  sync_completed_at TIMESTAMPTZ,
  total_buyers INTEGER NOT NULL,
  created_count INTEGER DEFAULT 0,
  updated_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,
  skipped_count INTEGER DEFAULT 0,
  success_rate DECIMAL(5,2),
  duration_ms INTEGER,
  errors JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_buyer_sync_logs_started_at ON buyer_sync_logs(sync_started_at DESC);
CREATE INDEX IF NOT EXISTS idx_buyer_sync_logs_created_at ON buyer_sync_logs(created_at DESC);

-- Add comments
COMMENT ON TABLE buyer_sync_logs IS 'Tracks all buyer sync operations from Google Sheets';
COMMENT ON COLUMN buyer_sync_logs.sync_started_at IS 'When the sync operation started';
COMMENT ON COLUMN buyer_sync_logs.sync_completed_at IS 'When the sync operation completed';
COMMENT ON COLUMN buyer_sync_logs.total_buyers IS 'Total number of buyers processed';
COMMENT ON COLUMN buyer_sync_logs.created_count IS 'Number of buyers created';
COMMENT ON COLUMN buyer_sync_logs.updated_count IS 'Number of buyers updated';
COMMENT ON COLUMN buyer_sync_logs.failed_count IS 'Number of buyers that failed to sync';
COMMENT ON COLUMN buyer_sync_logs.skipped_count IS 'Number of buyers skipped';
COMMENT ON COLUMN buyer_sync_logs.success_rate IS 'Success rate as percentage';
COMMENT ON COLUMN buyer_sync_logs.duration_ms IS 'Duration of sync operation in milliseconds';
COMMENT ON COLUMN buyer_sync_logs.errors IS 'Array of error details in JSON format';
