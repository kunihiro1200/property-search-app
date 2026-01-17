-- Migration: 043_add_phone_integration
-- Description: AI電話統合機能のためのテーブル作成
-- Date: 2025-12-13

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- call_logs テーブル
-- 通話ログを記録するメインテーブル
-- ============================================================================
CREATE TABLE IF NOT EXISTS call_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  seller_id UUID NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
  user_id UUID REFERENCES employees(id) ON DELETE SET NULL,
  
  -- 通話情報
  direction VARCHAR(10) NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  phone_number VARCHAR(20) NOT NULL,
  call_status VARCHAR(20) NOT NULL CHECK (call_status IN ('completed', 'missed', 'failed', 'busy', 'no_answer')),
  
  -- タイミング情報
  started_at TIMESTAMP WITH TIME ZONE NOT NULL,
  ended_at TIMESTAMP WITH TIME ZONE,
  duration_seconds INTEGER,
  
  -- AWS Connect情報
  contact_id VARCHAR(255) UNIQUE,
  instance_id VARCHAR(255),
  queue_id VARCHAR(255),
  agent_id VARCHAR(255),
  
  -- メタデータ
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- 制約
  CONSTRAINT valid_duration CHECK (duration_seconds IS NULL OR duration_seconds >= 0),
  CONSTRAINT valid_end_time CHECK (ended_at IS NULL OR ended_at >= started_at)
);

-- インデックス作成
CREATE INDEX idx_call_logs_seller_id ON call_logs(seller_id);
CREATE INDEX idx_call_logs_user_id ON call_logs(user_id);
CREATE INDEX idx_call_logs_started_at ON call_logs(started_at DESC);
CREATE INDEX idx_call_logs_contact_id ON call_logs(contact_id) WHERE contact_id IS NOT NULL;
CREATE INDEX idx_call_logs_direction ON call_logs(direction);
CREATE INDEX idx_call_logs_status ON call_logs(call_status);

-- コメント追加
COMMENT ON TABLE call_logs IS '通話ログテーブル - 発信・着信の通話記録を保存';
COMMENT ON COLUMN call_logs.direction IS '通話方向: inbound（着信）またはoutbound（発信）';
COMMENT ON COLUMN call_logs.call_status IS '通話ステータス: completed, missed, failed, busy, no_answer';
COMMENT ON COLUMN call_logs.contact_id IS 'Amazon ConnectのコンタクトID';

-- ============================================================================
-- call_transcriptions テーブル
-- 通話の文字起こしデータを保存
-- ============================================================================
CREATE TABLE IF NOT EXISTS call_transcriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  call_log_id UUID NOT NULL REFERENCES call_logs(id) ON DELETE CASCADE,
  
  -- 文字起こし内容
  transcription_text TEXT NOT NULL,
  transcription_json JSONB, -- 詳細な文字起こしデータ（話者識別、タイムスタンプ等）
  language_code VARCHAR(10) DEFAULT 'ja-JP',
  confidence_score DECIMAL(5,4),
  
  -- 処理情報
  transcription_status VARCHAR(20) NOT NULL CHECK (transcription_status IN ('pending', 'processing', 'completed', 'failed')),
  transcription_job_id VARCHAR(255),
  error_message TEXT,
  
  -- 感情分析結果
  sentiment VARCHAR(20) CHECK (sentiment IN ('positive', 'neutral', 'negative', 'mixed')),
  sentiment_scores JSONB, -- {positive: 0.8, neutral: 0.1, negative: 0.1, mixed: 0.0}
  
  -- キーワード検出
  detected_keywords JSONB, -- ["査定", "専任媒介", "価格"]
  
  -- タイムスタンプ
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- 制約
  CONSTRAINT valid_confidence CHECK (confidence_score IS NULL OR (confidence_score >= 0 AND confidence_score <= 1))
);

-- インデックス作成
CREATE INDEX idx_call_transcriptions_call_log_id ON call_transcriptions(call_log_id);
CREATE INDEX idx_call_transcriptions_status ON call_transcriptions(transcription_status);
CREATE INDEX idx_call_transcriptions_sentiment ON call_transcriptions(sentiment) WHERE sentiment IS NOT NULL;
CREATE INDEX idx_call_transcriptions_keywords ON call_transcriptions USING GIN (detected_keywords) WHERE detected_keywords IS NOT NULL;

