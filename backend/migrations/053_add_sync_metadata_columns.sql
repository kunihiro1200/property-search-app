-- Migration 053: Add sync metadata columns to sync_logs
-- Purpose: Track additional metadata for sync operations including missing sellers, trigger source, and health status

-- Add missing_sellers_detected column
ALTER TABLE sync_logs 
ADD COLUMN IF NOT EXISTS missing_sellers_detected INTEGER DEFAULT 0;

-- Add triggered_by column
ALTER TABLE sync_logs 
ADD COLUMN IF NOT EXISTS triggered_by VARCHAR(50) CHECK (triggered_by IN ('auto', 'manual', 'startup', 'scheduled', 'api'));

-- Add health_status column
ALTER TABLE sync_logs 
ADD COLUMN IF NOT EXISTS health_status VARCHAR(20) CHECK (health_status IN ('healthy', 'unhealthy', 'unknown'));

-- Create indexes for new columns
CREATE INDEX IF NOT EXISTS idx_sync_logs_triggered_by ON sync_logs(triggered_by);
CREATE INDEX IF NOT EXISTS idx_sync_logs_health_status ON sync_logs(health_status);

-- Add comments
COMMENT ON COLUMN sync_logs.missing_sellers_detected IS 'Number of missing sellers detected during this sync operation';
COMMENT ON COLUMN sync_logs.triggered_by IS 'Source that triggered this sync operation';
COMMENT ON COLUMN sync_logs.health_status IS 'Health status of the sync system at the time of this operation';
