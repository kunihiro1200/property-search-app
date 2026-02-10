# マイグレーション105実行ガイド

## 概要
`broker_survey`（業者向けアンケート）カラムを`buyers`テーブルに追加します。

## 実行手順

### 1. Supabase SQL Editorを開く
https://supabase.com/dashboard/project/krxhrbtlgfjzsseegaqq/sql/new

### 2. 以下のSQLを実行

```sql
-- Migration: Add broker_survey column to buyers table
-- Description: 業者向けアンケートフィールドを追加
-- Date: 2026-02-10

-- Add broker_survey column
ALTER TABLE buyers
ADD COLUMN IF NOT EXISTS broker_survey TEXT;

-- Add comment
COMMENT ON COLUMN buyers.broker_survey IS '業者向けアンケート';
```

### 3. 実行ボタンをクリック

### 4. 確認

以下のSQLで確認してください：

```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'buyers' 
AND column_name = 'broker_survey';
```

期待される結果：
```
column_name    | data_type
---------------|----------
broker_survey  | text
```

## 完了後

フロントエンドで買主詳細ページを開いて、`broker_survey`フィールドに値がある買主を表示すると、問合せ時ヒアリングの直下に「業者向けアンケート」フィールドが表示されます。

## トラブルシューティング

### エラー: column "broker_survey" of relation "buyers" already exists

すでにカラムが存在しています。確認SQLを実行して、カラムが正しく追加されているか確認してください。

### エラー: permission denied

Supabaseの管理者権限が必要です。プロジェクトのオーナーまたは管理者に実行を依頼してください。
