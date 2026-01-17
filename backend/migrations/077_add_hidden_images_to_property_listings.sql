-- 077: property_listingsテーブルにhidden_imagesカラムを追加
-- 目的: 物件画像の非表示機能用

-- hidden_imagesカラムを追加（存在しない場合のみ）
ALTER TABLE property_listings 
ADD COLUMN IF NOT EXISTS hidden_images TEXT[] DEFAULT ARRAY[]::TEXT[];

-- コメントを追加
COMMENT ON COLUMN property_listings.hidden_images IS '非表示にした画像のファイルIDリスト';

-- インデックスを追加（配列検索用）
CREATE INDEX IF NOT EXISTS idx_property_listings_hidden_images 
ON property_listings USING GIN (hidden_images);

-- PostgRESTのスキーマキャッシュを強制リロード
NOTIFY pgrst, 'reload schema';