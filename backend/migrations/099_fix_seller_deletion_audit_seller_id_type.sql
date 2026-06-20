-- Migration 099: Fix seller_deletion_audit to use seller_number as key (remove seller_id)
-- This migration removes seller_id (UUID) and uses seller_number as the primary key
-- Following the rule: "seller_id is not used, seller_number is the KEY"

-- ============================================================================
-- Part 1: Drop existing seller_deletion_audit table
-- ============================================================================

DROP TABLE IF EXISTS seller_deletion_audit CASCADE;

-- ============================================================================
-- Part 2: Recreate seller_deletion_audit table with seller_number as key
-- ============================================================================

CREATE TABLE seller_deletion_audit (
    id SERIAL PRIMARY KEY,
    seller_number VARCHAR(50) NOT NULL UNIQUE,  -- seller_number is the KEY (not seller_id)
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
COMMENT ON COLUMN seller_deletion_audit.seller_number IS 'Seller number (e.g., AA12345) - PRIMARY KEY for lookups';
COMMENT ON COLUMN seller_deletion_audit.deleted_at IS 'When the seller was deleted';
COMMENT ON COLUMN seller_deletion_audit.deleted_by IS 'Who/what deleted the seller (auto_sync, admin, etc.)';
COMMENT ON COLUMN seller_deletion_audit.reason IS 'Reason for deletion (e.g., "Removed from spreadsheet")';
COMMENT ON COLUMN seller_deletion_audit.seller_data IS 'Full JSON backup of seller data for recovery';
COMMENT ON COLUMN seller_deletion_audit.can_recover IS 'Whether this seller can be recovered';
COMMENT ON COLUMN seller_deletion_audit.recovered_at IS 'When the seller was recovered (if applicable)';
COMMENT ON COLUMN seller_deletion_audit.recovered_by IS 'Who recovered the seller';

-- ============================================================================
-- Part 3: Create indexes for seller_deletion_audit
-- ============================================================================

CREATE INDEX idx_seller_deletion_audit_seller_number ON seller_deletion_audit(seller_number);
CREATE INDEX idx_seller_deletion_audit_deleted_at ON seller_deletion_audit(deleted_at);
CREATE INDEX idx_seller_deletion_audit_can_recover ON seller_deletion_audit(can_recover) WHERE can_recover = TRUE;

-- ============================================================================
-- Verification
-- ============================================================================

DO $$
BEGIN
    -- Verify seller_number is unique
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_name = 'seller_deletion_audit' 
        AND constraint_type = 'UNIQUE'
        AND constraint_name LIKE '%seller_number%'
    ) THEN
        RAISE EXCEPTION 'seller_deletion_audit.seller_number is not unique';
    END IF;
    
    -- Verify seller_id column does NOT exist
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'seller_deletion_audit' 
        AND column_name = 'seller_id'
    ) THEN
        RAISE EXCEPTION 'seller_deletion_audit.seller_id should not exist (use seller_number instead)';
    END IF;
    
    RAISE NOTICE 'Migration 099 completed successfully!';
    RAISE NOTICE 'seller_deletion_audit now uses seller_number as KEY (seller_id removed)';
END $$;
