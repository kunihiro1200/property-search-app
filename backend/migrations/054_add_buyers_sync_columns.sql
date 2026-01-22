-- Migration 054: Add missing sync columns to buyers table
-- These columns are needed by BuyerSyncService but were missing from the original table creation

ALTER TABLE buyers
  ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMP WITH TIME ZONE;

-- Create index for sync queries
CREATE INDEX IF NOT EXISTS idx_buyers_last_synced_at ON buyers(last_synced_at DESC);
