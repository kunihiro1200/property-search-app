-- Migration: 039_add_sync_health
-- Description: Add sync_health table and extend sync_logs for auto-sync reliability

-- Create sync_health table for monitoring sync status
CREATE TABLE IF NOT EXISTS sync_health (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  last_sync_time TIMESTAMP WITH TIME ZONE,
  last_sync_success BOOLEAN DEFAULT false,
  pending_missing_sellers INTEGER DEFAULT 0,
  consecutive_failures INTEGER DEFAULT 0,
  is_healthy BOOLEAN DEFAULT true,
  sync_interval_minutes INTEGER DEFAULT 5,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert initial record if not exists (let id auto-generate)
INSERT INTO sync_health (is_healthy, sync_interval_minutes, created_at, updated_at)
SELECT true, 5, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM sync_health LIMIT 1);

-- Add new columns to sync_logs if they don't exist
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
    ALTER TABLE sync_logs ADD COLUMN triggered_by VARCHAR(20) DEFAULT 'scheduled';
  END IF;

  -- Add health_status column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'sync_logs' AND column_name = 'health_status'
  ) THEN
    ALTER TABLE sync_logs ADD COLUMN health_status VARCHAR(20) DEFAULT 'healthy';
  END IF;
END $$;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_sync_logs_started_at_desc ON sync_logs(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_sync_logs_status_idx ON sync_logs(status);
