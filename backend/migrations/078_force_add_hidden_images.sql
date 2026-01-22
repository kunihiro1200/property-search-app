-- Migration: 078 - Force add hidden_images column to property_listings
-- Description: 強制的にhidden_imagesカラムを追加（077が失敗した場合の対策）

-- まず既存のカラムを削除（存在する場合）
ALTER TABLE property_listings 
DROP COLUMN IF EXISTS hidden_images;

-- 正しい構文でカラムを追加
ALTER TABLE property_listings 
ADD COLUMN hidden_images TEXT[] DEFAULT ARRAY[]::TEXT[];

-- コメントを追加
COMMENT ON COLUMN property_listings.hidden_images IS '非表示にする画像のファイル名リスト';

-- PostgRESTがアクセスできるように権限を付与
GRANT SELECT, UPDATE ON property_listings TO anon;
GRANT SELECT, UPDATE ON property_listings TO authenticated;

-- スキーマキャッシュを強制リロード
NOTIFY pgrst, 'reload schema';
