-- マイグレーション: property_listingsテーブルに緯度・経度カラムを追加
-- 作成日: 2026-01-12
-- 目的: 地図表示機能のために物件の座標情報を保存

-- 緯度・経度カラムを追加
ALTER TABLE property_listings
ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8),
ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8);

-- 座標カラムにコメントを追加
COMMENT ON COLUMN property_listings.latitude IS '緯度（地図表示用）';
COMMENT ON COLUMN property_listings.longitude IS '経度（地図表示用）';

-- 座標検索用のインデックスを作成（地図表示のパフォーマンス向上）
CREATE INDEX IF NOT EXISTS idx_property_listings_coordinates 
ON property_listings(latitude, longitude) 
WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- 完了メッセージ
DO $$
BEGIN
  RAISE NOTICE '✅ 緯度・経度カラムの追加が完了しました';
  RAISE NOTICE '📍 次のステップ: 既存物件の座標を取得してください';
END $$;
