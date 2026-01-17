-- Migration 007: Phase 1 Seller List Management Enhancements
-- This migration adds all Phase 1 fields to the sellers table and creates necessary indexes

-- Add Phase 1 fields to sellers table
ALTER TABLE sellers
  -- Seller Number (AA + 5 digits)
  ADD COLUMN IF NOT EXISTS seller_number VARCHAR(7) UNIQUE,
  
  -- Inquiry Information
  ADD COLUMN IF NOT EXISTS inquiry_source VARCHAR(50),
  ADD COLUMN IF NOT EXISTS inquiry_year INTEGER,
  ADD COLUMN IF NOT EXISTS inquiry_date DATE,
  ADD COLUMN IF NOT EXISTS inquiry_datetime TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS inquiry_reason TEXT,
  ADD COLUMN IF NOT EXISTS site_url TEXT,
  ADD COLUMN IF NOT EXISTS number_of_companies INTEGER,
  
  -- Contact Information
  ADD COLUMN IF NOT EXISTS requestor_address TEXT,
  ADD COLUMN IF NOT EXISTS preferred_contact_time TEXT,
  
  -- Follow-up Status
  ADD COLUMN IF NOT EXISTS is_unreachable BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS unreachable_since TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS second_call_after_unreachable BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS contact_method VARCHAR(20),
  
  -- Assignment
  ADD COLUMN IF NOT EXISTS first_caller_initials VARCHAR(10),
  ADD COLUMN IF NOT EXISTS first_caller_employee_id UUID REFERENCES employees(id),
  ADD COLUMN IF NOT EXISTS valuation_assignee VARCHAR(100),
  ADD COLUMN IF NOT EXISTS phone_assignee VARCHAR(100),
  
  -- Confidence Level
  ADD COLUMN IF NOT EXISTS confidence_level VARCHAR(20),
  
  -- Duplicate Management
  ADD COLUMN IF NOT EXISTS duplicate_confirmed BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS duplicate_confirmed_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS duplicate_confirmed_by UUID REFERENCES employees(id),
  ADD COLUMN IF NOT EXISTS past_owner_info TEXT,
  ADD COLUMN IF NOT EXISTS past_property_info TEXT,
  ADD COLUMN IF NOT EXISTS seller_copy VARCHAR(7), -- Reference to copied seller number
  ADD COLUMN IF NOT EXISTS buyer_copy VARCHAR(7), -- Reference to copied buyer number
  ADD COLUMN IF NOT EXISTS purchase_info TEXT,
  
  -- Valuation Information
  ADD COLUMN IF NOT EXISTS valuation_amount_1 DECIMAL(15, 2),
  ADD COLUMN IF NOT EXISTS valuation_amount_2 DECIMAL(15, 2),
  ADD COLUMN IF NOT EXISTS valuation_amount_3 DECIMAL(15, 2),
  ADD COLUMN IF NOT EXISTS post_visit_valuation_amount_1 DECIMAL(15, 2),
  ADD COLUMN IF NOT EXISTS valuation_method VARCHAR(50),
  ADD COLUMN IF NOT EXISTS valuation_pdf_url TEXT,
  ADD COLUMN IF NOT EXISTS fixed_asset_tax_road_price DECIMAL(15, 2),
  
  -- Email/Mail Sending
  ADD COLUMN IF NOT EXISTS email_sent_date DATE,
  ADD COLUMN IF NOT EXISTS mail_sent_date DATE,
  ADD COLUMN IF NOT EXISTS mailing_status VARCHAR(20),
  ADD COLUMN IF NOT EXISTS alternative_mailing_address TEXT,
  
  -- Visit Information
  ADD COLUMN IF NOT EXISTS visit_acquisition_date DATE,
  ADD COLUMN IF NOT EXISTS visit_date DATE,
  ADD COLUMN IF NOT EXISTS visit_time VARCHAR(20),
  ADD COLUMN IF NOT EXISTS visit_day_of_week VARCHAR(10),
  ADD COLUMN IF NOT EXISTS visit_assignee VARCHAR(100),
  ADD COLUMN IF NOT EXISTS visit_valuation_acquirer VARCHAR(100),
  ADD COLUMN IF NOT EXISTS visit_notes TEXT,
  ADD COLUMN IF NOT EXISTS visit_ratio DECIMAL(5, 2),
  ADD COLUMN IF NOT EXISTS appointment_date TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS appointment_notes TEXT,
  ADD COLUMN IF NOT EXISTS viewing_notes TEXT,
  
  -- Latest Status
  ADD COLUMN IF NOT EXISTS latest_status TEXT,
  
  -- Competitor Information
  ADD COLUMN IF NOT EXISTS competitor_name_and_reason TEXT,
  ADD COLUMN IF NOT EXISTS competitor_name VARCHAR(200),
  ADD COLUMN IF NOT EXISTS exclusive_other_decision_factor TEXT,
  ADD COLUMN IF NOT EXISTS exclusive_other_decision_factors TEXT[], -- Array for multiple selections
  ADD COLUMN IF NOT EXISTS other_decision_countermeasure TEXT,
  ADD COLUMN IF NOT EXISTS contract_year_month DATE,
  ADD COLUMN IF NOT EXISTS exclusive_other_decision_meeting VARCHAR(20),
  
  -- Pinrich
  ADD COLUMN IF NOT EXISTS pinrich_status VARCHAR(50),
  
  -- Exclusion Management
  ADD COLUMN IF NOT EXISTS exclusion_site TEXT,
  ADD COLUMN IF NOT EXISTS exclusion_criteria TEXT,
  ADD COLUMN IF NOT EXISTS exclusion_date DATE,
  ADD COLUMN IF NOT EXISTS exclusion_action VARCHAR(50),
  
  -- Cancellation
  ADD COLUMN IF NOT EXISTS cancel_notice_assignee VARCHAR(100),
  ADD COLUMN IF NOT EXISTS exclusive_script TEXT,
  ADD COLUMN IF NOT EXISTS price_loss_list_entered BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS company_introduction TEXT,
  ADD COLUMN IF NOT EXISTS property_introduction TEXT,
  
  -- Site (inquiry source)
  ADD COLUMN IF NOT EXISTS site VARCHAR(50),
  
  -- Special Fields
  ADD COLUMN IF NOT EXISTS property_address_for_ieul_mansion TEXT,
  
  -- System fields
  ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1; -- For optimistic locking

