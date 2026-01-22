-- Full Seller List Management System - Complete Field Expansion
-- Adds 100+ fields for comprehensive seller and property management
-- Migration 009

-- ============================================================================
-- 1. Add Inquiry Information Fields (反響情報)
-- ============================================================================

-- inquiry_year, inquiry_date, inquiry_datetime already exist from migration 007
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS inquiry_detailed_datetime TIMESTAMP WITH TIME ZONE;
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS inquiry_site VARCHAR(50); -- サイト（ウ、L等）
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS inquiry_reason TEXT; -- 査定理由（自動転記）
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS site_url TEXT; -- サイトURL
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS number_of_companies INTEGER; -- 送信社数

-- ============================================================================
-- 2. Add Valuation Information Fields (査定情報)
-- ============================================================================

ALTER TABLE sellers ADD COLUMN IF NOT EXISTS valuation_amount_1 BIGINT; -- 査定額1
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS valuation_amount_2 BIGINT; -- 査定額2
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS valuation_amount_3 BIGINT; -- 査定額3
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS post_visit_valuation_amount_1 BIGINT; -- 訪問後_査定額1
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS valuation_method VARCHAR(100); -- 査定方法
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS valuation_pdf_url TEXT; -- 査定書URL
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS fixed_asset_tax_road_price BIGINT; -- 固定資産税路線価

-- ============================================================================
-- 3. Add Follow-up and Communication Fields (追客・連絡情報)
-- ============================================================================

ALTER TABLE sellers ADD COLUMN IF NOT EXISTS email_sent_date DATE; -- E/日付（査定をメールした日）
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS mail_sent_date DATE; -- 郵/日付（査定書を郵送した日）
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS first_call_initials VARCHAR(10); -- 一番TEL（イニシャル）
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS first_call_person VARCHAR(100); -- 1番電話（担当者名）
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS second_call_after_unreachable BOOLEAN DEFAULT false; -- 1番電話不通時2度目電話
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS contact_method VARCHAR(50); -- 連絡方法（Email、Smail、電話）
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS preferred_contact_time TEXT; -- 連絡取りやすい日、時間帯
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS mailing_status VARCHAR(20); -- 郵送（未、済）
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS alternative_mailing_address TEXT; -- 上記以外の郵送先住所

-- ============================================================================
-- 4. Add Visit Valuation Fields (訪問査定情報)
-- ============================================================================

ALTER TABLE sellers ADD COLUMN IF NOT EXISTS visit_acquisition_date DATE; -- 訪問取得日
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS visit_date DATE; -- 訪問日
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS visit_time VARCHAR(20); -- 訪問時間
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS visit_day_of_week VARCHAR(10); -- 曜日
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS visit_assignee VARCHAR(100); -- 営担（訪問する人）
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS visit_acquired_by VARCHAR(100); -- 訪問査定取得者（自動表記）
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS visit_notes TEXT; -- 訪問時注意点
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS visit_ratio DECIMAL(5, 2); -- 訪問査定割合

-- ============================================================================
-- 5. Add Status and Progress Fields (ステータス・進捗)
-- ============================================================================

ALTER TABLE sellers ADD COLUMN IF NOT EXISTS valuation_assignee VARCHAR(100); -- 査定担当
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS phone_assignee VARCHAR(100); -- 電話担当（任意）
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS contract_year_month DATE; -- 契約年月
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS exclusive_other_decision_meeting VARCHAR(20); -- 専任他決打合せ（未、完了）
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS comments TEXT; -- コメント（ヒアリング内容）

-- ============================================================================
-- 6. Add Competitor and Other Decision Fields (競合・他決情報)
-- ============================================================================

ALTER TABLE sellers ADD COLUMN IF NOT EXISTS competitor_name_and_reason TEXT; -- 競合名、理由
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS competitor_name VARCHAR(200); -- 競合名
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS exclusive_other_decision_factor TEXT; -- 専任・他決要因
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS other_decision_countermeasure TEXT; -- 他決対策

-- ============================================================================
-- 7. Add Pinrich Fields
-- ============================================================================

ALTER TABLE sellers ADD COLUMN IF NOT EXISTS pinrich_status VARCHAR(50); -- Pinrich（配信中、クローズ等）

-- ============================================================================
-- 8. Add Duplicate Management Fields (重複管理)
-- ============================================================================

