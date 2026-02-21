-- Add latitude and longitude columns to sellers table
-- これにより、物件の座標をデータベースに保存し、Geocoding APIを使わずに地図を表示できる

ALTER TABLE sellers
ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;

-- コメント追加
COMMENT ON COLUMN sellers.latitude IS '物件の緯度（地図表示用）';
COMMENT ON COLUMN sellers.longitude IS '物件の経度（地図表示用）';

-- インデックス追加（座標検索のパフォーマンス向上）
CREATE INDEX IF NOT EXISTS idx_sellers_coordinates ON sellers (latitude, longitude);