-- Create indexes for Phase 1 fields
CREATE INDEX IF NOT EXISTS idx_sellers_seller_number ON sellers(seller_number);
CREATE INDEX IF NOT EXISTS idx_sellers_inquiry_source ON sellers(inquiry_source);
CREATE INDEX IF NOT EXISTS idx_sellers_inquiry_year ON sellers(inquiry_year);
CREATE INDEX IF NOT EXISTS idx_sellers_inquiry_date ON sellers(inquiry_date);
CREATE INDEX IF NOT EXISTS idx_sellers_is_unreachable ON sellers(is_unreachable);
CREATE INDEX IF NOT EXISTS idx_sellers_confidence_level ON sellers(confidence_level);
CREATE INDEX IF NOT EXISTS idx_sellers_first_caller_employee_id ON sellers(first_caller_employee_id);
CREATE INDEX IF NOT EXISTS idx_sellers_duplicate_confirmed ON sellers(duplicate_confirmed);
CREATE INDEX IF NOT EXISTS idx_sellers_visit_date ON sellers(visit_date);
CREATE INDEX IF NOT EXISTS idx_sellers_appointment_date ON sellers(appointment_date);
CREATE INDEX IF NOT EXISTS idx_sellers_site ON sellers(site);

-- Create composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_sellers_status_next_call_date ON sellers(status, next_call_date);
CREATE INDEX IF NOT EXISTS idx_sellers_inquiry_year_source ON sellers(inquiry_year, inquiry_source);
CREATE INDEX IF NOT EXISTS idx_sellers_unreachable_confidence ON sellers(is_unreachable, confidence_level);

-- Create seller_number_sequence table for atomic number generation
CREATE TABLE IF NOT EXISTS seller_number_sequence (
  id INTEGER PRIMARY KEY DEFAULT 1,
  current_number INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT single_row CHECK (id = 1)
);

-- Insert initial sequence value if not exists
INSERT INTO seller_number_sequence (id, current_number)
VALUES (1, 0)
ON CONFLICT (id) DO NOTHING;

-- Create function to generate seller number atomically
CREATE OR REPLACE FUNCTION generate_seller_number()
RETURNS VARCHAR(7) AS $$
DECLARE
  next_num INTEGER;
  seller_num VARCHAR(7);
BEGIN
  -- Increment and get next number atomically
  UPDATE seller_number_sequence
  SET current_number = current_number + 1
  WHERE id = 1
  RETURNING current_number INTO next_num;
  
  -- Format as AA + 5-digit number
  seller_num := 'AA' || LPAD(next_num::TEXT, 5, '0');
  
  RETURN seller_num;
END;
$$ LANGUAGE plpgsql;

-- Create seller_history table for duplicate tracking
CREATE TABLE IF NOT EXISTS seller_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  current_seller_id UUID NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
  past_seller_id UUID NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
  match_type VARCHAR(20) NOT NULL CHECK (match_type IN ('phone', 'email', 'both')),
  past_owner_name TEXT,
  past_owner_phone TEXT,
  past_owner_email TEXT,
  past_property_address TEXT,
  past_property_type VARCHAR(50),
  past_inquiry_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT unique_seller_history UNIQUE (current_seller_id, past_seller_id)
);

-- Create indexes for seller_history
CREATE INDEX IF NOT EXISTS idx_seller_history_current_seller ON seller_history(current_seller_id);
CREATE INDEX IF NOT EXISTS idx_seller_history_past_seller ON seller_history(past_seller_id);
CREATE INDEX IF NOT EXISTS idx_seller_history_match_type ON seller_history(match_type);

-- Add comments for documentation
COMMENT ON COLUMN sellers.seller_number IS 'Unique seller identifier in format AA{5-digit number} (e.g., AA00001)';
COMMENT ON COLUMN sellers.inquiry_source IS 'Source of inquiry (e.g., ウ for Ieul, L for Lifull)';
COMMENT ON COLUMN sellers.confidence_level IS 'Seller confidence level: A (motivated), B (interested but not urgent), B_PRIME (not interested), C (unreachable), D (non-rebuildable), E (income property), DUPLICATE';
COMMENT ON COLUMN sellers.is_unreachable IS 'Flag indicating if seller is currently unreachable by phone';
COMMENT ON COLUMN sellers.duplicate_confirmed IS 'Flag indicating if duplicate status has been reviewed and confirmed';
COMMENT ON COLUMN sellers.version IS 'Version number for optimistic locking';
COMMENT ON TABLE seller_number_sequence IS 'Sequence table for generating unique seller numbers';
COMMENT ON TABLE seller_history IS 'History of duplicate seller relationships';

-- Grant permissions (adjust as needed for your setup)
-- GRANT SELECT, INSERT, UPDATE ON sellers TO authenticated;
-- GRANT SELECT, UPDATE ON seller_number_sequence TO authenticated;
-- GRANT SELECT, INSERT ON seller_history TO authenticated;
-- GRANT EXECUTE ON FUNCTION generate_seller_number() TO authenticated;
