-- Combined Migration: 026 + 053
-- Purpose: Create sync_logs table and add metadata columns

-- ============================================
-- Part 1: Migration 026 - Create sync_logs table
-- ============================================

-- Create sync_logs table
CREATE TABLE IF NOT EXISTS sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sync_type VARCHAR(50) NOT NULL CHECK (sync_type IN ('migration', 'create', 'update', 'delete', 'manual', 'batch')),
  seller_id UUID REFERENCES sellers(id) ON DELETE SET NULL,
  status VARCHAR(20) NOT NULL CHECK (status IN ('success', 'failure', 'pending')),
  error_message TEXT,
  rows_affected INTEGER DEFAULT 0,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  duration_ms INTEGER,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create error_logs table
CREATE TABLE IF NOT EXISTS error_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  error_type VARCHAR(50) NOT NULL CHECK (error_type IN ('network', 'validation', 'rate_limit', 'auth', 'conflict', 'unknown')),
  error_message TEXT NOT NULL,
  stack_trace TEXT,
  seller_id UUID REFERENCES sellers(id) ON DELETE SET NULL,
  operation VARCHAR(50),
  retry_count INTEGER DEFAULT 0,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add synced_to_sheet_at column to sellers table if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'sellers' AND column_name = 'synced_to_sheet_at'
  ) THEN
    ALTER TABLE sellers ADD COLUMN synced_to_sheet_at TIMESTAMP WITH TIME ZONE;
  END IF;
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_sync_logs_seller_id ON sync_logs(seller_id);
CREATE INDEX IF NOT EXISTS idx_sync_logs_sync_type ON sync_logs(sync_type);
CREATE INDEX IF NOT EXISTS idx_sync_logs_status ON sync_logs(status);
CREATE INDEX IF NOT EXISTS idx_sync_logs_started_at ON sync_logs(started_at DESC);

CREATE INDEX IF NOT EXISTS idx_error_logs_seller_id ON error_logs(seller_id);
CREATE INDEX IF NOT EXISTS idx_error_logs_error_type ON error_logs(error_type);
CREATE INDEX IF NOT EXISTS idx_error_logs_created_at ON error_logs(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_sellers_synced_to_sheet_at ON sellers(synced_to_sheet_at);

-- Add comments for 026
COMMENT ON TABLE sync_logs IS 'Tracks all spreadsheet sync operations';
COMMENT ON TABLE error_logs IS 'Tracks all sync-related errors';
COMMENT ON COLUMN sellers.synced_to_sheet_at IS 'Last time this seller was synced to spreadsheet';

-- ============================================
-- Part 2: Migration 053 - Add metadata columns
-- ============================================

-- Add new columns for enhanced sync tracking
DO $$
BEGIN
  -- Add missing_sellers_detected column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'sync_logs' AND column_name = 'missing_sellers_detected'
  ) THEN
    ALTER TABLE sync_logs ADD COLUMN missing_sellers_detected INTEGER DEFAULT 0;
  END IF;

  -- Add triggered_by column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'sync_logs' AND column_name = 'triggered_by'
  ) THEN
    ALTER TABLE sync_logs ADD COLUMN triggered_by VARCHAR(50) DEFAULT 'scheduled';
  END IF;

  -- Add health_status column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'sync_logs' AND column_name = 'health_status'
  ) THEN
    ALTER TABLE sync_logs ADD COLUMN health_status VARCHAR(20) DEFAULT 'unknown';
  END IF;

  -- Add new columns for enhanced auto-sync
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'sync_logs' AND column_name = 'executed_at'
  ) THEN
    ALTER TABLE sync_logs ADD COLUMN executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'sync_logs' AND column_name = 'success'
  ) THEN
    ALTER TABLE sync_logs ADD COLUMN success BOOLEAN DEFAULT true;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'sync_logs' AND column_name = 'new_sellers_count'
  ) THEN
    ALTER TABLE sync_logs ADD COLUMN new_sellers_count INTEGER DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'sync_logs' AND column_name = 'updated_sellers_count'
  ) THEN
    ALTER TABLE sync_logs ADD COLUMN updated_sellers_count INTEGER DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'sync_logs' AND column_name = 'errors_count'
  ) THEN
    ALTER TABLE sync_logs ADD COLUMN errors_count INTEGER DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'sync_logs' AND column_name = 'error_details'
  ) THEN
    ALTER TABLE sync_logs ADD COLUMN error_details TEXT;
  END IF;

  -- Add deletion sync columns
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'sync_logs' AND column_name = 'deleted_sellers_count'
  ) THEN
    ALTER TABLE sync_logs ADD COLUMN deleted_sellers_count INTEGER DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'sync_logs' AND column_name = 'deleted_seller_numbers'
  ) THEN
    ALTER TABLE sync_logs ADD COLUMN deleted_seller_numbers TEXT[];
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'sync_logs' AND column_name = 'manual_review_required'
  ) THEN
    ALTER TABLE sync_logs ADD COLUMN manual_review_required INTEGER DEFAULT 0;
  END IF;
END $$;

-- Create index for health_status
CREATE INDEX IF NOT EXISTS idx_sync_logs_health_status ON sync_logs(health_status);

-- Add comments
COMMENT ON COLUMN sync_logs.missing_sellers_detected IS 'Number of missing sellers detected during this sync operation';
COMMENT ON COLUMN sync_logs.triggered_by IS 'Source that triggered this sync operation';
COMMENT ON COLUMN sync_logs.health_status IS 'Health status of the sync system at the time of this operation';

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Combined migration 026 + 053 completed successfully';
END $$;
