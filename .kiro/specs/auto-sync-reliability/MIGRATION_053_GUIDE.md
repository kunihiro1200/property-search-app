# Migration 053: 同期メタデータカラムの追加

## 概要

このマイグレーションは、`sync_logs`テーブルに以下のカラムを追加します：

- `missing_sellers_detected` (INTEGER): 検出された不足売主の数
- `triggered_by` (VARCHAR(50)): 同期のトリガー元（'auto', 'manual', 'startup', 'scheduled', 'api'）
- `health_status` (VARCHAR(20)): 同期時の健全性状態（'healthy', 'unhealthy', 'unknown'）

## 実行手順

### 1. Supabaseダッシュボードにアクセス

https://fzcuexscuwhoywcicdqq.supabase.co

### 2. SQL Editorを開く

左側のメニューから「SQL Editor」を選択

### 3. SQLを実行

以下のSQLをコピーして、SQL Editorに貼り付けて実行してください：

```sql
-- Migration 053: Add sync metadata columns to sync_logs
-- Purpose: Track additional metadata for sync operations including missing sellers, trigger source, and health status

-- Add missing_sellers_detected column
ALTER TABLE sync_logs 
ADD COLUMN IF NOT EXISTS missing_sellers_detected INTEGER DEFAULT 0;

-- Add triggered_by column
ALTER TABLE sync_logs 
ADD COLUMN IF NOT EXISTS triggered_by VARCHAR(50) CHECK (triggered_by IN ('auto', 'manual', 'startup', 'scheduled', 'api'));

-- Add health_status column
ALTER TABLE sync_logs 
ADD COLUMN IF NOT EXISTS health_status VARCHAR(20) CHECK (health_status IN ('healthy', 'unhealthy', 'unknown'));

-- Create indexes for new columns
CREATE INDEX IF NOT EXISTS idx_sync_logs_triggered_by ON sync_logs(triggered_by);
CREATE INDEX IF NOT EXISTS idx_sync_logs_health_status ON sync_logs(health_status);

-- Add comments
COMMENT ON COLUMN sync_logs.missing_sellers_detected IS 'Number of missing sellers detected during this sync operation';
COMMENT ON COLUMN sync_logs.triggered_by IS 'Source that triggered this sync operation';
COMMENT ON COLUMN sync_logs.health_status IS 'Health status of the sync system at the time of this operation';
```

### 4. 検証

マイグレーションが成功したことを確認するために、以下のクエリを実行してください：

```sql
SELECT column_name, data_type, character_maximum_length
FROM information_schema.columns
WHERE table_name = 'sync_logs'
AND column_name IN ('missing_sellers_detected', 'triggered_by', 'health_status')
ORDER BY column_name;
```

期待される結果：

| column_name | data_type | character_maximum_length |
|-------------|-----------|-------------------------|
| health_status | character varying | 20 |
| missing_sellers_detected | integer | NULL |
| triggered_by | character varying | 50 |

## 影響範囲

このマイグレーションは以下のサービスで使用されます：

- `SyncLogService`: 同期結果をログに記録する際に、これらのカラムに値を設定
- `EnhancedAutoSyncService`: フル同期実行時に、検出された不足売主数とトリガー元を記録
- `FreshnessAutoSyncService`: ErrorHandlerと統合し、エラー発生時の健全性状態を記録
- `ErrorHandler`: エラーログ記録時に、回復可能性を判定

## ロールバック

もしマイグレーションをロールバックする必要がある場合は、以下のSQLを実行してください：

```sql
-- Drop indexes
DROP INDEX IF EXISTS idx_sync_logs_triggered_by;
DROP INDEX IF EXISTS idx_sync_logs_health_status;

-- Drop columns
ALTER TABLE sync_logs DROP COLUMN IF EXISTS missing_sellers_detected;
ALTER TABLE sync_logs DROP COLUMN IF EXISTS triggered_by;
ALTER TABLE sync_logs DROP COLUMN IF EXISTS health_status;
```

## 次のステップ

マイグレーション完了後、以下のタスクに進むことができます：

- タスク3.1: SyncLogService.logSync関数の実装（既に完了）
- タスク3.3: SyncLogService.getHistory関数の実装（既に完了）
- タスク3.4: SyncLogService.getLastSuccessfulSync関数の実装（既に完了）
