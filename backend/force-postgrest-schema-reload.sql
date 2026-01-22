-- PostgRESTのスキーマキャッシュを強制的にリロード
-- Supabase SQL Editorで実行してください

-- 1. スキーマキャッシュをリロード
NOTIFY pgrst, 'reload schema';

-- 2. 確認: last_synced_atカラムが存在するか
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'buyers'
  AND column_name IN ('last_synced_at', 'synced_at')
ORDER BY column_name;

-- 3. インデックスの確認
SELECT 
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename = 'buyers'
  AND indexname LIKE '%synced%';
