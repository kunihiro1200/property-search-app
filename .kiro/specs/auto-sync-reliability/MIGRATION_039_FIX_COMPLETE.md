# Migration 039 修正完了

## 概要

Migration 039のSQL構文エラーを修正しました。元のSQLファイルは最後のCREATE INDEX文が途中で切れていたため、実行時にエラーが発生していました。

## 問題の詳細

### 元のエラー
```
ERROR: 42601: syntax error at end of input
LINE 0: ^
```

### 根本原因

元のSQLファイルの最後の行が以下のように不完全でした：

```sql
CREATE INDEX IF NOT
```

この行は`CREATE INDEX IF NOT EXISTS`文の途中で切れており、インデックス名やテーブル名、カラム名が指定されていませんでした。

### 追加の問題

ユーザーの環境では、以前の失敗したマイグレーション実行により`sync_health`テーブルが既に存在していましたが、`is_healthy`カラムが欠落していました。

## 修正内容

### 1. sync_healthテーブルの再作成

既存の不完全なテーブルを削除し、すべてのカラムを含む完全なテーブルを作成：

```sql
-- 既存の不完全なテーブルを削除（CASCADE付き）
DROP TABLE IF EXISTS sync_health CASCADE;

-- 完全なsync_healthテーブルを作成
CREATE TABLE IF NOT EXISTS sync_health (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  last_sync_time TIMESTAMP WITH TIME ZONE,
  last_sync_success BOOLEAN DEFAULT false,
  pending_missing_sellers INTEGER DEFAULT 0,
  consecutive_failures INTEGER DEFAULT 0,
  is_healthy BOOLEAN DEFAULT true,  -- ← この行が追加されました
  sync_interval_minutes INTEGER DEFAULT 5,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 2. 初期レコードの挿入

```sql
INSERT INTO sync_health (is_healthy, sync_interval_minutes, created_at, updated_at)
SELECT true, 5, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM sync_health LIMIT 1);
```

### 3. sync_logsテーブルへのカラム追加

以下の3つのカラムを追加（存在しない場合のみ）：

```sql
DO $$
BEGIN
  -- missing_sellers_detected カラム
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'sync_logs' AND column_name = 'missing_sellers_detected'
  ) THEN
    ALTER TABLE sync_logs ADD COLUMN missing_sellers_detected INTEGER DEFAULT 0;
  END IF;

  -- triggered_by カラム
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'sync_logs' AND column_name = 'triggered_by'
  ) THEN
    ALTER TABLE sync_logs ADD COLUMN triggered_by VARCHAR(20) DEFAULT 'scheduled';
  END IF;

  -- health_status カラム
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'sync_logs' AND column_name = 'health_status'
  ) THEN
    ALTER TABLE sync_logs ADD COLUMN health_status VARCHAR(20) DEFAULT 'healthy';
  END IF;
END $$;
```

### 4. インデックスの作成

2つの完全なインデックスを作成：

```sql
-- 同期ログを時系列で検索するためのインデックス
CREATE INDEX IF NOT EXISTS idx_sync_logs_started_at_desc ON sync_logs(started_at DESC);

-- ステータスでフィルタリングするためのインデックス
CREATE INDEX IF NOT EXISTS idx_sync_logs_health_status ON sync_logs(health_status);
```

## 実行方法

### Supabaseダッシュボード経由（推奨）

1. Supabaseダッシュボードにログイン
2. プロジェクトを選択
3. 左サイドバーから「SQL Editor」を選択
4. 「New query」をクリック
5. 修正済みの`backend/migrations/039_add_sync_health.sql`の内容をコピー＆ペースト
6. 「Run」ボタンをクリック

### 実行結果の確認

以下のクエリで確認できます：

```sql
-- sync_healthテーブルの確認
SELECT * FROM sync_health;

-- sync_logsテーブルの新しいカラムを確認
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'sync_logs' 
  AND column_name IN ('missing_sellers_detected', 'triggered_by', 'health_status');

-- インデックスの確認
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'sync_logs' 
  AND indexname LIKE 'idx_sync_logs%';
```

## 期待される結果

### sync_healthテーブル

| カラム名 | データ型 | デフォルト値 |
|---------|---------|------------|
| id | UUID | gen_random_uuid() |
| last_sync_time | TIMESTAMP WITH TIME ZONE | NULL |
| last_sync_success | BOOLEAN | false |
| pending_missing_sellers | INTEGER | 0 |
| consecutive_failures | INTEGER | 0 |
| is_healthy | BOOLEAN | true |
| sync_interval_minutes | INTEGER | 5 |
| created_at | TIMESTAMP WITH TIME ZONE | NOW() |
| updated_at | TIMESTAMP WITH TIME ZONE | NOW() |

初期レコードが1件挿入されます。

### sync_logsテーブル

以下の3つのカラムが追加されます：
- `missing_sellers_detected` (INTEGER, DEFAULT 0)
- `triggered_by` (VARCHAR(20), DEFAULT 'scheduled')
- `health_status` (VARCHAR(20), DEFAULT 'healthy')

### インデックス

以下の2つのインデックスが作成されます：
- `idx_sync_logs_started_at_desc` - started_atカラムの降順インデックス
- `idx_sync_logs_health_status` - health_statusカラムのインデックス

## トラブルシューティング

### sync_logsテーブルが存在しない場合

エラーメッセージ：
```
ERROR: relation "sync_logs" does not exist
```

対処法：
1. 先にsync_logsテーブルを作成するマイグレーション（Migration 068または069）を実行してください
2. その後、Migration 039を再実行してください

### 権限エラーが発生する場合

エラーメッセージ：
```
ERROR: permission denied for table sync_health
```

対処法：
1. Supabaseダッシュボードの「SQL Editor」から実行していることを確認してください
2. プロジェクトの管理者権限があることを確認してください

## 関連ドキュメント

- [要件定義](.kiro/specs/auto-sync-reliability/requirements.md)
- [設計ドキュメント](.kiro/specs/auto-sync-reliability/design.md)
- [実装状況](.kiro/specs/auto-sync-reliability/IMPLEMENTATION_STATUS.md)
- [Migration 053ガイド](.kiro/specs/auto-sync-reliability/MIGRATION_053_GUIDE.md)

## 次のステップ

1. ✅ Migration 039を実行（このドキュメントの手順に従って実行）
2. ⏭️ Migration 053を実行（sync_logsテーブルへの追加カラム - オプション）
3. ⏭️ 自動同期機能のテスト
4. ⏭️ APIエンドポイントの動作確認

## 変更履歴

- 2026-01-07: Migration 039のSQL構文エラーを修正、完全なCREATE INDEX文を追加
