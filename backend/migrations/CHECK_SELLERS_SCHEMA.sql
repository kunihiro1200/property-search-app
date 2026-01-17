-- ============================================================================
-- sellers テーブルのスキーマ確認
-- ============================================================================
-- このSQLをSupabase SQL Editorで実行してください

-- 1. sellers テーブルの全カラムを確認
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'sellers'
ORDER BY ordinal_position;

-- 2. sellers テーブルの行数を確認
SELECT COUNT(*) as total_sellers FROM sellers;

-- 3. 最新の売主番号を確認
SELECT seller_number, created_at
FROM sellers
ORDER BY created_at DESC
LIMIT 5;

-- 4. inquiry_date 関連のカラムを検索
SELECT column_name
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'sellers'
  AND column_name LIKE '%inquiry%'
ORDER BY column_name;

-- 5. confidence カラムの存在確認
SELECT column_name
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'sellers'
  AND column_name = 'confidence';

-- 6. comments カラムの存在確認（migration 087で削除済みのはず）
SELECT column_name
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'sellers'
  AND column_name = 'comments';
