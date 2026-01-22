-- Migration 083: 同期メトリクステーブルの追加
-- 作成日: 2025-01-10
-- 説明: 物件リスト同期のモニタリングとアラートシステム用のテーブルを作成

-- sync_metrics テーブル: 同期メトリクスの記録
CREATE TABLE IF NOT EXISTS sync_metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sync_id UUID REFERENCES sync_state(id) ON DELETE CASCADE,
  metric_type TEXT NOT NULL,
  metric_value NUMERIC NOT NULL,
  metadata JSONB DEFAULT '{}',
  recorded_at TIMESTAMPTZ DEFAULT NOW()
);

-- インデックス: メトリクスタイプと時刻での高速検索
CREATE INDEX IF NOT EXISTS idx_sync_metrics_type_time 
ON sync_metrics(metric_type, recorded_at DESC);

-- インデックス: sync_idでの検索
CREATE INDEX IF NOT EXISTS idx_sync_metrics_sync_id 
ON sync_metrics(sync_id);

-- sync_metrics_aggregated テーブル: 集計済みメトリクス（パフォーマンス最適化）
CREATE TABLE IF NOT EXISTS sync_metrics_aggregated (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  metric_type TEXT NOT NULL,
  aggregation_period TEXT NOT NULL, -- 'hourly', 'daily'
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  avg_value NUMERIC,
  min_value NUMERIC,
  max_value NUMERIC,
  sum_value NUMERIC,
  count INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- インデックス: 集計メトリクスの検索
CREATE INDEX IF NOT EXISTS idx_sync_metrics_agg_type_period 
ON sync_metrics_aggregated(metric_type, aggregation_period, period_start DESC);

-- alert_rules テーブル: アラートルールの定義
CREATE TABLE IF NOT EXISTS alert_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  metric_type TEXT NOT NULL,
  condition TEXT NOT NULL, -- 'greater_than', 'less_than', 'equals', 'no_data'
  threshold NUMERIC,
  duration_minutes INTEGER DEFAULT 5, -- 条件が継続する時間
  severity TEXT NOT NULL, -- 'critical', 'warning', 'info'
  channels TEXT[] DEFAULT ARRAY['slack'], -- 'slack', 'email'
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- alert_history テーブル: アラート発火履歴
CREATE TABLE IF NOT EXISTS alert_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  alert_rule_id UUID REFERENCES alert_rules(id) ON DELETE CASCADE,
  triggered_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  metric_value NUMERIC,
  message TEXT,
  notification_sent BOOLEAN DEFAULT false,
  notification_channels TEXT[],
  metadata JSONB DEFAULT '{}'
);

-- インデックス: アラート履歴の検索
CREATE INDEX IF NOT EXISTS idx_alert_history_rule_time 
ON alert_history(alert_rule_id, triggered_at DESC);

-- インデックス: 未解決アラートの検索
CREATE INDEX IF NOT EXISTS idx_alert_history_unresolved 
ON alert_history(resolved_at) WHERE resolved_at IS NULL;

-- デフォルトのアラートルールを挿入
INSERT INTO alert_rules (name, description, metric_type, condition, threshold, duration_minutes, severity, channels)
VALUES
  ('sync_stopped', '24時間同期が実行されていない', 'last_sync_time', 'no_data', 1440, 0, 'critical', ARRAY['slack', 'email']),
  ('high_error_rate', 'エラー率が5%を超えている', 'error_rate', 'greater_than', 5, 5, 'critical', ARRAY['slack', 'email']),
  ('low_success_rate', '成功率が98%を下回っている', 'success_rate', 'less_than', 98, 15, 'warning', ARRAY['slack']),
  ('slow_sync', '同期時間が7.5分を超えている', 'sync_duration_seconds', 'greater_than', 450, 0, 'warning', ARRAY['slack']),
  ('circuit_breaker_open', 'サーキットブレーカーがオープン状態', 'circuit_breaker_state', 'equals', 1, 10, 'critical', ARRAY['slack', 'email'])
ON CONFLICT (name) DO NOTHING;

-- コメント追加
COMMENT ON TABLE sync_metrics IS '同期プロセスのメトリクスを記録するテーブル';
COMMENT ON TABLE sync_metrics_aggregated IS '集計済みメトリクス（パフォーマンス最適化用）';
COMMENT ON TABLE alert_rules IS 'アラートルールの定義';
COMMENT ON TABLE alert_history IS 'アラート発火履歴';

COMMENT ON COLUMN sync_metrics.metric_type IS 'メトリクスタイプ（例: success_rate, sync_duration_seconds）';
COMMENT ON COLUMN sync_metrics.metric_value IS 'メトリクスの値';
COMMENT ON COLUMN sync_metrics.metadata IS '追加のメタデータ（JSON形式）';

COMMENT ON COLUMN alert_rules.condition IS '条件タイプ（greater_than, less_than, equals, no_data）';
COMMENT ON COLUMN alert_rules.threshold IS '閾値';
COMMENT ON COLUMN alert_rules.duration_minutes IS '条件が継続する必要がある時間（分）';
COMMENT ON COLUMN alert_rules.severity IS '重要度（critical, warning, info）';
COMMENT ON COLUMN alert_rules.channels IS '通知チャネル（slack, email）';
