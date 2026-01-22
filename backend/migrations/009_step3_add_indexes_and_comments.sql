-- Migration 009 - Step 3: Add indexes and comments
-- Run this after Step 2 (field addition)

-- ============================================================================
-- Create Performance Indexes
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_sellers_seller_number ON sellers(seller_number);
CREATE INDEX IF NOT EXISTS idx_sellers_inquiry_site ON sellers(inquiry_site);
CREATE INDEX IF NOT EXISTS idx_sellers_inquiry_date_full ON sellers(inquiry_date DESC);
CREATE INDEX IF NOT EXISTS idx_sellers_valuation_amount_1 ON sellers(valuation_amount_1);
CREATE INDEX IF NOT EXISTS idx_sellers_fixed_asset_tax ON sellers(fixed_asset_tax_road_price);
CREATE INDEX IF NOT EXISTS idx_sellers_visit_date ON sellers(visit_date DESC);
CREATE INDEX IF NOT EXISTS idx_sellers_visit_assignee ON sellers(visit_assignee);
CREATE INDEX IF NOT EXISTS idx_sellers_visit_acquisition_date ON sellers(visit_acquisition_date DESC);
CREATE INDEX IF NOT EXISTS idx_sellers_valuation_assignee ON sellers(valuation_assignee);
CREATE INDEX IF NOT EXISTS idx_sellers_phone_assignee ON sellers(phone_assignee);
CREATE INDEX IF NOT EXISTS idx_sellers_contract_year_month ON sellers(contract_year_month);
CREATE INDEX IF NOT EXISTS idx_sellers_competitor_name ON sellers(competitor_name);
CREATE INDEX IF NOT EXISTS idx_sellers_pinrich_status ON sellers(pinrich_status);
CREATE INDEX IF NOT EXISTS idx_sellers_exclusion_date ON sellers(exclusion_date);
CREATE INDEX IF NOT EXISTS idx_sellers_exclusion_site ON sellers(exclusion_site);
CREATE INDEX IF NOT EXISTS idx_sellers_requires_duplicate_check ON sellers(requires_duplicate_check);
CREATE INDEX IF NOT EXISTS idx_sellers_seller_copy ON sellers(seller_copy);
CREATE INDEX IF NOT EXISTS idx_sellers_buyer_copy ON sellers(buyer_copy);
CREATE INDEX IF NOT EXISTS idx_sellers_email_sent_date ON sellers(email_sent_date);
CREATE INDEX IF NOT EXISTS idx_sellers_mail_sent_date ON sellers(mail_sent_date);
CREATE INDEX IF NOT EXISTS idx_sellers_contact_method ON sellers(contact_method);
CREATE INDEX IF NOT EXISTS idx_properties_floor_plan ON properties(floor_plan);
CREATE INDEX IF NOT EXISTS idx_properties_seller_situation ON properties(seller_situation);
CREATE INDEX IF NOT EXISTS idx_seller_history_current ON seller_history(current_seller_id);
CREATE INDEX IF NOT EXISTS idx_seller_history_past ON seller_history(past_seller_id);
CREATE INDEX IF NOT EXISTS idx_seller_history_match_type ON seller_history(match_type);

-- ============================================================================
-- Add Column Comments
-- ============================================================================

