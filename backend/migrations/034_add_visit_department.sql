-- Migration 034: 訪問部フィールドを追加
-- visit_department列を追加（要件1, 2, 3, 4, 5, 6に対応）

-- 訪問部フィールドを追加
ALTER TABLE sellers
ADD COLUMN IF NOT EXISTS visit_department TEXT;

-- コメントを追加
COMMENT ON COLUMN sellers.visit_department IS '訪問部（訪問を担当する部署のスタッフ）';
