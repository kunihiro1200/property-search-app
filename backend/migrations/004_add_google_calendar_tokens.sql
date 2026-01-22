-- Google Calendar OAuth トークンを保存するテーブルを作成

CREATE TABLE IF NOT EXISTS google_calendar_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  encrypted_refresh_token TEXT NOT NULL,
  token_expiry TIMESTAMP,
  scope TEXT NOT NULL DEFAULT 'https://www.googleapis.com/auth/calendar.events',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(employee_id)
);

-- インデックスを作成
CREATE INDEX IF NOT EXISTS idx_google_calendar_tokens_employee 
ON google_calendar_tokens(employee_id);

-- コメントを追加
COMMENT ON TABLE google_calendar_tokens IS 'Google Calendar OAuth認証トークン（暗号化）';
COMMENT ON COLUMN google_calendar_tokens.employee_id IS '社員ID';
COMMENT ON COLUMN google_calendar_tokens.encrypted_refresh_token IS '暗号化されたリフレッシュトークン';
COMMENT ON COLUMN google_calendar_tokens.token_expiry IS 'トークンの有効期限';
COMMENT ON COLUMN google_calendar_tokens.scope IS 'OAuth スコープ';
