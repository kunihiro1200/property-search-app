-- ============================================================================
-- RLS ポリシーとデータの確認
-- ============================================================================
-- このSQLをSupabase SQL Editorで実行してください

-- 1. sellers テーブルの RLS ポリシーを確認
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'sellers';

-- 2. sellers テーブルの RLS が有効かどうか確認
SELECT 
  tablename,
  rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename = 'sellers';

-- 3. サービスロールでのデータ確認（RLS をバイパス）
-- 注意: この SQL は Supabase SQL Editor で実行すると、
-- 自動的にサービスロールで実行されます
SELECT COUNT(*) as total_count FROM sellers;

-- 4. 最近作成されたレコードを確認
SELECT 
  seller_number,
  created_at,
  updated_at
FROM sellers
ORDER BY created_at DESC
LIMIT 10;

-- 5. 削除されたレコードを確認（deleted_at カラムがある場合）
SELECT 
  column_name
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'sellers'
  AND column_name = 'deleted_at';

-- 6. deleted_at カラムがある場合、削除されたレコードを確認
-- SELECT COUNT(*) as deleted_count 
-- FROM sellers 
-- WHERE deleted_at IS NOT NULL;

-- 7. テーブルの統計情報を確認
SELECT 
  schemaname,
  relname as tablename,
  n_live_tup as live_rows,
  n_dead_tup as dead_rows,
  last_vacuum,
  last_autovacuum
FROM pg_stat_user_tables
WHERE schemaname = 'public'
  AND relname = 'sellers';
