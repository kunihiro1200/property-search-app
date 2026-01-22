-- Migration 098: employeesテーブルの制約を修正
-- google_idをNULL許可に変更し、roleの制約を更新

-- 1. google_idのNOT NULL制約を削除
ALTER TABLE employees ALTER COLUMN google_id DROP NOT NULL;

-- 2. roleのcheck制約を削除して再作成（'staff'を追加）
ALTER TABLE employees DROP CONSTRAINT IF EXISTS employees_role_check;
ALTER TABLE employees ADD CONSTRAINT employees_role_check 
  CHECK (role IN ('admin', 'manager', 'staff', 'viewer'));

-- 3. initialsカラムにインデックスを追加（検索の高速化）
CREATE INDEX IF NOT EXISTS idx_employees_initials ON employees(initials);

-- 4. is_activeカラムにインデックスを追加
CREATE INDEX IF NOT EXISTS idx_employees_is_active ON employees(is_active);

COMMENT ON COLUMN employees.google_id IS 'Google OAuth ID (NULL許可 - スプレッドシートから同期されたスタッフの場合)';
COMMENT ON COLUMN employees.role IS 'ユーザーロール: admin, manager, staff, viewer';
