-- ============================================================================
-- sellers テーブルのスキーマ確認（シンプル版）
-- ============================================================================

-- 1. sellers テーブルの全カラムを確認
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'sellers'
ORDER BY ordinal_position;
