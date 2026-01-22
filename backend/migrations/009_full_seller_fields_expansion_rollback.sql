-- Rollback for Migration 009: Full Seller Fields Expansion
-- Removes all fields added in migration 009

-- ============================================================================
-- Drop seller_history table first
-- ============================================================================

DROP TABLE IF EXISTS seller_history CASCADE;

-- ============================================================================
-- Drop indexes
-- ============================================================================

DROP INDEX IF EXISTS idx_seller_history_current;
DROP INDEX IF EXISTS idx_seller_history_past;
DROP INDEX IF EXISTS idx_seller_history_match_type;
DROP INDEX IF EXISTS idx_sellers_inquiry_site;
DROP INDEX IF EXISTS idx_sellers_inquiry_date_full;
DROP INDEX IF EXISTS idx_sellers_valuation_amount_1;
DROP INDEX IF EXISTS idx_sellers_fixed_asset_tax;
DROP INDEX IF EXISTS idx_sellers_visit_date;
DROP INDEX IF EXISTS idx_sellers_visit_assignee;
DROP INDEX IF EXISTS idx_sellers_visit_acquisition_date;
DROP INDEX IF EXISTS idx_sellers_valuation_assignee;
DROP INDEX IF EXISTS idx_sellers_phone_assignee;
DROP INDEX IF EXISTS idx_sellers_contract_year_month;
DROP INDEX IF EXISTS idx_sellers_competitor_name;
DROP INDEX IF EXISTS idx_sellers_pinrich_status;
DROP INDEX IF EXISTS idx_sellers_exclusion_date;
DROP INDEX IF EXISTS idx_sellers_exclusion_site;
DROP INDEX IF EXISTS idx_sellers_requires_duplicate_check;
DROP INDEX IF EXISTS idx_sellers_seller_copy;
DROP INDEX IF EXISTS idx_sellers_buyer_copy;
DROP INDEX IF EXISTS idx_sellers_email_sent_date;
DROP INDEX IF EXISTS idx_sellers_mail_sent_date;
DROP INDEX IF EXISTS idx_sellers_contact_method;
DROP INDEX IF EXISTS idx_properties_floor_plan;
DROP INDEX IF EXISTS idx_properties_seller_situation;

-- ============================================================================
-- Remove columns from sellers table
-- ============================================================================

-- Inquiry Information
ALTER TABLE sellers DROP COLUMN IF EXISTS inquiry_detailed_datetime;
ALTER TABLE sellers DROP COLUMN IF EXISTS inquiry_site;
ALTER TABLE sellers DROP COLUMN IF EXISTS inquiry_reason;
ALTER TABLE sellers DROP COLUMN IF EXISTS site_url;
ALTER TABLE sellers DROP COLUMN IF EXISTS number_of_companies;

-- Valuation Information
ALTER TABLE sellers DROP COLUMN IF EXISTS valuation_amount_1;
ALTER TABLE sellers DROP COLUMN IF EXISTS valuation_amount_2;
ALTER TABLE sellers DROP COLUMN IF EXISTS valuation_amount_3;
ALTER TABLE sellers DROP COLUMN IF EXISTS post_visit_valuation_amount_1;
ALTER TABLE sellers DROP COLUMN IF EXISTS valuation_method;
ALTER TABLE sellers DROP COLUMN IF EXISTS valuation_pdf_url;
ALTER TABLE sellers DROP COLUMN IF EXISTS fixed_asset_tax_road_price;

-- Follow-up and Communication
ALTER TABLE sellers DROP COLUMN IF EXISTS email_sent_date;
ALTER TABLE sellers DROP COLUMN IF EXISTS mail_sent_date;
ALTER TABLE sellers DROP COLUMN IF EXISTS first_call_initials;
ALTER TABLE sellers DROP COLUMN IF EXISTS first_call_person;
ALTER TABLE sellers DROP COLUMN IF EXISTS second_call_after_unreachable;
ALTER TABLE sellers DROP COLUMN IF EXISTS contact_method;
ALTER TABLE sellers DROP COLUMN IF EXISTS preferred_contact_time;
ALTER TABLE sellers DROP COLUMN IF EXISTS mailing_status;
ALTER TABLE sellers DROP COLUMN IF EXISTS alternative_mailing_address;

