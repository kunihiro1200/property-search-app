-- Migration 066: Add Audit Logs Table
-- Purpose: Create audit_logs table for tracking all data changes
-- Date: 2025-12-30

-- Create audit_logs table
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type VARCHAR(50) NOT NULL CHECK (entity_type IN ('buyer', 'seller', 'property')),
  entity_id UUID NOT NULL,
  field_name VARCHAR(255) NOT NULL,
  old_value TEXT,
  new_value TEXT,
  user_id UUID NOT NULL,
  user_email VARCHAR(255) NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  action VARCHAR(20) NOT NULL CHECK (action IN ('create', 'update', 'delete')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_field ON audit_logs(entity_type, entity_id, field_name);

-- Add comment
COMMENT ON TABLE audit_logs IS 'Audit trail for all data changes in the system';
COMMENT ON COLUMN audit_logs.entity_type IS 'Type of entity being tracked (buyer, seller, property)';
COMMENT ON COLUMN audit_logs.entity_id IS 'ID of the entity being tracked';
COMMENT ON COLUMN audit_logs.field_name IS 'Name of the field that was changed';
COMMENT ON COLUMN audit_logs.old_value IS 'Previous value before change (JSON for complex types)';
COMMENT ON COLUMN audit_logs.new_value IS 'New value after change (JSON for complex types)';
COMMENT ON COLUMN audit_logs.user_id IS 'ID of user who made the change';
COMMENT ON COLUMN audit_logs.user_email IS 'Email of user who made the change';
COMMENT ON COLUMN audit_logs.timestamp IS 'When the change occurred';
COMMENT ON COLUMN audit_logs.action IS 'Type of action (create, update, delete)';
