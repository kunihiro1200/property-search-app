-- Migration: Add buyer field sync monitoring tables
-- Purpose: Track field-level sync operations and data recovery for buyer sync issues

-- Create buyer_field_sync_logs table
CREATE TABLE IF NOT EXISTS buyer_field_sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_number TEXT NOT NULL,
  field_name TEXT NOT NULL,
  success BOOLEAN NOT NULL,
  old_value TEXT,
  new_value TEXT,
  error_message TEXT,
  synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_buyer_field_sync_logs_buyer_number 
  ON buyer_field_sync_logs(buyer_number);

CREATE INDEX IF NOT EXISTS idx_buyer_field_sync_logs_field_name 
  ON buyer_field_sync_logs(field_name);

CREATE INDEX IF NOT EXISTS idx_buyer_field_sync_logs_success 
  ON buyer_field_sync_logs(success);

CREATE INDEX IF NOT EXISTS idx_buyer_field_sync_logs_synced_at 
  ON buyer_field_sync_logs(synced_at DESC);

-- Composite index for common queries
CREATE INDEX IF NOT EXISTS idx_buyer_field_sync_logs_field_success_time 
  ON buyer_field_sync_logs(field_name, success, synced_at DESC);

-- Create buyer_data_recovery_logs table
CREATE TABLE IF NOT EXISTS buyer_data_recovery_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_numbers TEXT[],
  field_names TEXT[],
  backup_id TEXT,
  success_count INTEGER DEFAULT 0,
  failure_count INTEGER DEFAULT 0,
  error_details JSONB,
  executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for recovery logs
CREATE INDEX IF NOT EXISTS idx_buyer_data_recovery_logs_executed_at 
  ON buyer_data_recovery_logs(executed_at DESC);

CREATE INDEX IF NOT EXISTS idx_buyer_data_recovery_logs_backup_id 
  ON buyer_data_recovery_logs(backup_id);

-- Create buyer_data_backups table
CREATE TABLE IF NOT EXISTS buyer_data_backups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  backup_id TEXT NOT NULL,
  buyer_number TEXT NOT NULL,
  field_name TEXT NOT NULL,
  old_value TEXT,
  backed_up_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for backups
CREATE INDEX IF NOT EXISTS idx_buyer_data_backups_backup_id 
  ON buyer_data_backups(backup_id);

CREATE INDEX IF NOT EXISTS idx_buyer_data_backups_buyer_number 
  ON buyer_data_backups(buyer_number);

CREATE INDEX IF NOT EXISTS idx_buyer_data_backups_backed_up_at 
  ON buyer_data_backups(backed_up_at DESC);

-- Add comments for documentation
COMMENT ON TABLE buyer_field_sync_logs IS 'Tracks field-level synchronization results for buyers';
COMMENT ON TABLE buyer_data_recovery_logs IS 'Tracks data recovery operations for buyers';
COMMENT ON TABLE buyer_data_backups IS 'Stores backup data before recovery operations';

COMMENT ON COLUMN buyer_field_sync_logs.buyer_number IS 'Buyer number (e.g., "6666")';
COMMENT ON COLUMN buyer_field_sync_logs.field_name IS 'Name of the field being synced';
COMMENT ON COLUMN buyer_field_sync_logs.success IS 'Whether the sync was successful';
COMMENT ON COLUMN buyer_field_sync_logs.old_value IS 'Value before sync';
COMMENT ON COLUMN buyer_field_sync_logs.new_value IS 'Value after sync';
COMMENT ON COLUMN buyer_field_sync_logs.error_message IS 'Error message if sync failed';

COMMENT ON COLUMN buyer_data_recovery_logs.buyer_numbers IS 'Array of buyer numbers recovered';
COMMENT ON COLUMN buyer_data_recovery_logs.field_names IS 'Array of field names recovered';
COMMENT ON COLUMN buyer_data_recovery_logs.backup_id IS 'ID of backup created before recovery';
COMMENT ON COLUMN buyer_data_recovery_logs.success_count IS 'Number of successful recoveries';
COMMENT ON COLUMN buyer_data_recovery_logs.failure_count IS 'Number of failed recoveries';
COMMENT ON COLUMN buyer_data_recovery_logs.error_details IS 'JSON object with error details';

COMMENT ON COLUMN buyer_data_backups.backup_id IS 'Unique identifier for the backup set';
COMMENT ON COLUMN buyer_data_backups.buyer_number IS 'Buyer number being backed up';
COMMENT ON COLUMN buyer_data_backups.field_name IS 'Name of the field being backed up';
COMMENT ON COLUMN buyer_data_backups.old_value IS 'Value at time of backup';
