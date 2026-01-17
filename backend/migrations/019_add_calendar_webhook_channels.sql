-- Migration 019: Add calendar_webhook_channels table
-- This table stores Google Calendar webhook channel registrations for push notifications

CREATE TABLE IF NOT EXISTS calendar_webhook_channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id TEXT NOT NULL UNIQUE,
  resource_id TEXT NOT NULL,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  expiration TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_webhook_channels_employee ON calendar_webhook_channels(employee_id);
CREATE INDEX IF NOT EXISTS idx_webhook_channels_expiration ON calendar_webhook_channels(expiration);
CREATE INDEX IF NOT EXISTS idx_webhook_channels_channel_id ON calendar_webhook_channels(channel_id);

-- Add comment to table
COMMENT ON TABLE calendar_webhook_channels IS 'Stores Google Calendar webhook channel registrations for real-time event notifications';
COMMENT ON COLUMN calendar_webhook_channels.channel_id IS 'Unique channel identifier provided by Google Calendar API';
COMMENT ON COLUMN calendar_webhook_channels.resource_id IS 'Resource identifier for the watched calendar';
COMMENT ON COLUMN calendar_webhook_channels.employee_id IS 'Employee whose calendar is being watched';
COMMENT ON COLUMN calendar_webhook_channels.expiration IS 'When the webhook subscription expires (max 7 days from creation)';
