-- エラーログテーブルの作成
CREATE TABLE IF NOT EXISTS error_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  error_type VARCHAR(50) NOT NULL,
  message TEXT NOT NULL,
  stack TEXT,
  context JSONB,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  user_id UUID REFERENCES employees(id),
  resolved BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- インデックスの作成
CREATE INDEX IF NOT EXISTS idx_error_logs_error_type ON error_logs(error_type);
CREATE INDEX IF NOT EXISTS idx_error_logs_timestamp ON error_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_error_logs_resolved ON error_logs(resolved);
CREATE INDEX IF NOT EXISTS idx_error_logs_user_id ON error_logs(user_id);

-- updated_atの自動更新トリガー
CREATE OR REPLACE FUNCTION update_error_logs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_error_logs_updated_at
  BEFORE UPDATE ON error_logs
  FOR EACH ROW
  EXECUTE FUNCTION update_error_logs_updated_at();

-- コメント
COMMENT ON TABLE error_logs IS 'システムエラーログ';
COMMENT ON COLUMN error_logs.error_type IS 'エラーの種類 (network, authentication, data_integrity, rate_limit, unknown)';
COMMENT ON COLUMN error_logs.message IS 'エラーメッセージ';
COMMENT ON COLUMN error_logs.stack IS 'スタックトレース';
COMMENT ON COLUMN error_logs.context IS 'エラー発生時のコンテキスト情報';
COMMENT ON COLUMN error_logs.timestamp IS 'エラー発生日時';
COMMENT ON COLUMN error_logs.user_id IS 'エラーを発生させたユーザーID';
COMMENT ON COLUMN error_logs.resolved IS '解決済みフラグ';
