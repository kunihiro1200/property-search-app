-- Migration: Add beppu_area_mapping table
-- Description: 別府市内の住所から配信エリア番号を自動判定するためのマッピングテーブル

-- Create beppu_area_mapping table
CREATE TABLE IF NOT EXISTS beppu_area_mapping (
  id SERIAL PRIMARY KEY,
  school_district TEXT NOT NULL,           -- 学校区名 (例: 青山中学校, 中部中学校)
  region_name TEXT NOT NULL,               -- 地域名 (例: 南立石一区, 荘園北町, 東荘園4丁目)
  distribution_areas TEXT NOT NULL,        -- 配信エリア番号 (例: ⑨㊷, ⑩㊸)
  other_region TEXT,                       -- その他地域情報 (例: 別府駅周辺, 鉄輪線より下)
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_beppu_region_name ON beppu_area_mapping(region_name);
CREATE INDEX IF NOT EXISTS idx_beppu_school_district ON beppu_area_mapping(school_district);

-- Add comment to table
COMMENT ON TABLE beppu_area_mapping IS '別府市の住所から配信エリア番号へのマッピングテーブル';
COMMENT ON COLUMN beppu_area_mapping.school_district IS '学校区名';
COMMENT ON COLUMN beppu_area_mapping.region_name IS '地域名（住所マッチングに使用）';
COMMENT ON COLUMN beppu_area_mapping.distribution_areas IS '配信エリア番号（⑨-⑮、㊷、㊸など）';
COMMENT ON COLUMN beppu_area_mapping.other_region IS 'その他地域情報（別府駅周辺、鉄輪線より下など）';
