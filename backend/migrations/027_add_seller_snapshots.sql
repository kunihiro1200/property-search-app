-- Migration 027: Add seller snapshots table for rollback functionality
-- This migration creates a table to store snapshots of seller data for rollback purposes

-- Create seller_snapshots table
CREATE TABLE IF NOT EXISTS seller_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_count INTEGER NOT NULL,
  description TEXT,
  snapshot_data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  metadata JSONB
);

-- Create index on created_at for faster queries
CREATE INDEX IF NOT EXISTS idx_seller_snapshots_created_at ON seller_snapshots(created_at DESC);

-- Add comment
COMMENT ON TABLE seller_snapshots IS 'Stores snapshots of seller data for rollback functionality';
COMMENT ON COLUMN seller_snapshots.snapshot_data IS 'Complete seller data at the time of snapshot';
COMMENT ON COLUMN seller_snapshots.seller_count IS 'Number of sellers in the snapshot';
