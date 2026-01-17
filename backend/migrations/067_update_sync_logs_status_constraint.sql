-- Migration 067: Update sync_logs status constraint
-- Purpose: Update status column to match current database constraint

-- Drop old constraint
ALTER TABLE sync_logs 
DROP CONSTRAINT IF EXISTS sync_logs_status_check;

-- Add new constraint with correct values
ALTER TABLE sync_logs 
ADD CONSTRAINT sync_logs_status_check 
CHECK (status IN ('pending', 'in_progress', 'success', 'failed'));

-- Add comment
COMMENT ON COLUMN sync_logs.status IS 'Status of the sync operation: pending, in_progress, success, or failed';
