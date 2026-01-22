-- 物件リストテーブル（物件スプレッドシートからの同期用）
-- 126カラム対応

CREATE TABLE IF NOT EXISTS property_listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- 基本情報
  property_number VARCHAR(50) UNIQUE,
  sales_assignee VARCHAR(100),
  property_type VARCHAR(100),
  contract_date DATE,
  settlement_date DATE,
  address TEXT,
  display_address TEXT,
  land_area DECIMAL(10,2),
  building_area DECIMAL(10,2),
  sales_price DECIMAL(15,0),
  
  -- 手数料関連
  total_commission DECIMAL(15,0),
  resale_margin DECIMAL(15,0),
  commission_from_seller DECIMAL(15,0),
  commission_from_buyer DECIMAL(15,0),
  
  -- 売主情報
  seller_name TEXT,
  seller_address TEXT,
  seller_contact TEXT,
  seller_email TEXT,
  
  -- 買主情報
  buyer_name TEXT,
  buyer_address TEXT,
  buyer_contact TEXT,
  
  -- 業者・司法書士
  broker VARCHAR(200),
  storage_location TEXT,
  judicial_scrivener VARCHAR(200),
  
  -- ステータス
  status VARCHAR(100),
  settlement_year_month VARCHAR(20),
  settlement_year VARCHAR(10),
  atbb_status VARCHAR(100),
  admin_assignee VARCHAR(100),
  reason TEXT,
  
  -- 物件詳細
  distribution_date DATE,
  structure VARCHAR(100),
  sales_table_input VARCHAR(100),
  construction_year_month VARCHAR(50),
  management_type VARCHAR(100),
  management_work_type VARCHAR(100),
  management_company VARCHAR(200),
  listing_price DECIMAL(15,0),
  
  -- 駐車場関連
  parking VARCHAR(200),
  parking_fee DECIMAL(10,0),
  bike_parking VARCHAR(100),
  bike_parking_fee DECIMAL(10,0),
  bicycle_parking VARCHAR(100),
  bicycle_parking_fee DECIMAL(10,0),
  
  -- 管理費関連
  management_fee DECIMAL(10,0),
  reserve_fund DECIMAL(10,0),
  special_notes TEXT,
  running_cost DECIMAL(10,0),
  running_cost_item1 VARCHAR(200),
  running_cost_item2 VARCHAR(200),
  running_cost_item3 VARCHAR(200),
  running_cost_price1 DECIMAL(10,0),
  running_cost_price2 DECIMAL(10,0),
  running_cost_price3 DECIMAL(10,0),
  
  -- ペット・温泉
  pet_consultation VARCHAR(100),
  hot_spring_status VARCHAR(100),
  hot_spring_usage_type VARCHAR(100),
  hot_spring_cost TEXT,
  
  -- 間取り・面積
  floor_plan VARCHAR(100),
  exclusive_area DECIMAL(10,2),
  main_lighting VARCHAR(100),
  
  -- 現況・引渡し
  current_status VARCHAR(100),
  delivery VARCHAR(200),
  viewing_key TEXT,
  owner_info TEXT,
  viewing_parking TEXT,
  property_tax DECIMAL(15,0),
  broker_response TEXT,
  sale_reason TEXT,
  pre_viewing_notes TEXT,
  viewing_notes TEXT,
  
  -- 価格・内覧
  price DECIMAL(15,0),
  viewing_available_date TEXT,
  building_viewing VARCHAR(200),
  deduction_usage VARCHAR(100),
  price_reduction_history TEXT,
  one_sided_reason TEXT,
  
  -- 買付関連
  offer_date DATE,
  offer_status VARCHAR(100),
  company_name TEXT,
  offer_amount TEXT,
  offer_submission TEXT,
  special_notes_offer TEXT,
  chat_sent VARCHAR(100),
  offer_comment TEXT,
  
  -- 画像・PDF
  image_url TEXT,
  pdf_url TEXT,
  
  -- チャット・メール
  chat_sent_price_change VARCHAR(100),
  price_reduction_email_date2 DATE,
  payment_method VARCHAR(100),
  ledger_request VARCHAR(100),
  review_image VARCHAR(100),
  question_to_assignee TEXT,
  property_disposal VARCHAR(100),
  reins_certificate_email VARCHAR(100),
  price_reduction_email_date1 DATE,
  
  -- その他
  cadastral_map VARCHAR(100),
  seller_viewing_contact TEXT,
  athome_input_assignee VARCHAR(100),
  signboard VARCHAR(100),
  google_map_url TEXT,
  suumo_registered VARCHAR(100),
  suumo_url TEXT,
  delivery_method VARCHAR(200),
  hot_spring VARCHAR(100),
  offer_exists VARCHAR(100),
  post_visit_valuation1 DECIMAL(15,0),
  general_mediation_private VARCHAR(100),
  single_listing VARCHAR(100),
  sales_plan TEXT,
  memo TEXT,
  sales_contract_completed VARCHAR(100),
  price_reduction_email_date3 DATE,
  offer_lost_comment TEXT,
  offer_lost_chat VARCHAR(100),
  price_reduction_email_date4 DATE,
  price_reduction_email VARCHAR(100),
  data_updated VARCHAR(100),
  signboard_removal VARCHAR(100),
  confirmation VARCHAR(100),
  cc_assignee VARCHAR(100),
  report_date DATE,
  report_completed VARCHAR(100),
  report_assignee VARCHAR(100),
  report_date_setting VARCHAR(100),
  panorama_deleted VARCHAR(100),
  
  -- メタデータ
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  synced_at TIMESTAMPTZ DEFAULT NOW()
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_property_listings_property_number ON property_listings(property_number);
CREATE INDEX IF NOT EXISTS idx_property_listings_sales_assignee ON property_listings(sales_assignee);
CREATE INDEX IF NOT EXISTS idx_property_listings_status ON property_listings(status);
CREATE INDEX IF NOT EXISTS idx_property_listings_contract_date ON property_listings(contract_date);
CREATE INDEX IF NOT EXISTS idx_property_listings_settlement_date ON property_listings(settlement_date);
CREATE INDEX IF NOT EXISTS idx_property_listings_property_type ON property_listings(property_type);
