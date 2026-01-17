-- Migration 018: Add exclusive_other_decision_factors column
-- 専任・他決要因フィールドを追加（複数選択対応）

-- exclusive_other_decision_factors カラムを追加（JSON配列として保存）
ALTER TABLE sellers
ADD COLUMN IF NOT EXISTS exclusive_other_decision_factors JSONB;

-- インデックスを追加（検索性能向上のため）
CREATE INDEX IF NOT EXISTS idx_sellers_exclusive_other_decision_factors 
ON sellers USING GIN (exclusive_other_decision_factors);

-- コメントを追加
COMMENT ON COLUMN sellers.exclusive_other_decision_factors IS '専任・他決要因（複数選択可能、JSON配列）';
