-- Migration 020: Add calendar_sync_tokens table
-- This table stores sync tokens for incremental calendar synchronization

CREATE TABLE IF NOT EXISTS calendar_sync_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  sync_token TEXT NOT NULL,
  last_sync_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(employee_id)
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_sync_tokens_employee ON calendar_sync_tokens(employee_id);
CREATE INDEX IF NOT EXISTS idx_sync_tokens_last_sync ON calendar_sync_tokens(last_sync_at);

-- Add comments to table
COMMENT ON TABLE calendar_sync_tokens IS 'Stores sync tokens for incremental Google Calendar synchronization';
COMMENT ON COLUMN calendar_sync_tokens.employee_id IS 'Employee whose calendar sync token this is';
COMMENT ON COLUMN calendar_sync_tokens.sync_token IS 'Token provided by Google Calendar API for incremental sync';
COMMENT ON COLUMN calendar_sync_tokens.last_sync_at IS 'Timestamp of the last successful sync operation';
