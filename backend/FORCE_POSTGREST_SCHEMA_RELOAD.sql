-- PostgRESTのスキーマキャッシュを強制的にリロードする
-- このSQLをSupabase SQL Editorで実行してください

-- 1. PostgRESTに通知を送信
NOTIFY pgrst, 'reload schema';

-- 2. PostgRESTの設定を確認
SELECT current_setting('pgrst.db_schemas', true) AS db_schemas;
SELECT current_setting('pgrst.db_anon_role', true) AS anon_role;

-- 3. property_listingsテーブルのスキーマを確認
SELECT 
  table_schema,
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'property_listings'
ORDER BY ordinal_position;

-- 4. hidden_imagesカラムの権限を明示的に付与
GRANT SELECT, UPDATE ON property_listings TO anon;
GRANT SELECT, UPDATE ON property_listings TO authenticated;
GRANT ALL ON property_listings TO service_role;

-- 5. 再度通知を送信
NOTIFY pgrst, 'reload schema';
NOTIFY pgrst, 'reload config';

-- 完了メッセージ
SELECT 'PostgREST schema reload triggered. Please wait 10-30 seconds for the cache to refresh.' AS status;
