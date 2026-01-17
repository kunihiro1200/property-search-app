-- Migration 049: Fix buyer text field lengths
-- Change VARCHAR(50) to TEXT for fields that can contain long text

-- These fields were causing sync failures for buyers with long text content
-- Root cause: buyer 2064 had fields exceeding 50 characters, causing
-- "value too long for type character varying(50)" errors

ALTER TABLE buyers 
  ALTER COLUMN inquiry_hearing TYPE TEXT,
  ALTER COLUMN past_inquiry_comment_property TYPE TEXT,
  ALTER COLUMN past_viewing_properties TYPE TEXT,
  ALTER COLUMN past_personal_info TYPE TEXT,
  ALTER COLUMN past_desired_conditions TYPE TEXT,
  ALTER COLUMN no_response_after_inquiry TYPE TEXT;

-- Also fix other text fields that might have similar issues
ALTER TABLE buyers
  ALTER COLUMN viewing_result_follow_up TYPE TEXT,
  ALTER COLUMN latest_status TYPE TEXT,
  ALTER COLUMN special_notes TYPE TEXT,
  ALTER COLUMN viewing_survey_response TYPE TEXT,
  ALTER COLUMN message_to_assignee TYPE TEXT,
  ALTER COLUMN confirmation_to_assignee TYPE TEXT,
  ALTER COLUMN offer_comment TYPE TEXT,
  ALTER COLUMN offer_lost_comment TYPE TEXT,
  ALTER COLUMN pre_viewing_notes TYPE TEXT,
  ALTER COLUMN key_info TYPE TEXT,
  ALTER COLUMN sale_reason TYPE TEXT,
  ALTER COLUMN price_reduction_history TYPE TEXT,
  ALTER COLUMN viewing_notes TYPE TEXT,
  ALTER COLUMN viewing_inquiry_progress TYPE TEXT,
  ALTER COLUMN no_response_offer_exists TYPE TEXT,
  ALTER COLUMN no_property_inquiry_pinrich TYPE TEXT,
  ALTER COLUMN email_confirmation_mail TYPE TEXT,
  ALTER COLUMN minpaku_inquiry TYPE TEXT,
  ALTER COLUMN document_request_email_house TYPE TEXT,
  ALTER COLUMN document_request_email_land_no_permission TYPE TEXT,
  ALTER COLUMN document_request_email_land_permission TYPE TEXT,
  ALTER COLUMN viewing_reason TYPE TEXT,
  ALTER COLUMN family_composition TYPE TEXT,
  ALTER COLUMN must_have_points TYPE TEXT,
  ALTER COLUMN liked_points TYPE TEXT,
  ALTER COLUMN disliked_points TYPE TEXT,
  ALTER COLUMN purchase_obstacles TYPE TEXT,
  ALTER COLUMN closing TYPE TEXT,
  ALTER COLUMN preferred_contact_time TYPE TEXT,
  ALTER COLUMN next_action TYPE TEXT,
  ALTER COLUMN pre_approval TYPE TEXT,
  ALTER COLUMN viewing_survey_result TYPE TEXT,
  ALTER COLUMN b_customer_follow_up TYPE TEXT,
  ALTER COLUMN renovation_history TYPE TEXT,
  ALTER COLUMN other_property_hearing TYPE TEXT,
  ALTER COLUMN owned_home_hearing_inquiry TYPE TEXT,
  ALTER COLUMN owned_home_hearing_result TYPE TEXT,
  ALTER COLUMN valuation_not_needed_reason TYPE TEXT,
  ALTER COLUMN pre_viewing_hearing TYPE TEXT;
