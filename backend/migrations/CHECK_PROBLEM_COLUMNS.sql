-- ============================================================================
-- 問題のあるカラムを確認
-- ============================================================================

-- confidence カラムの存在確認
SELECT 'confidence' as checking_column, COUNT(*) as exists
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'sellers'
  AND column_name = 'confidence'

UNION ALL

-- comments カラムの存在確認
SELECT 'comments' as checking_column, COUNT(*) as exists
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'sellers'
  AND column_name = 'comments'

UNION ALL

-- inquiry_date カラムの存在確認
SELECT 'inquiry_date' as checking_column, COUNT(*) as exists
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'sellers'
  AND column_name = 'inquiry_date';
