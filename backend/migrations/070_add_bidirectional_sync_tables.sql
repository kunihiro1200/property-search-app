-- Migration: 070_add_bidirectional_sync_tables
-- Description: Add tables for buyer bidirectional sync feature
-- Date: 2025-12-31

-- Create pending_sync_changes table for failed sync operations
CREATE TABLE IF NOT EXISTS pending_sync_changes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    buyer_number VARCHAR(50) NOT NULL,
    field_name VARCHAR(100) NOT NULL,
    old_value TEXT,
    new_value TEXT,
    attempted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    retry_count INTEGER DEFAULT 0,
    last_error TEXT,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for pending_sync_changes
CREATE INDEX IF NOT EXISTS idx_pending_sync_changes_status ON pending_sync_changes(status);
CREATE INDEX IF NOT EXISTS idx_pending_sync_changes_buyer_number ON pending_sync_changes(buyer_number);
CREATE INDEX IF NOT EXISTS idx_pending_sync_changes_created_at ON pending_sync_changes(created_at);

-- Add sync_status column to audit_logs table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'audit_logs' AND column_name = 'sync_status'
    ) THEN
        ALTER TABLE audit_logs ADD COLUMN sync_status VARCHAR(20) DEFAULT 'synced' 
            CHECK (sync_status IN ('synced', 'pending', 'failed'));
    END IF;
END $$;

-- Create index for sync_status on audit_logs
CREATE INDEX IF NOT EXISTS idx_audit_logs_sync_status ON audit_logs(sync_status);

-- Add trigger to update updated_at on pending_sync_changes
CREATE OR REPLACE FUNCTION update_pending_sync_changes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_pending_sync_changes_updated_at ON pending_sync_changes;
CREATE TRIGGER trigger_update_pending_sync_changes_updated_at
    BEFORE UPDATE ON pending_sync_changes
    FOR EACH ROW
    EXECUTE FUNCTION update_pending_sync_changes_updated_at();

-- Grant permissions
GRANT ALL ON pending_sync_changes TO authenticated;
GRANT ALL ON pending_sync_changes TO service_role;