-- コメント追加
COMMENT ON TABLE call_transcriptions IS '通話文字起こしテーブル - Amazon Transcribeによる文字起こし結果';
COMMENT ON COLUMN call_transcriptions.transcription_json IS '話者識別やタイムスタンプを含む詳細な文字起こしデータ（JSON形式）';
COMMENT ON COLUMN call_transcriptions.sentiment IS '感情分析結果: positive, neutral, negative, mixed';

-- ============================================================================
-- call_recordings テーブル
-- 録音ファイルの参照情報を保存
-- ============================================================================
CREATE TABLE IF NOT EXISTS call_recordings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  call_log_id UUID NOT NULL REFERENCES call_logs(id) ON DELETE CASCADE,
  
  -- S3ストレージ情報
  s3_bucket VARCHAR(255) NOT NULL,
  s3_key VARCHAR(500) NOT NULL,
  s3_region VARCHAR(50) NOT NULL DEFAULT 'ap-northeast-1',
  
  -- ファイル情報
  file_size_bytes BIGINT,
  duration_seconds INTEGER,
  format VARCHAR(20), -- 'wav', 'mp3', etc.
  
  -- アクセス管理
  presigned_url TEXT,
  presigned_url_expires_at TIMESTAMP WITH TIME ZONE,
  access_count INTEGER DEFAULT 0,
  last_accessed_at TIMESTAMP WITH TIME ZONE,
  last_accessed_by UUID REFERENCES employees(id) ON DELETE SET NULL,
  
  -- タイムスタンプ
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- 制約
  CONSTRAINT valid_file_size CHECK (file_size_bytes IS NULL OR file_size_bytes > 0),
  CONSTRAINT valid_recording_duration CHECK (duration_seconds IS NULL OR duration_seconds > 0),
  CONSTRAINT unique_s3_location UNIQUE (s3_bucket, s3_key)
);

-- インデックス作成
CREATE INDEX idx_call_recordings_call_log_id ON call_recordings(call_log_id);
CREATE INDEX idx_call_recordings_s3_location ON call_recordings(s3_bucket, s3_key);
CREATE INDEX idx_call_recordings_last_accessed ON call_recordings(last_accessed_at DESC) WHERE last_accessed_at IS NOT NULL;

-- コメント追加
COMMENT ON TABLE call_recordings IS '通話録音ファイルテーブル - S3に保存された録音ファイルの参照情報';
COMMENT ON COLUMN call_recordings.presigned_url IS '一時的なアクセス用のpresigned URL（有効期限付き）';
COMMENT ON COLUMN call_recordings.access_count IS '録音ファイルへのアクセス回数（監査用）';

-- ============================================================================
-- call_keywords テーブル
-- キーワード検出ルールを定義
-- ============================================================================
CREATE TABLE IF NOT EXISTS call_keywords (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  keyword VARCHAR(100) NOT NULL,
  category VARCHAR(50), -- 'urgency', 'interest', 'objection', 'contract', etc.
  priority INTEGER DEFAULT 0,
  auto_action VARCHAR(50), -- 'create_followup', 'notify_manager', 'flag_urgent', etc.
  action_config JSONB, -- 自動アクションの設定（JSON形式）
  is_active BOOLEAN DEFAULT true,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES employees(id) ON DELETE SET NULL,
  
  CONSTRAINT unique_keyword UNIQUE (keyword)
);

-- インデックス作成
CREATE INDEX idx_call_keywords_active ON call_keywords(is_active) WHERE is_active = true;
CREATE INDEX idx_call_keywords_category ON call_keywords(category) WHERE category IS NOT NULL;
CREATE INDEX idx_call_keywords_priority ON call_keywords(priority DESC);

-- コメント追加
COMMENT ON TABLE call_keywords IS 'キーワード検出ルールテーブル - 通話内容から検出するキーワードと自動アクション';
COMMENT ON COLUMN call_keywords.auto_action IS '検出時の自動アクション: create_followup, notify_manager, flag_urgent等';
COMMENT ON COLUMN call_keywords.action_config IS '自動アクションの詳細設定（JSON形式）';

