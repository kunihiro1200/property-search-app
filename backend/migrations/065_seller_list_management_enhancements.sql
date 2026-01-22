-- Migration: 065_seller_list_management_enhancements
-- Description: Seller List Management - Core tables and indexes
-- Requirements: R1.1-R1.14, R2.1-R2.10, R3.1-R3.8, R4.1-R4.6, R5.1-R5.6, R6.1-R6.7, R7.1-R7.7, R8.1-R8.5, R9.1-R9.5

-- ============================================================================
-- 1. Sellers Table Enhancement
-- ============================================================================
-- Note: sellers table already exists, adding missing columns and indexes

-- Add missing columns to sellers table
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS seller_number VARCHAR(10) UNIQUE;
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS name_encrypted TEXT;
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS phone1_encrypted TEXT;
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS phone2_encrypted TEXT;
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS email_encrypted TEXT;
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS address_encrypted TEXT;
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'new';
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS assigned_employee_id UUID REFERENCES employees(id);
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS next_call_date TIMESTAMP;
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS is_duplicate BOOLEAN DEFAULT FALSE;
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS duplicate_score DECIMAL(5,2);
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;

-- Create indexes for sellers table
CREATE INDEX IF NOT EXISTS idx_sellers_seller_number ON sellers(seller_number);
CREATE INDEX IF NOT EXISTS idx_sellers_phone1 ON sellers(phone1_encrypted);
CREATE INDEX IF NOT EXISTS idx_sellers_phone2 ON sellers(phone2_encrypted);
CREATE INDEX IF NOT EXISTS idx_sellers_email ON sellers(email_encrypted);
CREATE INDEX IF NOT EXISTS idx_sellers_status ON sellers(status);
CREATE INDEX IF NOT EXISTS idx_sellers_next_call_date ON sellers(next_call_date);
CREATE INDEX IF NOT EXISTS idx_sellers_status_next_call ON sellers(status, next_call_date);
CREATE INDEX IF NOT EXISTS idx_sellers_deleted_at ON sellers(deleted_at);

-- ============================================================================
-- 2. Properties Table Enhancement
-- ============================================================================
-- Note: properties table may already exist, ensuring all required columns

-- Add missing columns to properties table
ALTER TABLE properties ADD COLUMN IF NOT EXISTS seller_id UUID REFERENCES sellers(id) ON DELETE CASCADE;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS property_type VARCHAR(50);
ALTER TABLE properties ADD COLUMN IF NOT EXISTS land_area DECIMAL(10,2);
ALTER TABLE properties ADD COLUMN IF NOT EXISTS building_area DECIMAL(10,2);
ALTER TABLE properties ADD COLUMN IF NOT EXISTS building_age INTEGER;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS floor_plan VARCHAR(50);
ALTER TABLE properties ADD COLUMN IF NOT EXISTS structure VARCHAR(50);
ALTER TABLE properties ADD COLUMN IF NOT EXISTS remarks TEXT;

-- Create indexes for properties table
CREATE INDEX IF NOT EXISTS idx_properties_seller_id ON properties(seller_id);
CREATE INDEX IF NOT EXISTS idx_properties_property_type ON properties(property_type);

-- ============================================================================
-- 3. Valuations Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS valuations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
  valuation_amount DECIMAL(15,2) NOT NULL,
  land_valuation DECIMAL(15,2),
  building_valuation DECIMAL(15,2),
  valuation_date DATE NOT NULL,
  valuation_method VARCHAR(50),
  notes TEXT,
  is_abnormal BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_valuations_seller_id ON valuations(seller_id);
CREATE INDEX IF NOT EXISTS idx_valuations_valuation_date ON valuations(valuation_date);

-- ============================================================================
-- 4. Activity Logs Table Enhancement
-- ============================================================================
-- Note: activity_logs table may already exist, ensuring all required columns

ALTER TABLE activity_logs ADD COLUMN IF NOT EXISTS seller_id UUID REFERENCES sellers(id) ON DELETE CASCADE;
ALTER TABLE activity_logs ADD COLUMN IF NOT EXISTS activity_type VARCHAR(50);
ALTER TABLE activity_logs ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE activity_logs ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES employees(id);

