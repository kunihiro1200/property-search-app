-- Migration 094: Add unique constraint to buyer_number
-- This allows upsert operations using buyer_number as the conflict target

-- 既存の重複データを確認・修正
-- 重複がある場合は、最新のレコードを残して古いレコードを削除

-- 重複チェック
DO $$
DECLARE
  duplicate_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO duplicate_count
  FROM (
    SELECT buyer_number, COUNT(*) as cnt
    FROM buyers
    WHERE buyer_number IS NOT NULL AND buyer_number != ''
    GROUP BY buyer_number
    HAVING COUNT(*) > 1
  ) duplicates;
  
  IF duplicate_count > 0 THEN
    RAISE NOTICE '重複する買主番号が % 件見つかりました。最新のレコードを残して削除します。', duplicate_count;
    
    -- 重複レコードを削除（最新のcreated_atを持つレコード以外）
    DELETE FROM buyers
    WHERE buyer_id IN (
      SELECT buyer_id
      FROM (
        SELECT 
          buyer_id,
          buyer_number,
          ROW_NUMBER() OVER (PARTITION BY buyer_number ORDER BY created_at DESC, buyer_id DESC) as rn
        FROM buyers
        WHERE buyer_number IS NOT NULL AND buyer_number != ''
      ) ranked
      WHERE rn > 1
    );
    
    RAISE NOTICE '重複レコードを削除しました。';
  ELSE
    RAISE NOTICE '重複する買主番号は見つかりませんでした。';
  END IF;
END $$;

-- buyer_numberにユニーク制約を追加
ALTER TABLE buyers
ADD CONSTRAINT buyers_buyer_number_unique UNIQUE (buyer_number);

-- インデックスは既に存在するため、追加不要
-- CREATE INDEX IF NOT EXISTS idx_buyers_buyer_number ON buyers(buyer_number);

COMMENT ON CONSTRAINT buyers_buyer_number_unique ON buyers IS '買主番号は一意である必要があります';
