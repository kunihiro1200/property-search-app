-- Migration 074: Add rate limit log table
-- Purpose: Track API request rates for rate limiting

-- Create rate_limit_log table
CREATE TABLE IF NOT EXISTS rate_limit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL,
  ip TEXT NOT NULL,
  path TEXT NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index for efficient querying
CREATE INDEX IF NOT EXISTS idx_rate_limit_log_key_timestamp 
  ON rate_limit_log(key, timestamp DESC);

-- Create index for cleanup queries
CREATE INDEX IF NOT EXISTS idx_rate_limit_log_timestamp 
  ON rate_limit_log(timestamp);

-- Add comment
COMMENT ON TABLE rate_limit_log IS 'Tracks API requests for rate limiting purposes';
COMMENT ON COLUMN rate_limit_log.key IS 'Unique key combining endpoint and IP address';
COMMENT ON COLUMN rate_limit_log.ip IS 'Client IP address';
COMMENT ON COLUMN rate_limit_log.path IS 'API endpoint path';
COMMENT ON COLUMN rate_limit_log.timestamp IS 'Request timestamp';
