# Migration 083 実行ガイド

## 📋 概要

**Migration 083**: 同期メトリクステーブルの追加  
**作成日**: 2025-01-10  
**目的**: 物件リスト同期のモニタリングとアラートシステム用のテーブルを作成

## 🎯 作成されるテーブル

### 1. sync_metrics
同期プロセスのメトリクスを記録するテーブル

**カラム**:
- `id`: UUID (主キー)
- `sync_id`: UUID (sync_stateテーブルへの外部キー)
- `metric_type`: TEXT (メトリクスタイプ)
- `metric_value`: NUMERIC (メトリクス値)
- `metadata`: JSONB (追加のメタデータ)
- `recorded_at`: TIMESTAMPTZ (記録日時)

**インデックス**:
- `idx_sync_metrics_type_time`: メトリクスタイプと時刻での検索用
- `idx_sync_metrics_sync_id`: sync_idでの検索用

### 2. sync_metrics_aggregated
集計済みメトリクス（パフォーマンス最適化用）

**カラム**:
- `id`: UUID (主キー)
- `metric_type`: TEXT (メトリクスタイプ)
- `aggregation_period`: TEXT ('hourly' または 'daily')
- `period_start`: TIMESTAMPTZ (集計期間の開始)
- `period_end`: TIMESTAMPTZ (集計期間の終了)
- `avg_value`: NUMERIC (平均値)
- `min_value`: NUMERIC (最小値)
- `max_value`: NUMERIC (最大値)
- `sum_value`: NUMERIC (合計値)
- `count`: INTEGER (件数)
- `created_at`: TIMESTAMPTZ (作成日時)

**インデックス**:
- `idx_sync_metrics_agg_type_period`: 集計メトリクスの検索用

### 3. alert_rules
アラートルールの定義

**カラム**:
- `id`: UUID (主キー)
- `name`: TEXT (ルール名、ユニーク)
- `description`: TEXT (説明)
- `metric_type`: TEXT (監視するメトリクスタイプ)
- `condition`: TEXT (条件: 'greater_than', 'less_than', 'equals', 'no_data')
- `threshold`: NUMERIC (閾値)
- `duration_minutes`: INTEGER (条件が継続する時間)
- `severity`: TEXT (重要度: 'critical', 'warning', 'info')
- `channels`: TEXT[] (通知チャネル: 'slack', 'email')
- `enabled`: BOOLEAN (有効/無効)
- `created_at`: TIMESTAMPTZ (作成日時)
- `updated_at`: TIMESTAMPTZ (更新日時)

**デフォルトルール**:
1. `sync_stopped`: 24時間同期が実行されていない (critical)
2. `high_error_rate`: エラー率が5%を超えている (critical)
3. `low_success_rate`: 成功率が98%を下回っている (warning)
4. `slow_sync`: 同期時間が7.5分を超えている (warning)
5. `circuit_breaker_open`: サーキットブレーカーがオープン状態 (critical)

### 4. alert_history
アラート発火履歴

**カラム**:
- `id`: UUID (主キー)
- `alert_rule_id`: UUID (alert_rulesテーブルへの外部キー)
- `triggered_at`: TIMESTAMPTZ (発火日時)
- `resolved_at`: TIMESTAMPTZ (解決日時)
- `metric_value`: NUMERIC (発火時のメトリクス値)
- `message`: TEXT (メッセージ)
- `notification_sent`: BOOLEAN (通知送信済み)
- `notification_channels`: TEXT[] (通知したチャネル)
- `metadata`: JSONB (追加のメタデータ)

**インデックス**:
- `idx_alert_history_rule_time`: アラート履歴の検索用
- `idx_alert_history_unresolved`: 未解決アラートの検索用

## 🚀 実行手順

### ステップ1: 環境変数の確認

```bash
# .envファイルに以下が設定されていることを確認
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### ステップ2: マイグレーション実行

```bash
cd backend
npx ts-node migrations/run-083-migration.ts
```

### ステップ3: 実行結果の確認

以下のメッセージが表示されれば成功です:

```
🚀 Migration 083を実行します...

📄 SQLファイルを読み込みました
📊 テーブルを作成中...

✅ Migration 083が正常に完了しました

📋 作成されたテーブル:
  - sync_metrics
  - sync_metrics_aggregated
  - alert_rules
  - alert_history

🚨 デフォルトのアラートルール:
  - sync_stopped (critical) ✓
  - high_error_rate (critical) ✓
  - low_success_rate (warning) ✓
  - slow_sync (warning) ✓
  - circuit_breaker_open (critical) ✓

✨ マイグレーション完了！
```

## 🔍 検証方法

### テーブルの存在確認

Supabaseダッシュボードで以下のテーブルが作成されていることを確認:

1. Table Editor → `sync_metrics`
2. Table Editor → `sync_metrics_aggregated`
3. Table Editor → `alert_rules`
4. Table Editor → `alert_history`

### アラートルールの確認

```sql
SELECT name, severity, enabled 
FROM alert_rules 
ORDER BY severity DESC, name;
```

期待される結果:
```
name                    | severity  | enabled
------------------------+-----------+---------
high_error_rate         | critical  | true
sync_stopped            | critical  | true
circuit_breaker_open    | critical  | true
low_success_rate        | warning   | true
slow_sync               | warning   | true
```

## 📊 使用例

### メトリクスの記録

```typescript
import { SyncMetricsCollector } from './services/SyncMetricsCollector';

const collector = new SyncMetricsCollector();

await collector.recordSyncMetrics({
  syncId: 'sync_123',
  successCount: 95,
  errorCount: 5,
  totalCount: 100,
  durationSeconds: 120,
  throughput: 0.83,
  errorsByType: {
    network_error: 3,
    validation_error: 2,
    database_error: 0,
    rate_limit_error: 0,
    unknown_error: 0
  },
  apiResponseTimes: [245, 312, 189, 456, 234],
  circuitBreakerState: 'closed'
});
```

### Prometheusメトリクスの取得

```bash
curl http://localhost:3001/metrics
```

## ⚠️ 注意事項

1. **データ保持期間**:
   - 詳細メトリクス: 7日間
   - 時間単位集計: 30日間
   - 日単位集計: 1年間

2. **クリーンアップ**:
   - 毎日午前3時に自動実行される予定
   - 手動実行: `npx ts-node src/jobs/metricsCleanup.ts`

3. **パフォーマンス**:
   - メトリクス記録のオーバーヘッドは約5%以下
   - 大量のメトリクスが蓄積される場合は集計テーブルを使用

## 🔄 ロールバック

マイグレーションをロールバックする場合:

```sql
-- テーブルを削除
DROP TABLE IF EXISTS alert_history CASCADE;
DROP TABLE IF EXISTS alert_rules CASCADE;
DROP TABLE IF EXISTS sync_metrics_aggregated CASCADE;
DROP TABLE IF EXISTS sync_metrics CASCADE;
```

## 📝 次のステップ

Migration 083完了後:

1. ✅ メトリクス収集システムの実装完了
2. ⏭️ ステップ2: アラートシステムの実装
3. ⏭️ ステップ3: ダッシュボードの実装

---

**作成日**: 2025-01-10  
**最終更新**: 2025-01-10
