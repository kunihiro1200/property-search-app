-- PostgRESTにスキーマキャッシュの更新を強制的に通知
-- このSQLをSupabase SQL Editorで実行してください

-- 1. PostgRESTにスキーマリロードを通知
NOTIFY pgrst, 'reload schema';

-- 2. カラムが存在することを確認
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'property_listings'
  AND column_name = 'hidden_images';

-- 3. テーブルの権限を確認
SELECT grantee, privilege_type
FROM information_schema.role_table_grants
WHERE table_schema = 'public'
  AND table_name = 'property_listings'
  AND grantee IN ('anon', 'authenticated', 'service_role');
