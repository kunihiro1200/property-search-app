-- Rollback Migration 007: Phase 1 Seller List Management Enhancements

-- Drop seller_history table
DROP TABLE IF EXISTS seller_history CASCADE;

-- Drop seller_number_sequence table
DROP TABLE IF EXISTS seller_number_sequence CASCADE;

-- Drop function
DROP FUNCTION IF EXISTS generate_seller_number();

-- Drop indexes
DROP INDEX IF EXISTS idx_sellers_seller_number;
DROP INDEX IF EXISTS idx_sellers_inquiry_source;
DROP INDEX IF EXISTS idx_sellers_inquiry_year;
DROP INDEX IF EXISTS idx_sellers_inquiry_date;
DROP INDEX IF EXISTS idx_sellers_is_unreachable;
DROP INDEX IF EXISTS idx_sellers_confidence_level;
DROP INDEX IF EXISTS idx_sellers_first_caller_employee_id;
DROP INDEX IF EXISTS idx_sellers_duplicate_confirmed;
DROP INDEX IF EXISTS idx_sellers_visit_date;
DROP INDEX IF EXISTS idx_sellers_appointment_date;
DROP INDEX IF EXISTS idx_sellers_site;
DROP INDEX IF EXISTS idx_sellers_status_next_call_date;
DROP INDEX IF EXISTS idx_sellers_inquiry_year_source;
DROP INDEX IF EXISTS idx_sellers_unreachable_confidence;
DROP INDEX IF EXISTS idx_seller_history_current_seller;
DROP INDEX IF EXISTS idx_seller_history_past_seller;
DROP INDEX IF EXISTS idx_seller_history_match_type;

-- Drop columns from sellers table
ALTER TABLE sellers
  DROP COLUMN IF EXISTS seller_number,
  DROP COLUMN IF EXISTS inquiry_source,
  DROP COLUMN IF EXISTS inquiry_year,
  DROP COLUMN IF EXISTS inquiry_date,
  DROP COLUMN IF EXISTS inquiry_datetime,
  DROP COLUMN IF EXISTS inquiry_reason,
  DROP COLUMN IF EXISTS site_url,
  DROP COLUMN IF EXISTS number_of_companies,
  DROP COLUMN IF EXISTS requestor_address,
  DROP COLUMN IF EXISTS preferred_contact_time,
  DROP COLUMN IF EXISTS is_unreachable,
  DROP COLUMN IF EXISTS unreachable_since,
  DROP COLUMN IF EXISTS second_call_after_unreachable,
  DROP COLUMN IF EXISTS contact_method,
  DROP COLUMN IF EXISTS first_caller_initials,
  DROP COLUMN IF EXISTS first_caller_employee_id,
  DROP COLUMN IF EXISTS valuation_assignee,
  DROP COLUMN IF EXISTS phone_assignee,
  DROP COLUMN IF EXISTS confidence_level,
  DROP COLUMN IF EXISTS duplicate_confirmed,
  DROP COLUMN IF EXISTS duplicate_confirmed_at,
  DROP COLUMN IF EXISTS duplicate_confirmed_by,
  DROP COLUMN IF EXISTS past_owner_info,
  DROP COLUMN IF EXISTS past_property_info,
  DROP COLUMN IF EXISTS seller_copy,
  DROP COLUMN IF EXISTS buyer_copy,
  DROP COLUMN IF EXISTS purchase_info,
  DROP COLUMN IF EXISTS valuation_amount_1,
  DROP COLUMN IF EXISTS valuation_amount_2,
  DROP COLUMN IF EXISTS valuation_amount_3,
  DROP COLUMN IF EXISTS post_visit_valuation_amount_1,
  DROP COLUMN IF EXISTS valuation_method,
  DROP COLUMN IF EXISTS valuation_pdf_url,
  DROP COLUMN IF EXISTS fixed_asset_tax_road_price,
  DROP COLUMN IF EXISTS email_sent_date,
  DROP COLUMN IF EXISTS mail_sent_date,
  DROP COLUMN IF EXISTS mailing_status,
  DROP COLUMN IF EXISTS alternative_mailing_address,
  DROP COLUMN IF EXISTS visit_acquisition_date,
  DROP COLUMN IF EXISTS visit_date,
  DROP COLUMN IF EXISTS visit_time,
  DROP COLUMN IF EXISTS visit_day_of_week,
  DROP COLUMN IF EXISTS visit_assignee,
  DROP COLUMN IF EXISTS visit_valuation_acquirer,
  DROP COLUMN IF EXISTS visit_notes,
  DROP COLUMN IF EXISTS visit_ratio,
  DROP COLUMN IF EXISTS appointment_date,
  DROP COLUMN IF EXISTS appointment_notes,
  DROP COLUMN IF EXISTS viewing_notes,
  DROP COLUMN IF EXISTS latest_status,
  DROP COLUMN IF EXISTS competitor_name_and_reason,
  DROP COLUMN IF EXISTS competitor_name,
  DROP COLUMN IF EXISTS exclusive_other_decision_factor,
  DROP COLUMN IF EXISTS exclusive_other_decision_factors,
  DROP COLUMN IF EXISTS other_decision_countermeasure,
  DROP COLUMN IF EXISTS contract_year_month,
  DROP COLUMN IF EXISTS exclusive_other_decision_meeting,
  DROP COLUMN IF EXISTS pinrich_status,
  DROP COLUMN IF EXISTS exclusion_site,
  DROP COLUMN IF EXISTS exclusion_criteria,
  DROP COLUMN IF EXISTS exclusion_date,
  DROP COLUMN IF EXISTS exclusion_action,
  DROP COLUMN IF EXISTS cancel_notice_assignee,
  DROP COLUMN IF EXISTS exclusive_script,
  DROP COLUMN IF EXISTS price_loss_list_entered,
  DROP COLUMN IF EXISTS company_introduction,
  DROP COLUMN IF EXISTS property_introduction,
  DROP COLUMN IF EXISTS site,
  DROP COLUMN IF EXISTS property_address_for_ieul_mansion,
  DROP COLUMN IF EXISTS version;
