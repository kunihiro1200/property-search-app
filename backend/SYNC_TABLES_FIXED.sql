-- ===== 修正版: Sync Tables 作成SQL =====
-- エラー修正: is_healthy カラムを削除

-- ===== Migration 026: sync_logs と error_logs =====

-- sync_logs テーブル作成
CREATE TABLE IF NOT EXISTS sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sync_type VARCHAR(50) NOT NULL CHECK (sync_type IN ('migration', 'create', 'update', 'delete', 'manual', 'batch')),
  seller_id UUID REFERENCES sellers(id) ON DELETE SET NULL,
  status VARCHAR(20) NOT NULL CHECK (status IN ('pending', 'in_progress', 'success', 'failed', 'partial')),
  error_message TEXT,
  rows_affected INTEGER DEFAULT 0,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  duration_ms INTEGER,
  metadata JSONB,
  missing_sellers_detected INTEGER DEFAULT 0,
  triggered_by VARCHAR(20) DEFAULT 'scheduled',
  health_status VARCHAR(20) DEFAULT 'healthy',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- error_logs テーブル作成
CREATE TABLE IF NOT EXISTS error_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  error_type VARCHAR(50) NOT NULL CHECK (error_type IN ('network', 'validation', 'rate_limit', 'auth', 'conflict', 'unknown')),
  error_message TEXT NOT NULL,
  stack_trace TEXT,
  seller_id UUID REFERENCES sellers(id) ON DELETE SET NULL,
  operation VARCHAR(50),
  retry_count INTEGER DEFAULT 0,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- sellersテーブルにsynced_to_sheet_atカラム追加
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'sellers' AND column_name = 'synced_to_sheet_at'
  ) THEN
    ALTER TABLE sellers ADD COLUMN synced_to_sheet_at TIMESTAMP WITH TIME ZONE;
  END IF;
END $$;

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_sync_logs_seller_id ON sync_logs(seller_id);
CREATE INDEX IF NOT EXISTS idx_sync_logs_sync_type ON sync_logs(sync_type);
CREATE INDEX IF NOT EXISTS idx_sync_logs_status ON sync_logs(status);
CREATE INDEX IF NOT EXISTS idx_sync_logs_started_at ON sync_logs(started_at DESC);

CREATE INDEX IF NOT EXISTS idx_error_logs_seller_id ON error_logs(seller_id);
CREATE INDEX IF NOT EXISTS idx_error_logs_error_type ON error_logs(error_type);
CREATE INDEX IF NOT EXISTS idx_error_logs_created_at ON error_logs(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_sellers_synced_to_sheet_at ON sellers(synced_to_sheet_at);

-- ===== Migration 039: sync_health (修正版 - is_healthyカラムを削除) =====

-- sync_health テーブル作成
CREATE TABLE IF NOT EXISTS sync_health (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  last_sync_time TIMESTAMP WITH TIME ZONE,
  last_sync_success BOOLEAN DEFAULT false,
  pending_missing_sellers INTEGER DEFAULT 0,
  consecutive_failures INTEGER DEFAULT 0,
  sync_interval_minutes INTEGER DEFAULT 5,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 初期レコード挿入 (is_healthyカラムを削除)
INSERT INTO sync_health (id, sync_interval_minutes, last_sync_success, consecutive_failures, pending_missing_sellers)
SELECT gen_random_uuid(), 5, false, 0, 0
WHERE NOT EXISTS (SELECT 1 FROM sync_health LIMIT 1);

-- PostgRESTスキーマキャッシュをリロード
NOTIFY pgrst, 'reload schema';

-- 完了メッセージ
SELECT 'All sync tables created successfully!' AS result;