ALTER TABLE sellers ADD COLUMN IF NOT EXISTS past_owner_info TEXT; -- 過去所有者情報
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS past_property_info TEXT; -- 過去物件情報
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS requires_duplicate_check BOOLEAN DEFAULT false; -- 要ダブり確認
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS seller_copy VARCHAR(50); -- 売主コピー（売主番号）
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS buyer_copy VARCHAR(50); -- 買主コピー（買主番号）
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS purchase_info TEXT; -- 購入情報

-- ============================================================================
-- 9. Add Exclusion Management Fields (除外管理)
-- ============================================================================

ALTER TABLE sellers ADD COLUMN IF NOT EXISTS exclusion_site TEXT; -- 除外サイト（URL）
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS exclusion_criteria TEXT; -- 除外基準（箇条書き）
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS exclusion_date DATE; -- 除外日
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS exclusion_action VARCHAR(100); -- 除外日にすること

-- ============================================================================
-- 10. Add Other Management Fields (その他)
-- ============================================================================

ALTER TABLE sellers ADD COLUMN IF NOT EXISTS cancel_notice_assignee VARCHAR(100); -- キャンセル案内担当
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS exclusive_script TEXT; -- 専任とれた文言
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS price_loss_list_entered BOOLEAN DEFAULT false; -- 価格負けリストに入力済み
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS company_introduction TEXT; -- 当社の紹介
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS property_introduction TEXT; -- 物件紹介（LONGTEXT）

-- ============================================================================
-- 11. Add Property Information Fields to Properties Table
-- ============================================================================

ALTER TABLE properties ADD COLUMN IF NOT EXISTS land_area_verified DECIMAL(10, 2); -- 土地（当社調べ）
ALTER TABLE properties ADD COLUMN IF NOT EXISTS building_area_verified DECIMAL(10, 2); -- 建物（当社調べ）
ALTER TABLE properties ADD COLUMN IF NOT EXISTS floor_plan VARCHAR(50); -- 間取り
ALTER TABLE properties ADD COLUMN IF NOT EXISTS seller_situation VARCHAR(50); -- 状況（売主）

-- ============================================================================
-- 12. Add Ieul Mansion Specific Field (イエウール・マンション専用)
-- ============================================================================

ALTER TABLE sellers ADD COLUMN IF NOT EXISTS property_address_for_ieul_mansion TEXT; -- 物件所在地（ウのマンションとは別明記分）

-- ============================================================================
-- 13. Add Requestor Address Field (依頼者住所)
-- ============================================================================

ALTER TABLE sellers ADD COLUMN IF NOT EXISTS requestor_address TEXT; -- 依頼者住所（物件所在地と異なる場合）

-- ============================================================================
-- 14. Update Status Enum to Include New Values
-- ============================================================================

-- Drop existing constraint
ALTER TABLE sellers DROP CONSTRAINT IF EXISTS sellers_status_check;

-- Add new constraint with expanded status values
ALTER TABLE sellers ADD CONSTRAINT sellers_status_check 
CHECK (status IN (
    'new', 
    'following_up', 
    'appointment_scheduled', 
    'visited', 
    'exclusive_contract',
    'general_contract',
    'contracted', 
    'other_decision',
    'follow_up_not_needed',
    'lost'
));

-- ============================================================================
-- 15. Create Performance Indexes
-- ============================================================================