-- Visit Valuation
ALTER TABLE sellers DROP COLUMN IF EXISTS visit_acquisition_date;
ALTER TABLE sellers DROP COLUMN IF EXISTS visit_date;
ALTER TABLE sellers DROP COLUMN IF EXISTS visit_time;
ALTER TABLE sellers DROP COLUMN IF EXISTS visit_day_of_week;
ALTER TABLE sellers DROP COLUMN IF EXISTS visit_assignee;
ALTER TABLE sellers DROP COLUMN IF EXISTS visit_acquired_by;
ALTER TABLE sellers DROP COLUMN IF EXISTS visit_notes;
ALTER TABLE sellers DROP COLUMN IF EXISTS visit_ratio;

-- Status and Progress
ALTER TABLE sellers DROP COLUMN IF EXISTS valuation_assignee;
ALTER TABLE sellers DROP COLUMN IF EXISTS phone_assignee;
ALTER TABLE sellers DROP COLUMN IF EXISTS contract_year_month;
ALTER TABLE sellers DROP COLUMN IF EXISTS exclusive_other_decision_meeting;
ALTER TABLE sellers DROP COLUMN IF EXISTS comments;

-- Competitor and Other Decision
ALTER TABLE sellers DROP COLUMN IF EXISTS competitor_name_and_reason;
ALTER TABLE sellers DROP COLUMN IF EXISTS competitor_name;
ALTER TABLE sellers DROP COLUMN IF EXISTS exclusive_other_decision_factor;
ALTER TABLE sellers DROP COLUMN IF EXISTS other_decision_countermeasure;

-- Pinrich
ALTER TABLE sellers DROP COLUMN IF EXISTS pinrich_status;

-- Duplicate Management
ALTER TABLE sellers DROP COLUMN IF EXISTS past_owner_info;
ALTER TABLE sellers DROP COLUMN IF EXISTS past_property_info;
ALTER TABLE sellers DROP COLUMN IF EXISTS requires_duplicate_check;
ALTER TABLE sellers DROP COLUMN IF EXISTS seller_copy;
ALTER TABLE sellers DROP COLUMN IF EXISTS buyer_copy;
ALTER TABLE sellers DROP COLUMN IF EXISTS purchase_info;

-- Exclusion Management
ALTER TABLE sellers DROP COLUMN IF EXISTS exclusion_site;
ALTER TABLE sellers DROP COLUMN IF EXISTS exclusion_criteria;
ALTER TABLE sellers DROP COLUMN IF EXISTS exclusion_date;
ALTER TABLE sellers DROP COLUMN IF EXISTS exclusion_action;

-- Other Management
ALTER TABLE sellers DROP COLUMN IF EXISTS cancel_notice_assignee;
ALTER TABLE sellers DROP COLUMN IF EXISTS exclusive_script;
ALTER TABLE sellers DROP COLUMN IF EXISTS price_loss_list_entered;
ALTER TABLE sellers DROP COLUMN IF EXISTS company_introduction;
ALTER TABLE sellers DROP COLUMN IF EXISTS property_introduction;

-- Ieul Mansion Specific
ALTER TABLE sellers DROP COLUMN IF EXISTS property_address_for_ieul_mansion;

-- Requestor Address
ALTER TABLE sellers DROP COLUMN IF EXISTS requestor_address;

-- ============================================================================
-- Remove columns from properties table
-- ============================================================================

ALTER TABLE properties DROP COLUMN IF EXISTS land_area_verified;
ALTER TABLE properties DROP COLUMN IF EXISTS building_area_verified;
ALTER TABLE properties DROP COLUMN IF EXISTS floor_plan;
ALTER TABLE properties DROP COLUMN IF EXISTS seller_situation;

-- ============================================================================
-- Restore original status constraint
-- ============================================================================

ALTER TABLE sellers DROP CONSTRAINT IF EXISTS sellers_status_check;

ALTER TABLE sellers ADD CONSTRAINT sellers_status_check 
CHECK (status IN ('new', 'following_up', 'appointment_scheduled', 'visited', 'contracted', 'lost'));

-- ============================================================================
-- Rollback Complete
-- ============================================================================