-- ============================================================================
-- デフォルトキーワードの挿入
-- ============================================================================
INSERT INTO call_keywords (keyword, category, priority, auto_action, is_active) VALUES
  ('査定', 'interest', 10, 'create_followup', true),
  ('専任媒介', 'contract', 20, 'notify_manager', true),
  ('一般媒介', 'contract', 15, 'create_followup', true),
  ('売却', 'interest', 10, 'create_followup', true),
  ('価格', 'interest', 5, NULL, true),
  ('急ぎ', 'urgency', 30, 'flag_urgent', true),
  ('至急', 'urgency', 30, 'flag_urgent', true),
  ('検討中', 'interest', 5, NULL, true),
  ('他社', 'objection', 15, 'notify_manager', true),
  ('断る', 'objection', 20, 'notify_manager', true)
ON CONFLICT (keyword) DO NOTHING;

-- ============================================================================
-- トリガー関数: updated_at自動更新
-- ============================================================================
CREATE OR REPLACE FUNCTION update_phone_integration_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- トリガー作成
CREATE TRIGGER update_call_logs_updated_at
  BEFORE UPDATE ON call_logs
  FOR EACH ROW
  EXECUTE FUNCTION update_phone_integration_updated_at();

CREATE TRIGGER update_call_transcriptions_updated_at
  BEFORE UPDATE ON call_transcriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_phone_integration_updated_at();

CREATE TRIGGER update_call_recordings_updated_at
  BEFORE UPDATE ON call_recordings
  FOR EACH ROW
  EXECUTE FUNCTION update_phone_integration_updated_at();

CREATE TRIGGER update_call_keywords_updated_at
  BEFORE UPDATE ON call_keywords
  FOR EACH ROW
  EXECUTE FUNCTION update_phone_integration_updated_at();

-- ============================================================================
-- Activity Logsとの統合用ビュー
-- ============================================================================
CREATE OR REPLACE VIEW call_logs_with_details AS
SELECT 
  cl.id,
  cl.seller_id,
  cl.user_id,
  cl.direction,
  cl.phone_number,
  cl.call_status,
  cl.started_at,
  cl.ended_at,
  cl.duration_seconds,
  cl.contact_id,
  ct.transcription_text,
  ct.sentiment,
  ct.detected_keywords,
  cr.s3_bucket,
  cr.s3_key,
  s.seller_number,
  s.name_kanji as seller_name,
  e.name as user_name
FROM call_logs cl
LEFT JOIN call_transcriptions ct ON cl.id = ct.call_log_id AND ct.transcription_status = 'completed'
LEFT JOIN call_recordings cr ON cl.id = cr.call_log_id
LEFT JOIN sellers s ON cl.seller_id = s.id
LEFT JOIN employees e ON cl.user_id = e.id;

COMMENT ON VIEW call_logs_with_details IS '通話ログの詳細ビュー - 文字起こし、録音、売主情報を結合';

-- ============================================================================
-- 統計用ビュー
-- ============================================================================
CREATE OR REPLACE VIEW call_statistics_daily AS
SELECT 
  DATE(started_at) as call_date,
  direction,
  call_status,
  COUNT(*) as call_count,
  AVG(duration_seconds) as avg_duration_seconds,
  SUM(duration_seconds) as total_duration_seconds
FROM call_logs
GROUP BY DATE(started_at), direction, call_status
ORDER BY call_date DESC, direction, call_status;

COMMENT ON VIEW call_statistics_daily IS '日次通話統計ビュー - 方向・ステータス別の集計';

-- ============================================================================
-- 権限設定（必要に応じて調整）
-- ============================================================================
-- GRANT SELECT, INSERT, UPDATE, DELETE ON call_logs TO your_app_user;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON call_transcriptions TO your_app_user;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON call_recordings TO your_app_user;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON call_keywords TO your_app_user;
-- GRANT SELECT ON call_logs_with_details TO your_app_user;
-- GRANT SELECT ON call_statistics_daily TO your_app_user;

-- ============================================================================
-- マイグレーション完了
-- ============================================================================
