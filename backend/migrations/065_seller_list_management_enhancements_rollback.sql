-- Rollback Migration: 065_seller_list_management_enhancements
-- Description: Rollback Seller List Management enhancements

-- Drop triggers
DROP TRIGGER IF EXISTS update_follow_ups_updated_at ON follow_ups;
DROP TRIGGER IF EXISTS update_valuations_updated_at ON valuations;
DROP TRIGGER IF EXISTS update_properties_updated_at ON properties;
DROP TRIGGER IF EXISTS update_sellers_updated_at ON sellers;

-- Drop indexes for audit_logs
DROP INDEX IF EXISTS idx_audit_logs_table_record;
DROP INDEX IF EXISTS idx_audit_logs_created_at;
DROP INDEX IF EXISTS idx_audit_logs_record_id;
DROP INDEX IF EXISTS idx_audit_logs_table_name;

-- Drop audit_logs table
DROP TABLE IF EXISTS audit_logs;

-- Drop indexes for sync_logs
DROP INDEX IF EXISTS idx_sync_logs_created_at;
DROP INDEX IF EXISTS idx_sync_logs_status;
DROP INDEX IF EXISTS idx_sync_logs_sync_type;

-- Drop sync_logs table (if created by this migration)
-- Note: Only drop if it was created by this migration
-- DROP TABLE IF EXISTS sync_logs;

-- Drop indexes for emails
DROP INDEX IF EXISTS idx_emails_gmail_message_id;
DROP INDEX IF EXISTS idx_emails_sent_at;
DROP INDEX IF EXISTS idx_emails_seller_id;

-- Drop indexes for appointments
DROP INDEX IF EXISTS idx_appointments_google_calendar_event_id;
DROP INDEX IF EXISTS idx_appointments_appointment_date;
DROP INDEX IF EXISTS idx_appointments_seller_id;

-- Drop indexes for follow_ups
DROP INDEX IF EXISTS idx_follow_ups_is_completed;
DROP INDEX IF EXISTS idx_follow_ups_follow_up_date;
DROP INDEX IF EXISTS idx_follow_ups_seller_id;

-- Drop follow_ups table
DROP TABLE IF EXISTS follow_ups;

-- Drop indexes for activity_logs
DROP INDEX IF EXISTS idx_activity_logs_activity_type;
DROP INDEX IF EXISTS idx_activity_logs_created_at;
DROP INDEX IF EXISTS idx_activity_logs_seller_id;

-- Drop indexes for valuations
DROP INDEX IF EXISTS idx_valuations_valuation_date;
DROP INDEX IF EXISTS idx_valuations_seller_id;

-- Drop valuations table
DROP TABLE IF EXISTS valuations;

-- Drop indexes for properties
DROP INDEX IF EXISTS idx_properties_property_type;
DROP INDEX IF EXISTS idx_properties_seller_id;

-- Drop indexes for sellers
DROP INDEX IF EXISTS idx_sellers_deleted_at;
DROP INDEX IF EXISTS idx_sellers_status_next_call;
DROP INDEX IF EXISTS idx_sellers_next_call_date;
DROP INDEX IF EXISTS idx_sellers_status;
DROP INDEX IF EXISTS idx_sellers_email;
DROP INDEX IF EXISTS idx_sellers_phone2;
DROP INDEX IF EXISTS idx_sellers_phone1;
DROP INDEX IF EXISTS idx_sellers_seller_number;

-- Note: We don't drop columns from existing tables to avoid data loss
-- If you need to remove columns, do it manually after backing up data
