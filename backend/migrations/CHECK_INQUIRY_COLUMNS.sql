-- ============================================================================
-- inquiry 関連のカラムを確認
-- ============================================================================

-- inquiry で始まるカラムを検索
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'sellers'
  AND column_name LIKE 'inquiry%'
ORDER BY column_name;
