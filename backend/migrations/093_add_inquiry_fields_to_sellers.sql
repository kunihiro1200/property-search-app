-- ============================================================================
-- 093 sellersテーブルに反響関連フィールドを追加
-- 反響年、反響日、サイトのカラムを追加します
-- ============================================================================

-- 反響年カラムを追加
ALTER TABLE sellers 
ADD COLUMN IF NOT EXISTS inquiry_year INTEGER;

-- 反響日カラムを追加（日付型）
ALTER TABLE sellers 
ADD COLUMN IF NOT EXISTS inquiry_date DATE;

-- サイトカラムを追加
ALTER TABLE sellers 
ADD COLUMN IF NOT EXISTS inquiry_site VARCHAR(100);

-- インデックスを作成（検索パフォーマンス向上）
CREATE INDEX IF NOT EXISTS idx_sellers_inquiry_year ON sellers(inquiry_year);
CREATE INDEX IF NOT EXISTS idx_sellers_inquiry_date ON sellers(inquiry_date DESC);
CREATE INDEX IF NOT EXISTS idx_sellers_inquiry_site ON sellers(inquiry_site);

-- コメントを追加
COMMENT ON COLUMN sellers.inquiry_year IS '反響年（スプレッドシートの「反響年」カラム）';
COMMENT ON COLUMN sellers.inquiry_date IS '反響日（スプレッドシートの「反響日」カラムから計算）';
COMMENT ON COLUMN sellers.inquiry_site IS 'サイト（スプレッドシートの「サイト」カラム）';

-- 完了メッセージ
DO $$ 
BEGIN
  RAISE NOTICE '✅ sellersテーブルに反響関連フィールドを追加しました';
  RAISE NOTICE '   - inquiry_year: 反響年';
  RAISE NOTICE '   - inquiry_date: 反響日';
  RAISE NOTICE '   - inquiry_site: サイト';
END $$;