-- Seller number index (already exists from migration 007, but ensure it's there)
CREATE INDEX IF NOT EXISTS idx_sellers_seller_number ON sellers(seller_number);

-- Inquiry information indexes
CREATE INDEX IF NOT EXISTS idx_sellers_inquiry_site ON sellers(inquiry_site);
CREATE INDEX IF NOT EXISTS idx_sellers_inquiry_date_full ON sellers(inquiry_date DESC);

-- Valuation indexes
CREATE INDEX IF NOT EXISTS idx_sellers_valuation_amount_1 ON sellers(valuation_amount_1);
CREATE INDEX IF NOT EXISTS idx_sellers_fixed_asset_tax ON sellers(fixed_asset_tax_road_price);

-- Visit valuation indexes
CREATE INDEX IF NOT EXISTS idx_sellers_visit_date ON sellers(visit_date DESC);
CREATE INDEX IF NOT EXISTS idx_sellers_visit_assignee ON sellers(visit_assignee);
CREATE INDEX IF NOT EXISTS idx_sellers_visit_acquisition_date ON sellers(visit_acquisition_date DESC);

-- Status and progress indexes
CREATE INDEX IF NOT EXISTS idx_sellers_valuation_assignee ON sellers(valuation_assignee);
CREATE INDEX IF NOT EXISTS idx_sellers_phone_assignee ON sellers(phone_assignee);
CREATE INDEX IF NOT EXISTS idx_sellers_contract_year_month ON sellers(contract_year_month);

-- Competitor indexes
CREATE INDEX IF NOT EXISTS idx_sellers_competitor_name ON sellers(competitor_name);

-- Pinrich index
CREATE INDEX IF NOT EXISTS idx_sellers_pinrich_status ON sellers(pinrich_status);

-- Exclusion management indexes
CREATE INDEX IF NOT EXISTS idx_sellers_exclusion_date ON sellers(exclusion_date);
CREATE INDEX IF NOT EXISTS idx_sellers_exclusion_site ON sellers(exclusion_site);

-- Duplicate management indexes
CREATE INDEX IF NOT EXISTS idx_sellers_requires_duplicate_check ON sellers(requires_duplicate_check);
CREATE INDEX IF NOT EXISTS idx_sellers_seller_copy ON sellers(seller_copy);
CREATE INDEX IF NOT EXISTS idx_sellers_buyer_copy ON sellers(buyer_copy);

-- Communication indexes
CREATE INDEX IF NOT EXISTS idx_sellers_email_sent_date ON sellers(email_sent_date);
CREATE INDEX IF NOT EXISTS idx_sellers_mail_sent_date ON sellers(mail_sent_date);
CREATE INDEX IF NOT EXISTS idx_sellers_contact_method ON sellers(contact_method);

-- Property information indexes
CREATE INDEX IF NOT EXISTS idx_properties_floor_plan ON properties(floor_plan);
CREATE INDEX IF NOT EXISTS idx_properties_seller_situation ON properties(seller_situation);

-- ============================================================================
-- 16. Add Column Comments for Documentation
-- ============================================================================

-- Inquiry Information
COMMENT ON COLUMN sellers.inquiry_detailed_datetime IS '反響詳細日時';
COMMENT ON COLUMN sellers.inquiry_site IS 'サイト（ウ、L等の略称）';
COMMENT ON COLUMN sellers.inquiry_reason IS '査定理由（自動転記）';
COMMENT ON COLUMN sellers.site_url IS 'サイトURL';
COMMENT ON COLUMN sellers.number_of_companies IS '送信社数';

-- Valuation Information
COMMENT ON COLUMN sellers.valuation_amount_1 IS '査定額1（最低額）';
COMMENT ON COLUMN sellers.valuation_amount_2 IS '査定額2（中間額）';
COMMENT ON COLUMN sellers.valuation_amount_3 IS '査定額3（最高額）';
COMMENT ON COLUMN sellers.post_visit_valuation_amount_1 IS '訪問後_査定額1';
COMMENT ON COLUMN sellers.valuation_method IS '査定方法（机上査定メール、郵送、不通等）';
COMMENT ON COLUMN sellers.valuation_pdf_url IS '査定書URL（つながるオンライン）';
COMMENT ON COLUMN sellers.fixed_asset_tax_road_price IS '固定資産税路線価';

-- Follow-up and Communication
COMMENT ON COLUMN sellers.email_sent_date IS 'E/日付（査定をメールした日）';
COMMENT ON COLUMN sellers.mail_sent_date IS '郵/日付（査定書を郵送した日）';
COMMENT ON COLUMN sellers.first_call_initials IS '一番TEL（イニシャル）';
COMMENT ON COLUMN sellers.first_call_person IS '1番電話（担当者名）';
COMMENT ON COLUMN sellers.second_call_after_unreachable IS '1番電話不通時2度目電話';
COMMENT ON COLUMN sellers.contact_method IS '連絡方法（Email、Smail、電話）';
COMMENT ON COLUMN sellers.preferred_contact_time IS '連絡取りやすい日、時間帯';
COMMENT ON COLUMN sellers.mailing_status IS '郵送（未、済）';
COMMENT ON COLUMN sellers.alternative_mailing_address IS '上記以外の郵送先住所';

-- Visit Valuation
COMMENT ON COLUMN sellers.visit_acquisition_date IS '訪問取得日';
COMMENT ON COLUMN sellers.visit_date IS '訪問日';
COMMENT ON COLUMN sellers.visit_time IS '訪問時間';
COMMENT ON COLUMN sellers.visit_day_of_week IS '曜日';
COMMENT ON COLUMN sellers.visit_assignee IS '営担（訪問する人）';
COMMENT ON COLUMN sellers.visit_acquired_by IS '訪問査定取得者（自動表記）';
COMMENT ON COLUMN sellers.visit_notes IS '訪問時注意点（Gカレンダーに連携）';
COMMENT ON COLUMN sellers.visit_ratio IS '訪問査定割合（自動計算）';

-- Status and Progress
COMMENT ON COLUMN sellers.valuation_assignee IS '査定担当';
COMMENT ON COLUMN sellers.phone_assignee IS '電話担当（任意）';
COMMENT ON COLUMN sellers.contract_year_month IS '契約年月';
COMMENT ON COLUMN sellers.exclusive_other_decision_meeting IS '専任他決打合せ（未、完了）';
COMMENT ON COLUMN sellers.comments IS 'コメント（ヒアリング内容）';

-- Competitor and Other Decision
COMMENT ON COLUMN sellers.competitor_name_and_reason IS '競合名、理由';
COMMENT ON COLUMN sellers.competitor_name IS '競合名';
COMMENT ON COLUMN sellers.exclusive_other_decision_factor IS '専任・他決要因';
COMMENT ON COLUMN sellers.other_decision_countermeasure IS '他決対策';

-- Pinrich
COMMENT ON COLUMN sellers.pinrich_status IS 'Pinrich（配信中、クローズ等）';

-- Duplicate Management
COMMENT ON COLUMN sellers.past_owner_info IS '過去所有者情報（電話番号重複時）';
COMMENT ON COLUMN sellers.past_property_info IS '過去物件情報（電話番号重複時）';
COMMENT ON COLUMN sellers.requires_duplicate_check IS '要ダブり確認';
COMMENT ON COLUMN sellers.seller_copy IS '売主コピー（売主番号入力でコピー）';
COMMENT ON COLUMN sellers.buyer_copy IS '買主コピー（買主番号入力でコピー）';
COMMENT ON COLUMN sellers.purchase_info IS '購入情報（買主リスト情報）';

-- Exclusion Management
COMMENT ON COLUMN sellers.exclusion_site IS '除外サイト（URL）';
COMMENT ON COLUMN sellers.exclusion_criteria IS '除外基準（箇条書き）';
COMMENT ON COLUMN sellers.exclusion_date IS '除外日（自動入力）';
COMMENT ON COLUMN sellers.exclusion_action IS '除外日にすること（不通であれば除外等）';

-- Other Management
COMMENT ON COLUMN sellers.cancel_notice_assignee IS 'キャンセル案内担当';
COMMENT ON COLUMN sellers.exclusive_script IS '専任とれた文言';
COMMENT ON COLUMN sellers.price_loss_list_entered IS '価格負けリストに入力済み';
COMMENT ON COLUMN sellers.company_introduction IS '当社の紹介';
COMMENT ON COLUMN sellers.property_introduction IS '物件紹介（LONGTEXT）';

-- Property Information
COMMENT ON COLUMN properties.land_area_verified IS '土地（当社調べ）';
COMMENT ON COLUMN properties.building_area_verified IS '建物（当社調べ）';
COMMENT ON COLUMN properties.floor_plan IS '間取り';
COMMENT ON COLUMN properties.seller_situation IS '状況（売主）居住中→居、空き家→空、賃貸中→賃、古屋あり→古有、更地→更';

-- Ieul Mansion Specific
COMMENT ON COLUMN sellers.property_address_for_ieul_mansion IS '物件所在地（ウのマンションとは別明記分）';

-- Requestor Address
COMMENT ON COLUMN sellers.requestor_address IS '依頼者住所（物件所在地と異なる場合のみ）';

-- ============================================================================
-- 17. Create Seller History Table for Duplicate Tracking
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

-- Add indexes for seller_history
CREATE INDEX IF NOT EXISTS idx_seller_history_current ON seller_history(current_seller_id);
CREATE INDEX IF NOT EXISTS idx_seller_history_past ON seller_history(past_seller_id);
CREATE INDEX IF NOT EXISTS idx_seller_history_match_type ON seller_history(match_type);

-- Add comments
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

-- ============================================================================
-- Migration 009 Complete
-- Total fields added: 70+ new fields to sellers table, 4 to properties table
-- New table: seller_history for duplicate tracking
-- ============================================================================
