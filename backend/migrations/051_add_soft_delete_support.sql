-- Migration 051: Add Soft Delete Support for Spreadsheet Deletion Sync
-- This migration adds soft delete functionality to sellers and properties tables
-- and creates an audit table for tracking deletions
-- Note: Delete tracking columns removed per user requirement (deletions handled via spreadsheet)

-- ============================================================================
-- Part 1: Add deleted_at column to sellers table
-- ============================================================================

ALTER TABLE sellers 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

COMMENT ON COLUMN sellers.deleted_at IS 'Timestamp when the seller was soft-deleted from spreadsheet. NULL means active.';

-- Create index for deleted_at column
CREATE INDEX IF NOT EXISTS idx_sellers_deleted_at ON sellers(deleted_at);

-- Create partial index for active sellers (most common query)
CREATE INDEX IF NOT EXISTS idx_sellers_active ON sellers(id) WHERE deleted_at IS NULL;

-- ============================================================================
-- Part 2: Add deleted_at column to properties table
-- ============================================================================

ALTER TABLE properties 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

COMMENT ON COLUMN properties.deleted_at IS 'Timestamp when the property was soft-deleted (cascaded from seller). NULL means active.';

-- Create index for deleted_at column
CREATE INDEX IF NOT EXISTS idx_properties_deleted_at ON properties(deleted_at);

-- Create partial index for active properties
CREATE INDEX IF NOT EXISTS idx_properties_active ON properties(id) WHERE deleted_at IS NULL;

-- ============================================================================
-- Part 3: Create seller_deletion_audit table
-- ============================================================================

CREATE TABLE IF NOT EXISTS seller_deletion_audit (
    id SERIAL PRIMARY KEY,
    seller_id INTEGER NOT NULL,
    seller_number VARCHAR(50) NOT NULL,
    deleted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    deleted_by VARCHAR(100) DEFAULT 'auto_sync',
    reason TEXT,
    seller_data JSONB NOT NULL,
    can_recover BOOLEAN DEFAULT TRUE,
    recovered_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    recovered_by VARCHAR(100) DEFAULT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE seller_deletion_audit IS 'Audit log for all seller deletions with full backup data for recovery';
COMMENT ON COLUMN seller_deletion_audit.seller_id IS 'Original seller ID from sellers table';
COMMENT ON COLUMN seller_deletion_audit.seller_number IS 'Seller number (e.g., AA12345) for easy lookup';
COMMENT ON COLUMN seller_deletion_audit.deleted_at IS 'When the seller was deleted';
COMMENT ON COLUMN seller_deletion_audit.deleted_by IS 'Who/what deleted the seller (auto_sync, admin, etc.)';
COMMENT ON COLUMN seller_deletion_audit.reason IS 'Reason for deletion (e.g., "Removed from spreadsheet")';
COMMENT ON COLUMN seller_deletion_audit.seller_data IS 'Full JSON backup of seller data for recovery';
COMMENT ON COLUMN seller_deletion_audit.can_recover IS 'Whether this seller can be recovered';
COMMENT ON COLUMN seller_deletion_audit.recovered_at IS 'When the seller was recovered (if applicable)';
COMMENT ON COLUMN seller_deletion_audit.recovered_by IS 'Who recovered the seller';

-- Create indexes for seller_deletion_audit
CREATE INDEX IF NOT EXISTS idx_seller_deletion_audit_seller_number ON seller_deletion_audit(seller_number);
CREATE INDEX IF NOT EXISTS idx_seller_deletion_audit_deleted_at ON seller_deletion_audit(deleted_at);
CREATE INDEX IF NOT EXISTS idx_seller_deletion_audit_seller_id ON seller_deletion_audit(seller_id);
CREATE INDEX IF NOT EXISTS idx_seller_deletion_audit_can_recover ON seller_deletion_audit(can_recover) WHERE can_recover = TRUE;

-- ============================================================================
-- Verification queries (for testing)
-- ============================================================================

-- Verify sellers table has deleted_at column
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'sellers' AND column_name = 'deleted_at'
    ) THEN
        RAISE EXCEPTION 'sellers.deleted_at column not created';
    END IF;
END $$;

-- Verify properties table has deleted_at column
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'properties' AND column_name = 'deleted_at'
    ) THEN
        RAISE EXCEPTION 'properties.deleted_at column not created';
    END IF;
END $$;

-- Verify seller_deletion_audit table exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'seller_deletion_audit'
    ) THEN
        RAISE EXCEPTION 'seller_deletion_audit table not created';
    END IF;
END $$;

-- ============================================================================
-- Success message
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE 'Migration 051 completed successfully!';
    RAISE NOTICE 'Added soft delete support to sellers and properties tables';
    RAISE NOTICE 'Created seller_deletion_audit table for tracking deletions';
END $$;
