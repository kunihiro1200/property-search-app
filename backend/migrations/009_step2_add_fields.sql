-- Migration 009 - Step 2: Add all new fields
-- Run this after Step 1 (constraint removal)

-- ============================================================================
-- 1. Add Inquiry Information Fields (反響情報)
-- ============================================================================

ALTER TABLE sellers ADD COLUMN IF NOT EXISTS inquiry_detailed_datetime TIMESTAMP WITH TIME ZONE;
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS inquiry_site VARCHAR(50);
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS inquiry_reason TEXT;
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS site_url TEXT;
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS number_of_companies INTEGER;

-- ============================================================================
-- 2. Add Valuation Information Fields (査定情報)
-- ============================================================================

ALTER TABLE sellers ADD COLUMN IF NOT EXISTS valuation_amount_1 BIGINT;
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS valuation_amount_2 BIGINT;
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS valuation_amount_3 BIGINT;
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS post_visit_valuation_amount_1 BIGINT;
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS valuation_method VARCHAR(100);
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS valuation_pdf_url TEXT;
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS fixed_asset_tax_road_price BIGINT;

-- ============================================================================
-- 3. Add Follow-up and Communication Fields (追客・連絡情報)
-- ============================================================================

ALTER TABLE sellers ADD COLUMN IF NOT EXISTS email_sent_date DATE;
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS mail_sent_date DATE;
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS first_call_initials VARCHAR(10);
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS first_call_person VARCHAR(100);
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS second_call_after_unreachable BOOLEAN DEFAULT false;
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS contact_method VARCHAR(50);
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS preferred_contact_time TEXT;
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS mailing_status VARCHAR(20);
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS alternative_mailing_address TEXT;

-- ============================================================================
-- 4. Add Visit Valuation Fields (訪問査定情報)
-- ============================================================================

ALTER TABLE sellers ADD COLUMN IF NOT EXISTS visit_acquisition_date DATE;
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS visit_date DATE;
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS visit_time VARCHAR(20);
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS visit_day_of_week VARCHAR(10);
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS visit_assignee VARCHAR(100);
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS visit_acquired_by VARCHAR(100);
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS visit_notes TEXT;
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS visit_ratio DECIMAL(5, 2);

-- ============================================================================
-- 5. Add Status and Progress Fields (ステータス・進捗)
-- ============================================================================

ALTER TABLE sellers ADD COLUMN IF NOT EXISTS valuation_assignee VARCHAR(100);
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS phone_assignee VARCHAR(100);
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS contract_year_month DATE;
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS exclusive_other_decision_meeting VARCHAR(20);
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS comments TEXT;

-- ============================================================================
-- 6. Add Competitor and Other Decision Fields (競合・他決情報)
-- ============================================================================

ALTER TABLE sellers ADD COLUMN IF NOT EXISTS competitor_name_and_reason TEXT;
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS competitor_name VARCHAR(200);
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS exclusive_other_decision_factor TEXT;
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS other_decision_countermeasure TEXT;

-- ============================================================================
-- 7. Add Pinrich Fields
-- ============================================================================

ALTER TABLE sellers ADD COLUMN IF NOT EXISTS pinrich_status VARCHAR(50);

-- ============================================================================
-- 8. Add Duplicate Management Fields (重複管理)
-- ============================================================================

ALTER TABLE sellers ADD COLUMN IF NOT EXISTS past_owner_info TEXT;
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS past_property_info TEXT;
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS requires_duplicate_check BOOLEAN DEFAULT false;
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS seller_copy VARCHAR(50);
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS buyer_copy VARCHAR(50);
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS purchase_info TEXT;

-- ============================================================================
-- 9. Add Exclusion Management Fields (除外管理)
-- ============================================================================

ALTER TABLE sellers ADD COLUMN IF NOT EXISTS exclusion_site TEXT;
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS exclusion_criteria TEXT;
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS exclusion_date DATE;
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS exclusion_action VARCHAR(100);

-- ============================================================================
-- 10. Add Other Management Fields (その他)
-- ============================================================================

ALTER TABLE sellers ADD COLUMN IF NOT EXISTS cancel_notice_assignee VARCHAR(100);
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS exclusive_script TEXT;
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS price_loss_list_entered BOOLEAN DEFAULT false;
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS company_introduction TEXT;
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS property_introduction TEXT;

-- ============================================================================
-- 11. Add Property Information Fields to Properties Table
-- ============================================================================

ALTER TABLE properties ADD COLUMN IF NOT EXISTS land_area_verified DECIMAL(10, 2);
ALTER TABLE properties ADD COLUMN IF NOT EXISTS building_area_verified DECIMAL(10, 2);
ALTER TABLE properties ADD COLUMN IF NOT EXISTS floor_plan VARCHAR(50);
ALTER TABLE properties ADD COLUMN IF NOT EXISTS seller_situation VARCHAR(50);

-- ============================================================================
-- 12. Add Ieul Mansion Specific Field
-- ============================================================================

ALTER TABLE sellers ADD COLUMN IF NOT EXISTS property_address_for_ieul_mansion TEXT;

-- ============================================================================
-- 13. Add Requestor Address Field
-- ============================================================================

ALTER TABLE sellers ADD COLUMN IF NOT EXISTS requestor_address TEXT;

-- ============================================================================
-- 14. Create Seller History Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS seller_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  current_seller_id UUID NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
  past_seller_id UUID NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
  match_type VARCHAR(20) NOT NULL CHECK (match_type IN ('phone', 'email', 'both')),
  past_owner_name VARCHAR(255),
  past_owner_phone VARCHAR(255),
  past_owner_email VARCHAR(255),
  past_property_address TEXT,
  past_property_type VARCHAR(50),
  past_inquiry_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT unique_seller_history UNIQUE (current_seller_id, past_seller_id)
);
