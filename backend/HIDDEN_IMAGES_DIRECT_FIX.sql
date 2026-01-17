-- ============================================
-- hidden_imagesカラムを直接追加
-- Supabase SQL Editorで実行してください
-- ============================================

-- 1. カラムが存在するか確認
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'property_listings' 
  AND column_name = 'hidden_images';

-- 2. カラムを追加（存在しない場合のみ）
ALTER TABLE property_listings 
ADD COLUMN IF NOT EXISTS hidden_images TEXT[] DEFAULT '{}';

-- 3. コメントを追加
COMMENT ON COLUMN property_listings.hidden_images IS '非表示にした画像のファイルIDリスト';

-- 4. インデックスを追加（配列検索用）
CREATE INDEX IF NOT EXISTS idx_property_listings_hidden_images 
ON property_listings USING GIN (hidden_images);

-- 5. 確認：カラムが追加されたか確認
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'property_listings' 
  AND column_name = 'hidden_images';

-- 6. 確認：インデックスが作成されたか確認
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'property_listings'
  AND indexname = 'idx_property_listings_hidden_images';
