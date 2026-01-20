-- 物件リストテーブルに画像URLsカラムを追加
-- これにより、Google Drive APIを毎回呼ばずに画像URLを取得できる

-- image_urlsカラムを追加（JSON配列形式）
ALTER TABLE property_listings
ADD COLUMN IF NOT EXISTS image_urls JSONB DEFAULT '[]'::jsonb;

-- コメントを追加
COMMENT ON COLUMN property_listings.image_urls IS '物件の画像URL配列（Google Driveから取得してキャッシュ）';

-- インデックスを追加（検索高速化）
CREATE INDEX IF NOT EXISTS idx_property_listings_image_urls ON property_listings USING GIN (image_urls);