COMMENT ON COLUMN sellers.inquiry_detailed_datetime IS '反響詳細日時';
COMMENT ON COLUMN sellers.inquiry_site IS 'サイト（ウ、L等の略称）';
COMMENT ON COLUMN sellers.inquiry_reason IS '査定理由（自動転記）';
COMMENT ON COLUMN sellers.site_url IS 'サイトURL';
COMMENT ON COLUMN sellers.number_of_companies IS '送信社数';
COMMENT ON COLUMN sellers.valuation_amount_1 IS '査定額1（最低額）';
COMMENT ON COLUMN sellers.valuation_amount_2 IS '査定額2（中間額）';
COMMENT ON COLUMN sellers.valuation_amount_3 IS '査定額3（最高額）';
COMMENT ON COLUMN sellers.post_visit_valuation_amount_1 IS '訪問後_査定額1';
COMMENT ON COLUMN sellers.valuation_method IS '査定方法（机上査定メール、郵送、不通等）';
COMMENT ON COLUMN sellers.valuation_pdf_url IS '査定書URL（つながるオンライン）';
COMMENT ON COLUMN sellers.fixed_asset_tax_road_price IS '固定資産税路線価';
COMMENT ON COLUMN sellers.email_sent_date IS 'E/日付（査定をメールした日）';
COMMENT ON COLUMN sellers.mail_sent_date IS '郵/日付（査定書を郵送した日）';
COMMENT ON COLUMN sellers.first_call_initials IS '一番TEL（イニシャル）';
COMMENT ON COLUMN sellers.first_call_person IS '1番電話（担当者名）';
COMMENT ON COLUMN sellers.second_call_after_unreachable IS '1番電話不通時2度目電話';
COMMENT ON COLUMN sellers.contact_method IS '連絡方法（Email、Smail、電話）';
COMMENT ON COLUMN sellers.preferred_contact_time IS '連絡取りやすい日、時間帯';
COMMENT ON COLUMN sellers.mailing_status IS '郵送（未、済）';
COMMENT ON COLUMN sellers.alternative_mailing_address IS '上記以外の郵送先住所';
COMMENT ON COLUMN sellers.visit_acquisition_date IS '訪問取得日';
COMMENT ON COLUMN sellers.visit_date IS '訪問日';
COMMENT ON COLUMN sellers.visit_time IS '訪問時間';
COMMENT ON COLUMN sellers.visit_day_of_week IS '曜日';
COMMENT ON COLUMN sellers.visit_assignee IS '営担（訪問する人）';
COMMENT ON COLUMN sellers.visit_acquired_by IS '訪問査定取得者（自動表記）';
COMMENT ON COLUMN sellers.visit_notes IS '訪問時注意点（Gカレンダーに連携）';
COMMENT ON COLUMN sellers.visit_ratio IS '訪問査定割合（自動計算）';
COMMENT ON COLUMN sellers.valuation_assignee IS '査定担当';
COMMENT ON COLUMN sellers.phone_assignee IS '電話担当（任意）';
COMMENT ON COLUMN sellers.contract_year_month IS '契約年月';
COMMENT ON COLUMN sellers.exclusive_other_decision_meeting IS '専任他決打合せ（未、完了）';
COMMENT ON COLUMN sellers.comments IS 'コメント（ヒアリング内容）';
COMMENT ON COLUMN sellers.competitor_name_and_reason IS '競合名、理由';
COMMENT ON COLUMN sellers.competitor_name IS '競合名';
COMMENT ON COLUMN sellers.exclusive_other_decision_factor IS '専任・他決要因';
COMMENT ON COLUMN sellers.other_decision_countermeasure IS '他決対策';
COMMENT ON COLUMN sellers.pinrich_status IS 'Pinrich（配信中、クローズ等）';
COMMENT ON COLUMN sellers.past_owner_info IS '過去所有者情報（電話番号重複時）';
COMMENT ON COLUMN sellers.past_property_info IS '過去物件情報（電話番号重複時）';
COMMENT ON COLUMN sellers.requires_duplicate_check IS '要ダブり確認';
COMMENT ON COLUMN sellers.seller_copy IS '売主コピー（売主番号入力でコピー）';
COMMENT ON COLUMN sellers.buyer_copy IS '買主コピー（買主番号入力でコピー）';
COMMENT ON COLUMN sellers.purchase_info IS '購入情報（買主リスト情報）';
COMMENT ON COLUMN sellers.exclusion_site IS '除外サイト（URL）';
COMMENT ON COLUMN sellers.exclusion_criteria IS '除外基準（箇条書き）';
COMMENT ON COLUMN sellers.exclusion_date IS '除外日（自動入力）';
COMMENT ON COLUMN sellers.exclusion_action IS '除外日にすること（不通であれば除外等）';
COMMENT ON COLUMN sellers.cancel_notice_assignee IS 'キャンセル案内担当';
COMMENT ON COLUMN sellers.exclusive_script IS '専任とれた文言';
COMMENT ON COLUMN sellers.price_loss_list_entered IS '価格負けリストに入力済み';
COMMENT ON COLUMN sellers.company_introduction IS '当社の紹介';
COMMENT ON COLUMN sellers.property_introduction IS '物件紹介（LONGTEXT）';
COMMENT ON COLUMN properties.land_area_verified IS '土地（当社調べ）';
COMMENT ON COLUMN properties.building_area_verified IS '建物（当社調べ）';
COMMENT ON COLUMN properties.floor_plan IS '間取り';
COMMENT ON COLUMN properties.seller_situation IS '状況（売主）居住中→居、空き家→空、賃貸中→賃、古屋あり→古有、更地→更';
COMMENT ON COLUMN sellers.property_address_for_ieul_mansion IS '物件所在地（ウのマンションとは別明記分）';
COMMENT ON COLUMN sellers.requestor_address IS '依頼者住所（物件所在地と異なる場合のみ）';
COMMENT ON TABLE seller_history IS '売主重複履歴テーブル';
COMMENT ON COLUMN seller_history.current_seller_id IS '現在の売主ID';
COMMENT ON COLUMN seller_history.past_seller_id IS '過去の売主ID';
COMMENT ON COLUMN seller_history.match_type IS '重複検出方法（phone、email、both）';
COMMENT ON COLUMN seller_history.past_owner_name IS '過去の所有者名';
COMMENT ON COLUMN seller_history.past_owner_phone IS '過去の所有者電話番号';
COMMENT ON COLUMN seller_history.past_owner_email IS '過去の所有者メールアドレス';
COMMENT ON COLUMN seller_history.past_property_address IS '過去の物件住所';
COMMENT ON COLUMN seller_history.past_property_type IS '過去の物件種別';
COMMENT ON COLUMN seller_history.past_inquiry_date IS '過去の反響日';
