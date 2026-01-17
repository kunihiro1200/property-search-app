-- 完全修正版: sync_health と sync_logs テーブルの作成
-- 既存のテーブルを削除してから再作成します

-- ステップ1: 既存のテーブルを削除
DROP TABLE IF EXISTS sync_health CASCADE;
DROP TABLE IF EXISTS sync_logs CASCADE;

-- ステップ2: sync_health テーブルを作成
CREATE TABLE sync_health (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  last_sync_time TIMESTAMP WITH TIME ZONE,
  last_sync_success BOOLEAN DEFAULT false,
  pending_missing_sellers INTEGER DEFAULT 0,
  consecutive_failures INTEGER DEFAULT 0,
  sync_interval_minutes INTEGER DEFAULT 5,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ステップ3: 初期レコードを挿入（is_healthyカラムなし）
INSERT INTO sync_health (id, sync_interval_minutes)
VALUES (gen_random_uuid(), 5);

-- ステップ4: sync_logs テーブルを作成
CREATE TABLE sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  status VARCHAR(20) DEFAULT 'pending',
  sellers_synced INTEGER DEFAULT 0,
  errors_count INTEGER DEFAULT 0,
  error_details TEXT,
  missing_sellers_detected INTEGER DEFAULT 0,
  triggered_by VARCHAR(20) DEFAULT 'scheduled',
  health_status VARCHAR(20) DEFAULT 'healthy',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ステップ5: インデックスを作成
CREATE INDEX idx_sync_logs_started_at_desc ON sync_logs(started_at DESC);
CREATE INDEX idx_sync_logs_status_idx ON sync_logs(status);

-- 完了メッセージ
SELECT 'sync_health と sync_logs テーブルが正常に作成されました' AS result;
