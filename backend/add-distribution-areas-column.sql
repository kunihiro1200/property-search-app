-- property_listingsテーブルにdistribution_areasカラムを追加
-- Supabase SQL Editorで実行してください

ALTER TABLE property_listings
ADD COLUMN IF NOT EXISTS distribution_areas TEXT;

-- カラムにコメントを追加
COMMENT ON COLUMN property_listings.distribution_areas IS '配信エリア番号（例: ①②③）';

-- インデックスを追加（検索パフォーマンス向上）
CREATE INDEX IF NOT EXISTS idx_property_listings_distribution_areas 
ON property_listings USING gin (to_tsvector('simple', distribution_areas));
