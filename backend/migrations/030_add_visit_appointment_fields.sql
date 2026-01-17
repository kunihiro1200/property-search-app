-- Migration 030: 訪問予約フィールドの修正
-- visit_department列を削除し、必要なフィールドのみを保持

-- 誤って追加された visit_department 列を削除
ALTER TABLE sellers DROP COLUMN IF EXISTS visit_department;

-- 訪問査定取得者フィールドを追加（既に存在する場合はスキップ）
ALTER TABLE sellers
ADD COLUMN IF NOT EXISTS visit_valuation_acquirer TEXT;

-- visit_date と visit_time が存在することを確認（既存のマイグレーションで追加済みのはず）
-- これらは appointment_date から分離されたフィールド
ALTER TABLE sellers
ADD COLUMN IF NOT EXISTS visit_date TIMESTAMP,
ADD COLUMN IF NOT EXISTS visit_time TEXT,
ADD COLUMN IF NOT EXISTS visit_assignee TEXT;

-- コメントを追加
COMMENT ON COLUMN sellers.visit_valuation_acquirer IS '訪問査定取得者（スタッフのメールアドレス）';
COMMENT ON COLUMN sellers.visit_date IS '訪問日';
COMMENT ON COLUMN sellers.visit_time IS '訪問時間';
COMMENT ON COLUMN sellers.visit_assignee IS '営担（訪問担当者のメールアドレス）';
