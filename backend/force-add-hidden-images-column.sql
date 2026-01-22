-- hidden_imagesカラムを強制的に追加するSQL
-- PostgRESTのキャッシュ問題を解決するため、カラムを削除して再作成します

-- ステップ1: 既存のインデックスを削除（存在する場合）
DROP INDEX IF EXISTS idx_property_listings_hidden_images;

-- ステップ2: 既存のカラムを削除（存在する場合）
ALTER TABLE property_listings 
DROP COLUMN IF EXISTS hidden_images CASCADE;

-- ステップ3: トランザクションを強制的にコミット
COMMIT;

-- ステップ4: 新しいトランザクションを開始
BEGIN;

-- ステップ5: カラムを新規作成
ALTER TABLE property_listings 
ADD COLUMN hidden_images TEXT[] DEFAULT ARRAY[]::TEXT[];

-- ステップ6: コメントを追加
COMMENT ON COLUMN property_listings.hidden_images IS '非表示にした画像のファイルIDリスト';

-- ステップ7: インデックスを作成
CREATE INDEX idx_property_listings_hidden_images 
ON property_listings USING GIN (hidden_images);

-- ステップ8: 権限を付与
GRANT SELECT, UPDATE ON property_listings TO anon;
GRANT SELECT, UPDATE ON property_listings TO authenticated;
GRANT ALL ON property_listings TO service_role;

-- ステップ9: コミット
COMMIT;

-- ステップ10: PostgRESTに複数回通知（キャッシュクリア）
NOTIFY pgrst, 'reload schema';
NOTIFY pgrst, 'reload config';
NOTIFY pgrst, 'reload schema';

-- ステップ11: 接続プールをリセット（これが重要）
SELECT pg_terminate_backend(pid) 
FROM pg_stat_activity 
WHERE datname = current_database() 
  AND pid <> pg_backend_pid()
  AND usename = 'authenticator';

-- ステップ12: 再度通知
NOTIFY pgrst, 'reload schema';

-- ステップ13: 確認
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'property_listings'
  AND column_name = 'hidden_images';
