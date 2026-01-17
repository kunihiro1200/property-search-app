# マイグレーション086 手動実行ガイド

## 概要

このマイグレーションは、`property_inquiries`テーブルに買主リストへの同期ステータス管理用のカラムを追加します。

## 実行手順

### 1. Supabaseダッシュボードにアクセス

1. https://supabase.com/dashboard にアクセス
2. プロジェクト `fzcuexscuwhoywcicdqq` を選択
3. 左側のメニューから「SQL Editor」を選択

### 2. SQLを実行

以下のSQLをコピーして、SQL Editorに貼り付けて実行してください:

```sql
-- Add sync status columns to property_inquiries table for buyer sheet synchronization
-- Migration 086: Add inquiry sync columns

-- Add sync status columns
ALTER TABLE property_inquiries
ADD COLUMN IF NOT EXISTS sheet_sync_status VARCHAR(20) DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS sheet_sync_error_message TEXT,
ADD COLUMN IF NOT EXISTS sheet_row_number INTEGER,
ADD COLUMN IF NOT EXISTS sheet_synced_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS sync_retry_count INTEGER DEFAULT 0;

-- Add index for efficient querying of pending inquiries
CREATE INDEX IF NOT EXISTS idx_property_inquiries_sync_status 
ON property_inquiries(sheet_sync_status, created_at);

-- Add comments for documentation
COMMENT ON COLUMN property_inquiries.sheet_sync_status IS '買主リストへの同期ステータス（pending, synced, failed）';
COMMENT ON COLUMN property_inquiries.sheet_sync_error_message IS '同期エラーメッセージ';
COMMENT ON COLUMN property_inquiries.sheet_row_number IS '買主リストの転記先行番号';
COMMENT ON COLUMN property_inquiries.sheet_synced_at IS '買主リストへの転記完了日時';
COMMENT ON COLUMN property_inquiries.sync_retry_count IS '同期再試行回数';
```

### 3. 実行結果の確認

SQLが正常に実行されたら、以下のSQLで確認してください:

```sql
-- カラムの確認
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'property_inquiries'
AND column_name IN (
  'sheet_sync_status',
  'sheet_sync_error_message',
  'sheet_row_number',
  'sheet_synced_at',
  'sync_retry_count'
)
ORDER BY column_name;

-- インデックスの確認
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'property_inquiries'
AND indexname = 'idx_property_inquiries_sync_status';
```

### 4. 期待される結果

#### カラム

以下の5つのカラムが表示されるはずです:

| column_name | data_type | column_default |
|------------|-----------|----------------|
| sheet_row_number | integer | NULL |
| sheet_sync_error_message | text | NULL |
| sheet_sync_status | character varying | 'pending'::character varying |
| sheet_synced_at | timestamp with time zone | NULL |
| sync_retry_count | integer | 0 |

#### インデックス

以下のインデックスが表示されるはずです:

| indexname | indexdef |
|-----------|----------|
| idx_property_inquiries_sync_status | CREATE INDEX idx_property_inquiries_sync_status ON public.property_inquiries USING btree (sheet_sync_status, created_at) |

## トラブルシューティング

### エラー: column "sheet_sync_status" of relation "property_inquiries" already exists

このエラーが発生した場合、カラムは既に存在しています。`IF NOT EXISTS`句を使用しているため、通常は発生しませんが、もし発生した場合は無視して構いません。

### エラー: relation "idx_property_inquiries_sync_status" already exists

このエラーが発生した場合、インデックスは既に存在しています。`IF NOT EXISTS`句を使用しているため、通常は発生しませんが、もし発生した場合は無視して構いません。

## 完了確認

マイグレーションが正常に完了したら、以下を確認してください:

1. ✅ 5つの新しいカラムが追加されている
2. ✅ インデックスが作成されている
3. ✅ エラーが発生していない

すべて確認できたら、マイグレーション086は完了です！
