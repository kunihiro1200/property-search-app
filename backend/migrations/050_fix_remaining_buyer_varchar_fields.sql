-- Migration 050: Fix remaining buyer VARCHAR(50) fields
-- This migration converts all remaining VARCHAR(50) fields to TEXT
-- to prevent "value too long for type character varying(50)" errors

-- These fields were not covered in migration 049 and can contain long text
ALTER TABLE buyers
  -- Basic info fields
  ALTER COLUMN name TYPE TEXT,
  ALTER COLUMN nickname TYPE TEXT,
  ALTER COLUMN phone_number TYPE TEXT,
  ALTER COLUMN email TYPE TEXT,
  ALTER COLUMN line_id TYPE TEXT,
  ALTER COLUMN current_residence TYPE TEXT,
  ALTER COLUMN company_name TYPE TEXT,
  
  -- Property and address fields
  ALTER COLUMN building_name_price TYPE TEXT,
  ALTER COLUMN property_address TYPE TEXT,
  ALTER COLUMN property_number TYPE TEXT,
  ALTER COLUMN property_assignee TYPE TEXT,
  ALTER COLUMN display_address TYPE TEXT,
  ALTER COLUMN location TYPE TEXT,
  ALTER COLUMN athome_url TYPE TEXT,
  ALTER COLUMN google_map_url TYPE TEXT,
  ALTER COLUMN pdf_url TYPE TEXT,
  ALTER COLUMN image_url TYPE TEXT,
  
  -- Assignee and contact fields
  ALTER COLUMN initial_assignee TYPE TEXT,
  ALTER COLUMN follow_up_assignee TYPE TEXT,
  ALTER COLUMN assignee_work_days TYPE TEXT,
  ALTER COLUMN email_confirmation_assignee TYPE TEXT,
  ALTER COLUMN viewing_promotion_sender TYPE TEXT,
  ALTER COLUMN notification_sender TYPE TEXT,
  
  -- Status and type fields
  ALTER COLUMN distribution_type TYPE TEXT,
  ALTER COLUMN inquiry_source TYPE TEXT,
  ALTER COLUMN inquiry_confidence TYPE TEXT,
  ALTER COLUMN offer_status TYPE TEXT,
  ALTER COLUMN email_type TYPE TEXT,
  ALTER COLUMN viewing_type TYPE TEXT,
  ALTER COLUMN viewing_type_general TYPE TEXT,
  ALTER COLUMN property_type TYPE TEXT,
  ALTER COLUMN current_status TYPE TEXT,
  ALTER COLUMN structure TYPE TEXT,
  
  -- Desired conditions fields
  ALTER COLUMN desired_area TYPE TEXT,
  ALTER COLUMN desired_property_type TYPE TEXT,
  ALTER COLUMN desired_building_age TYPE TEXT,
  ALTER COLUMN desired_floor_plan TYPE TEXT,
  ALTER COLUMN desired_timing TYPE TEXT,
  
  -- Boolean-like fields (stored as text)
  ALTER COLUMN hot_spring_required TYPE TEXT,
  ALTER COLUMN parking_spaces TYPE TEXT,
  ALTER COLUMN monthly_parking_ok TYPE TEXT,
  ALTER COLUMN garden_required TYPE TEXT,
  ALTER COLUMN good_view_required TYPE TEXT,
  ALTER COLUMN pet_allowed_required TYPE TEXT,
  ALTER COLUMN high_floor_required TYPE TEXT,
  ALTER COLUMN corner_room_required TYPE TEXT,
  
  -- Reference and link fields
  ALTER COLUMN pinrich TYPE TEXT,
  ALTER COLUMN pinrich_link TYPE TEXT,
  ALTER COLUMN viewing_sheet TYPE TEXT,
  ALTER COLUMN offer_property_sheet TYPE TEXT,
  ALTER COLUMN past_viewing_1 TYPE TEXT,
  ALTER COLUMN past_viewing_2 TYPE TEXT,
  ALTER COLUMN past_viewing_3 TYPE TEXT,
  ALTER COLUMN past_buyer_list TYPE TEXT,
  ALTER COLUMN past_latest_confidence TYPE TEXT,
  
  -- Contact and communication fields
  ALTER COLUMN re_inquiry_viewing TYPE TEXT,
  ALTER COLUMN post_viewing_seller_contact TYPE TEXT,
  ALTER COLUMN seller_viewing_contact TYPE TEXT,
  ALTER COLUMN buyer_viewing_contact TYPE TEXT,
  ALTER COLUMN post_offer_lost_contact TYPE TEXT,
  ALTER COLUMN seller_viewing_date_contact TYPE TEXT,
  ALTER COLUMN seller_cancel_contact TYPE TEXT,
  
  -- Chat and notification fields
  ALTER COLUMN chat_to_yamamoto TYPE TEXT,
  ALTER COLUMN chat_to_ura TYPE TEXT,
  ALTER COLUMN chat_to_kunihiro TYPE TEXT,
  ALTER COLUMN offer_lost_chat TYPE TEXT,
  ALTER COLUMN image_chat_sent TYPE TEXT,
  ALTER COLUMN email_to_takeuchi TYPE TEXT,
  ALTER COLUMN email_to_kadoi TYPE TEXT,
  ALTER COLUMN hirose_to_office TYPE TEXT,
  
  -- Email and inquiry fields
  ALTER COLUMN inquiry_email_phone TYPE TEXT,
  ALTER COLUMN inquiry_email_reply TYPE TEXT,
  ALTER COLUMN broker_inquiry TYPE TEXT,
  ALTER COLUMN inflow_source_phone TYPE TEXT,
  
  -- Viewing and offer fields
  ALTER COLUMN viewing_calendar_note TYPE TEXT,
  ALTER COLUMN viewing_unconfirmed TYPE TEXT,
  ALTER COLUMN offer_exists_viewing_ng TYPE TEXT,
  ALTER COLUMN offer_exists_viewing_ok TYPE TEXT,
  ALTER COLUMN viewing_comment_confirmed TYPE TEXT,
  ALTER COLUMN viewing_promotion_result TYPE TEXT,
  ALTER COLUMN viewing_promotion_not_needed TYPE TEXT,
  
  -- Property details fields
  ALTER COLUMN parking TYPE TEXT,
  ALTER COLUMN viewing_parking TYPE TEXT,
  ALTER COLUMN parking_valuation TYPE TEXT,
  ALTER COLUMN land_area TYPE TEXT,
  ALTER COLUMN building_area TYPE TEXT,
  ALTER COLUMN floor_plan TYPE TEXT,
  ALTER COLUMN build_year TYPE TEXT,
  ALTER COLUMN floor_count TYPE TEXT,
  ALTER COLUMN owner_name TYPE TEXT,
  ALTER COLUMN loan_balance TYPE TEXT,
  
  -- Price and budget fields
  ALTER COLUMN budget TYPE TEXT,
  ALTER COLUMN price TYPE TEXT,
  ALTER COLUMN price_range_house TYPE TEXT,
  ALTER COLUMN price_range_apartment TYPE TEXT,
  ALTER COLUMN price_range_land TYPE TEXT,
  
  -- Survey and confirmation fields
  ALTER COLUMN viewing_survey_confirmed TYPE TEXT,
  ALTER COLUMN valuation_survey TYPE TEXT,
  ALTER COLUMN valuation_survey_confirmed TYPE TEXT,
  ALTER COLUMN email_confirmed TYPE TEXT,
  ALTER COLUMN email_effect_verification TYPE TEXT,
  
  -- Other fields
  ALTER COLUMN panorama_deleted TYPE TEXT,
  ALTER COLUMN column_a TYPE TEXT,
  ALTER COLUMN public_private TYPE TEXT,
  ALTER COLUMN day_of_week TYPE TEXT,
  ALTER COLUMN sale_chance TYPE TEXT,
  ALTER COLUMN campaign_applicable TYPE TEXT,
  ALTER COLUMN data_updated TYPE TEXT,
  ALTER COLUMN viewing_time TYPE TEXT,
  ALTER COLUMN first_view TYPE TEXT,
  ALTER COLUMN other_company_property TYPE TEXT,
  ALTER COLUMN other_company_name TYPE TEXT,
  ALTER COLUMN other_valuation_done TYPE TEXT,
  ALTER COLUMN visit_desk TYPE TEXT,
  ALTER COLUMN seller_list_copy TYPE TEXT,
  ALTER COLUMN seller_copy TYPE TEXT,
  ALTER COLUMN buyer_copy TYPE TEXT,
  ALTER COLUMN three_calls_confirmed TYPE TEXT,
  ALTER COLUMN property_search_reference TYPE TEXT,
  ALTER COLUMN first_come_first_served TYPE TEXT,
  ALTER COLUMN market_reference TYPE TEXT,
  ALTER COLUMN smooth_process TYPE TEXT,
  ALTER COLUMN pre_release_decision_text TYPE TEXT,
  ALTER COLUMN owned_home_hearing TYPE TEXT,
  ALTER COLUMN pre_viewing_hearing_send TYPE TEXT,
  ALTER COLUMN valuation_required TYPE TEXT,
  ALTER COLUMN buyer_id TYPE TEXT,
  ALTER COLUMN phone_duplicate_count TYPE TEXT;

-- Note: The following fields were already converted to TEXT in migration 049:
-- inquiry_hearing, past_inquiry_comment_property, past_viewing_properties,
-- past_personal_info, past_desired_conditions, no_response_after_inquiry,
-- viewing_result_follow_up, latest_status, special_notes, viewing_survey_response,
-- message_to_assignee, confirmation_to_assignee, offer_comment, offer_lost_comment,
-- pre_viewing_notes, key_info, sale_reason, price_reduction_history, viewing_notes,
-- viewing_inquiry_progress, no_response_offer_exists, no_property_inquiry_pinrich,
-- email_confirmation_mail, minpaku_inquiry, document_request_email_house,
-- document_request_email_land_no_permission, document_request_email_land_permission,
-- viewing_reason, family_composition, must_have_points, liked_points, disliked_points,
-- purchase_obstacles, closing, preferred_contact_time, next_action, pre_approval,
-- viewing_survey_result, b_customer_follow_up, renovation_history, other_property_hearing,
-- owned_home_hearing_inquiry, owned_home_hearing_result, valuation_not_needed_reason,
-- pre_viewing_hearing
