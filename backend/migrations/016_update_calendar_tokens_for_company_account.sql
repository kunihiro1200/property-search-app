-- Google Calendar トークンテーブルを会社アカウント方式に対応

-- 1. 既存の外部キー制約を削除
ALTER TABLE google_calendar_tokens 
DROP CONSTRAINT IF EXISTS google_calendar_tokens_employee_id_fkey;

-- 2. employee_idをNULLABLEに変更
ALTER TABLE google_calendar_tokens 
ALTER COLUMN employee_id DROP NOT NULL;

-- 3. 会社アカウント識別用のカラムを追加
ALTER TABLE google_calendar_tokens 
ADD COLUMN IF NOT EXISTS is_company_account BOOLEAN DEFAULT FALSE;

-- 4. account_identifierカラムを追加（会社アカウントの場合は固定文字列、個人の場合はemployee_id）
ALTER TABLE google_calendar_tokens 
ADD COLUMN IF NOT EXISTS account_identifier TEXT;

-- 5. 既存のUNIQUE制約を削除
ALTER TABLE google_calendar_tokens 
DROP CONSTRAINT IF EXISTS google_calendar_tokens_employee_id_key;

-- 6. 新しいUNIQUE制約を追加（account_identifierで一意性を保証）
CREATE UNIQUE INDEX IF NOT EXISTS idx_google_calendar_tokens_account_identifier 
ON google_calendar_tokens(account_identifier);

-- 7. 既存のインデックスを削除
DROP INDEX IF EXISTS idx_google_calendar_tokens_employee;

-- コメントを更新
COMMENT ON COLUMN google_calendar_tokens.is_company_account IS '会社アカウントかどうか';
COMMENT ON COLUMN google_calendar_tokens.account_identifier IS 'アカウント識別子（会社アカウントの場合は"company_calendar_account"、個人の場合はemployee_id）';