CREATE INDEX IF NOT EXISTS idx_activity_logs_seller_id ON activity_logs(seller_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON activity_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_activity_logs_activity_type ON activity_logs(activity_type);

-- ============================================================================
-- 5. Follow-ups Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS follow_ups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
  follow_up_date TIMESTAMP NOT NULL,
  follow_up_type VARCHAR(50) NOT NULL,
  notes TEXT,
  is_completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMP,
  created_by UUID REFERENCES employees(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_follow_ups_seller_id ON follow_ups(seller_id);
CREATE INDEX IF NOT EXISTS idx_follow_ups_follow_up_date ON follow_ups(follow_up_date);
CREATE INDEX IF NOT EXISTS idx_follow_ups_is_completed ON follow_ups(is_completed);

-- ============================================================================
-- 6. Appointments Table Enhancement
-- ============================================================================
-- Note: appointments table may already exist, ensuring all required columns

ALTER TABLE appointments ADD COLUMN IF NOT EXISTS seller_id UUID REFERENCES sellers(id) ON DELETE CASCADE;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS appointment_date TIMESTAMP NOT NULL;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS location TEXT;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS google_calendar_event_id VARCHAR(255);
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS is_cancelled BOOLEAN DEFAULT FALSE;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP;

CREATE INDEX IF NOT EXISTS idx_appointments_seller_id ON appointments(seller_id);
CREATE INDEX IF NOT EXISTS idx_appointments_appointment_date ON appointments(appointment_date);
CREATE INDEX IF NOT EXISTS idx_appointments_google_calendar_event_id ON appointments(google_calendar_event_id);

-- ============================================================================
-- 7. Emails Table Enhancement
-- ============================================================================
-- Note: emails table may already exist, ensuring all required columns

ALTER TABLE emails ADD COLUMN IF NOT EXISTS seller_id UUID REFERENCES sellers(id) ON DELETE CASCADE;
ALTER TABLE emails ADD COLUMN IF NOT EXISTS subject TEXT;
ALTER TABLE emails ADD COLUMN IF NOT EXISTS body TEXT;
ALTER TABLE emails ADD COLUMN IF NOT EXISTS sent_at TIMESTAMP;
ALTER TABLE emails ADD COLUMN IF NOT EXISTS gmail_message_id VARCHAR(255);
ALTER TABLE emails ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'draft';

CREATE INDEX IF NOT EXISTS idx_emails_seller_id ON emails(seller_id);
CREATE INDEX IF NOT EXISTS idx_emails_sent_at ON emails(sent_at);
CREATE INDEX IF NOT EXISTS idx_emails_gmail_message_id ON emails(gmail_message_id);

-- ============================================================================
-- 8. Sync Logs Table Enhancement
-- ============================================================================
-- Note: sync_logs table may already exist, ensuring all required columns

CREATE TABLE IF NOT EXISTS sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sync_type VARCHAR(50) NOT NULL,
  status VARCHAR(50) NOT NULL,
  records_processed INTEGER DEFAULT 0,
  records_succeeded INTEGER DEFAULT 0,
  records_failed INTEGER DEFAULT 0,
  error_message TEXT,
  started_at TIMESTAMP NOT NULL,
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sync_logs_sync_type ON sync_logs(sync_type);
CREATE INDEX IF NOT EXISTS idx_sync_logs_status ON sync_logs(status);
CREATE INDEX IF NOT EXISTS idx_sync_logs_created_at ON sync_logs(created_at);

-- ============================================================================
-- 9. Audit Logs Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name VARCHAR(100) NOT NULL,
  record_id UUID NOT NULL,
  action VARCHAR(50) NOT NULL,
  old_values JSONB,
  new_values JSONB,
  changed_by UUID REFERENCES employees(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_table_name ON audit_logs(table_name);
CREATE INDEX IF NOT EXISTS idx_audit_logs_record_id ON audit_logs(record_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_table_record ON audit_logs(table_name, record_id);

-- ============================================================================
-- Update timestamps trigger
-- ============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to tables
DROP TRIGGER IF EXISTS update_sellers_updated_at ON sellers;
CREATE TRIGGER update_sellers_updated_at
  BEFORE UPDATE ON sellers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_properties_updated_at ON properties;
CREATE TRIGGER update_properties_updated_at
  BEFORE UPDATE ON properties
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_valuations_updated_at ON valuations;
CREATE TRIGGER update_valuations_updated_at
  BEFORE UPDATE ON valuations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_follow_ups_updated_at ON follow_ups;
CREATE TRIGGER update_follow_ups_updated_at
  BEFORE UPDATE ON follow_ups
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
