-- ============================================================================
-- 091 sellers制約修正
-- addressをNULL許可、ステータス制約を削除
-- ============================================================================

-- Step 1: addressカラムをNULL許可に変更
ALTER TABLE sellers ALTER COLUMN address DROP NOT NULL;

-- Step 2: nameカラムもNULL許可に変更（念のため）
ALTER TABLE sellers ALTER COLUMN name DROP NOT NULL;

-- Step 3: phone_numberカラムもNULL許可に変更（念のため）
ALTER TABLE sellers ALTER COLUMN phone_number DROP NOT NULL;

-- Step 4: ステータス制約を削除（スプレッドシートに様々なステータスがあるため）
ALTER TABLE sellers DROP CONSTRAINT IF EXISTS sellers_status_check;

-- 完了メッセージ
DO $$ 
BEGIN
  RAISE NOTICE '✅ sellers制約を修正しました';
  RAISE NOTICE '  - addressカラム: NULL許可';
  RAISE NOTICE '  - nameカラム: NULL許可';
  RAISE NOTICE '  - phone_numberカラム: NULL許可';
  RAISE NOTICE '  - ステータス制約: 削除（任意の値を許可）';
END $$;
