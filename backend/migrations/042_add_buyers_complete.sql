-- Migration 042: Add buyers table with complete column structure
-- This creates the buyers table with all columns needed for spreadsheet sync

CREATE TABLE IF NOT EXISTS buyers (
    -- Primary key
    buyer_id TEXT PRIMARY KEY,
    
    -- Basic info
    buyer_number TEXT,
    name TEXT NOT NULL,
    nickname TEXT,
    phone_number TEXT,
    email TEXT,
    line_id TEXT,
    current_residence TEXT,
    company_name TEXT,
    
    -- Dates
    created_datetime TIMESTAMP WITH TIME ZONE,
    reception_date TIMESTAMP WITH TIME ZONE,
    latest_viewing_date TIMESTAMP WITH TIME ZONE,
    next_call_date TIMESTAMP WITH TIME ZONE,
    campaign_date TIMESTAMP WITH TIME ZONE,
    
    -- Property and address fields
    building_name_price TEXT,
    property_address TEXT,
    property_number TEXT,
    property_assignee TEXT,
    display_address TEXT,
    location TEXT,
    athome_url TEXT,
    google_map_url TEXT,
    pdf_url TEXT,
    image_url TEXT,
    
    -- Assignee and contact fields
    initial_assignee TEXT,
    follow_up_assignee TEXT,
    assignee_work_days TEXT,
    email_confirmation_assignee TEXT,
    viewing_promotion_sender TEXT,
    notification_sender TEXT,
    
    -- Status and type fields
    distribution_type TEXT,
    inquiry_source TEXT,
    inquiry_confidence TEXT,
    offer_status TEXT,
    email_type TEXT,
    viewing_type TEXT,
    viewing_type_general TEXT,
    property_type TEXT,
    current_status TEXT,
    structure TEXT,
    
    -- Desired conditions fields
    desired_area TEXT,
    desired_property_type TEXT,
    desired_building_age TEXT,
    desired_floor_plan TEXT,
    desired_timing TEXT,
    
    -- Boolean-like fields (stored as text)
    hot_spring_required TEXT,
    parking_spaces TEXT,
    monthly_parking_ok TEXT,
    garden_required TEXT,
    good_view_required TEXT,
    pet_allowed_required TEXT,
    high_floor_required TEXT,
    corner_room_required TEXT,
    
    -- Reference and link fields
    pinrich TEXT,
    pinrich_link TEXT,
    viewing_sheet TEXT,
    offer_property_sheet TEXT,
    past_viewing_1 TEXT,
    past_viewing_2 TEXT,
    past_viewing_3 TEXT,
    past_buyer_list TEXT,
    past_latest_confidence TEXT,
    
    -- Contact and communication fields
    re_inquiry_viewing TEXT,
    post_viewing_seller_contact TEXT,
    seller_viewing_contact TEXT,
    buyer_viewing_contact TEXT,
    post_offer_lost_contact TEXT,
    seller_viewing_date_contact TEXT,
    seller_cancel_contact TEXT,
    
    -- Chat and notification fields
    chat_to_yamamoto TEXT,
    chat_to_ura TEXT,
    chat_to_kunihiro TEXT,
    offer_lost_chat TEXT,
    image_chat_sent TEXT,
    email_to_takeuchi TEXT,
    email_to_kadoi TEXT,
    hirose_to_office TEXT,
    
    -- Email and inquiry fields
    inquiry_email_phone TEXT,
    inquiry_email_reply TEXT,
    broker_inquiry TEXT,
    inflow_source_phone TEXT,
    
    -- Viewing and offer fields
    viewing_calendar_note TEXT,
    viewing_unconfirmed TEXT,
    offer_exists_viewing_ng TEXT,
    offer_exists_viewing_ok TEXT,
    viewing_comment_confirmed TEXT,
    viewing_promotion_result TEXT,
    viewing_promotion_not_needed TEXT,
    
    -- Property details fields
    parking TEXT,
    viewing_parking TEXT,
    parking_valuation TEXT,
    land_area TEXT,
    building_area TEXT,
    floor_plan TEXT,
    build_year TEXT,
    floor_count TEXT,
    owner_name TEXT,
    loan_balance TEXT,
    
    -- Price and budget fields
    budget TEXT,
    price TEXT,
    price_range_house TEXT,
    price_range_apartment TEXT,
    price_range_land TEXT,
    
    -- Survey and confirmation fields
    viewing_survey_confirmed TEXT,
    valuation_survey TEXT,
    valuation_survey_confirmed TEXT,
    email_confirmed TEXT,
    email_effect_verification TEXT,
    
    -- Long text fields (from migration 049)
    inquiry_hearing TEXT,
    past_inquiry_comment_property TEXT,
    past_viewing_properties TEXT,
    past_personal_info TEXT,
    past_desired_conditions TEXT,
    no_response_after_inquiry TEXT,
    viewing_result_follow_up TEXT,
    latest_status TEXT,
    special_notes TEXT,
    viewing_survey_response TEXT,
    message_to_assignee TEXT,
    confirmation_to_assignee TEXT,
    offer_comment TEXT,
    offer_lost_comment TEXT,
    pre_viewing_notes TEXT,
    key_info TEXT,
    sale_reason TEXT,
    price_reduction_history TEXT,
    viewing_notes TEXT,
    viewing_inquiry_progress TEXT,
    no_response_offer_exists TEXT,
    no_property_inquiry_pinrich TEXT,
    email_confirmation_mail TEXT,
    minpaku_inquiry TEXT,
    document_request_email_house TEXT,
    document_request_email_land_no_permission TEXT,
    document_request_email_land_permission TEXT,
    viewing_reason TEXT,
    family_composition TEXT,
    must_have_points TEXT,
    liked_points TEXT,
    disliked_points TEXT,
    purchase_obstacles TEXT,
    closing TEXT,
    preferred_contact_time TEXT,
    next_action TEXT,
    pre_approval TEXT,
    viewing_survey_result TEXT,
    b_customer_follow_up TEXT,
    renovation_history TEXT,
    other_property_hearing TEXT,
    owned_home_hearing_inquiry TEXT,
    owned_home_hearing_result TEXT,
    valuation_not_needed_reason TEXT,
    pre_viewing_hearing TEXT,
    
    -- Other fields
    panorama_deleted TEXT,
    column_a TEXT,
    public_private TEXT,
    day_of_week TEXT,
    sale_chance TEXT,
    campaign_applicable TEXT,
    data_updated TEXT,
    viewing_time TEXT,
    first_view TEXT,
    other_company_property TEXT,
    other_company_name TEXT,
    other_valuation_done TEXT,
    visit_desk TEXT,
    seller_list_copy TEXT,
    seller_copy TEXT,
    buyer_copy TEXT,
    three_calls_confirmed TEXT,
    property_search_reference TEXT,
    first_come_first_served TEXT,
    market_reference TEXT,
    smooth_process TEXT,
    pre_release_decision_text TEXT,
    owned_home_hearing TEXT,
    pre_viewing_hearing_send TEXT,
    valuation_required TEXT,
    phone_duplicate_count TEXT,
    
    -- Distribution areas (JSON array)
    distribution_areas JSONB,
    
    -- Soft delete
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMP WITH TIME ZONE,
    
    -- System fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_synced_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_buyers_buyer_number ON buyers(buyer_number);
CREATE INDEX IF NOT EXISTS idx_buyers_name ON buyers(name);
CREATE INDEX IF NOT EXISTS idx_buyers_phone_number ON buyers(phone_number);
CREATE INDEX IF NOT EXISTS idx_buyers_email ON buyers(email);
CREATE INDEX IF NOT EXISTS idx_buyers_inquiry_confidence ON buyers(inquiry_confidence);
CREATE INDEX IF NOT EXISTS idx_buyers_initial_assignee ON buyers(initial_assignee);
CREATE INDEX IF NOT EXISTS idx_buyers_follow_up_assignee ON buyers(follow_up_assignee);
CREATE INDEX IF NOT EXISTS idx_buyers_distribution_type ON buyers(distribution_type);
CREATE INDEX IF NOT EXISTS idx_buyers_property_number ON buyers(property_number);
CREATE INDEX IF NOT EXISTS idx_buyers_is_deleted ON buyers(is_deleted);
CREATE INDEX IF NOT EXISTS idx_buyers_created_datetime ON buyers(created_datetime DESC);
CREATE INDEX IF NOT EXISTS idx_buyers_reception_date ON buyers(reception_date DESC);
CREATE INDEX IF NOT EXISTS idx_buyers_latest_viewing_date ON buyers(latest_viewing_date DESC);
CREATE INDEX IF NOT EXISTS idx_buyers_next_call_date ON buyers(next_call_date);

-- Create GIN index for distribution_areas JSONB field
CREATE INDEX IF NOT EXISTS idx_buyers_distribution_areas ON buyers USING GIN (distribution_areas);
