-- Migration 082: Add Property Listing Sync State Tables
-- Purpose: Track sync operations and provide monitoring capabilities
-- Created: 2025-01-10

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create sync_state table for tracking sync operations
CREATE TABLE IF NOT EXISTS property_listing_sync_state (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sync_type VARCHAR(50) NOT NULL CHECK (sync_type IN ('full', 'selective', 'manual', 'scheduled')),
  status VARCHAR(20) NOT NULL CHECK (status IN ('queued', 'in_progress', 'completed', 'failed', 'partial')),
  started_at TIMESTAMP NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMP,
  total_items INTEGER,
  success_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,
  skipped_count INTEGER DEFAULT 0,
  error_details JSONB,
  metadata JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_sync_state_type ON property_listing_sync_state(sync_type);
CREATE INDEX IF NOT EXISTS idx_sync_state_status ON property_listing_sync_state(status);
CREATE INDEX IF NOT EXISTS idx_sync_state_started_at ON property_listing_sync_state(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_sync_state_completed_at ON property_listing_sync_state(completed_at DESC) WHERE completed_at IS NOT NULL;

-- Create sync_errors table for detailed error tracking
CREATE TABLE IF NOT EXISTS property_listing_sync_errors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sync_id UUID NOT NULL REFERENCES property_listing_sync_state(id) ON DELETE CASCADE,
  property_number VARCHAR(50) NOT NULL,
  error_type VARCHAR(50) NOT NULL,
  error_message TEXT NOT NULL,
  error_stack TEXT,
  retry_count INTEGER DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create indexes for error tracking
CREATE INDEX IF NOT EXISTS idx_sync_errors_sync_id ON property_listing_sync_errors(sync_id);
CREATE INDEX IF NOT EXISTS idx_sync_errors_property_number ON property_listing_sync_errors(property_number);
CREATE INDEX IF NOT EXISTS idx_sync_errors_error_type ON property_listing_sync_errors(error_type);
CREATE INDEX IF NOT EXISTS idx_sync_errors_created_at ON property_listing_sync_errors(created_at DESC);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_sync_state_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS trigger_update_sync_state_updated_at ON property_listing_sync_state;
CREATE TRIGGER trigger_update_sync_state_updated_at
  BEFORE UPDATE ON property_listing_sync_state
  FOR EACH ROW
  EXECUTE FUNCTION update_sync_state_updated_at();

-- Add RLS policies
ALTER TABLE property_listing_sync_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE property_listing_sync_errors ENABLE ROW LEVEL SECURITY;

-- Policy: Allow service role full access
CREATE POLICY "Service role has full access to sync_state"
  ON property_listing_sync_state
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role has full access to sync_errors"
  ON property_listing_sync_errors
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Policy: Allow authenticated users to read sync state
CREATE POLICY "Authenticated users can read sync_state"
  ON property_listing_sync_state
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can read sync_errors"
  ON property_listing_sync_errors
  FOR SELECT
  TO authenticated
  USING (true);

-- Create view for sync statistics
CREATE OR REPLACE VIEW property_listing_sync_statistics AS
SELECT
  DATE_TRUNC('day', started_at) AS sync_date,
  sync_type,
  COUNT(*) AS total_syncs,
  COUNT(*) FILTER (WHERE status = 'completed') AS successful_syncs,
  COUNT(*) FILTER (WHERE status = 'failed') AS failed_syncs,
  COUNT(*) FILTER (WHERE status = 'partial') AS partial_syncs,
  SUM(total_items) AS total_items_processed,
  SUM(success_count) AS total_items_succeeded,
  SUM(failed_count) AS total_items_failed,
  AVG(EXTRACT(EPOCH FROM (completed_at - started_at))) AS avg_duration_seconds,
  MAX(EXTRACT(EPOCH FROM (completed_at - started_at))) AS max_duration_seconds,
  MIN(EXTRACT(EPOCH FROM (completed_at - started_at))) AS min_duration_seconds
FROM property_listing_sync_state
WHERE completed_at IS NOT NULL
GROUP BY DATE_TRUNC('day', started_at), sync_type
ORDER BY sync_date DESC, sync_type;

-- Grant access to view
GRANT SELECT ON property_listing_sync_statistics TO authenticated;
GRANT SELECT ON property_listing_sync_statistics TO service_role;

-- Add comments for documentation
COMMENT ON TABLE property_listing_sync_state IS 'Tracks property listing synchronization operations';
COMMENT ON TABLE property_listing_sync_errors IS 'Stores detailed error information for failed sync items';
COMMENT ON VIEW property_listing_sync_statistics IS 'Aggregated statistics for sync operations';

COMMENT ON COLUMN property_listing_sync_state.sync_type IS 'Type of sync: full, selective, manual, or scheduled';
COMMENT ON COLUMN property_listing_sync_state.status IS 'Current status: queued, in_progress, completed, failed, or partial';
COMMENT ON COLUMN property_listing_sync_state.error_details IS 'JSON object containing error details for failed syncs';
COMMENT ON COLUMN property_listing_sync_state.metadata IS 'JSON object containing additional sync metadata';

COMMENT ON COLUMN property_listing_sync_errors.error_type IS 'Category of error: validation, network, database, etc.';
COMMENT ON COLUMN property_listing_sync_errors.retry_count IS 'Number of times this item was retried';
