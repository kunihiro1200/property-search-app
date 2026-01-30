-- 手入力査定額カラムを追加
-- スプレッドシートの「査定額1」「査定額2」「査定額3」に対応

ALTER TABLE sellers
ADD COLUMN IF NOT EXISTS manual_valuation_amount_1 NUMERIC,
ADD COLUMN IF NOT EXISTS manual_valuation_amount_2 NUMERIC,
ADD COLUMN IF NOT EXISTS manual_valuation_amount_3 NUMERIC;

-- コメントを追加
COMMENT ON COLUMN sellers.manual_valuation_amount_1 IS '手入力査定額1（スプレッドシートの「査定額1」）';
COMMENT ON COLUMN sellers.manual_valuation_amount_2 IS '手入力査定額2（スプレッドシートの「査定額2」）';
COMMENT ON COLUMN sellers.manual_valuation_amount_3 IS '手入力査定額3（スプレッドシートの「査定額3」）';

-- 既存のカラムにもコメントを追加
COMMENT ON COLUMN sellers.valuation_amount_1 IS '自動計算査定額1（スプレッドシートの「査定額1（自動計算）v」）';
COMMENT ON COLUMN sellers.valuation_amount_2 IS '自動計算査定額2（スプレッドシートの「査定額2（自動計算）v」）';
COMMENT ON COLUMN sellers.valuation_amount_3 IS '自動計算査定額3（スプレッドシートの「査定額3（自動計算）v」）';
