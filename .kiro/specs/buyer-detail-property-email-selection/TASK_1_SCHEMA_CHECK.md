# Task 1: マイグレーション実行ガイド

## ✅ 修正完了

マイグレーションファイル `backend/migrations/056_add_email_history.sql` の修正が完了しました。

### 修正内容

1. ✅ `buyer_id`カラムのデータ型を`INTEGER`→`TEXT`に変更
2. ✅ 外部キー制約を`REFERENCES buyers(id)`に修正
3. ✅ `property_listing_id`→`property_id`にカラム名を変更
4. ✅ `property_id`カラムのデータ型を`UUID`に変更
5. ✅ 外部キー制約を`REFERENCES properties(id)`に修正
6. ✅ インデックス名を`idx_email_history_property_id`に修正
7. ✅ コメントのカラム名を`property_id`に修正

## 📋 実行手順

### ステップ1: SQLファイルの内容をコピー

`backend/migrations/056_add_email_history.sql` ファイルの全内容をコピーしてください。

### ステップ2: Supabase SQL Editorで実行

1. Supabase Dashboardにログイン
2. 左メニューから「SQL Editor」を選択
3. コピーしたSQLをペースト
4. 「Run」ボタンをクリック

### ステップ3: 実行結果の確認

**成功の場合**:
- "Success. No rows returned" というメッセージが表示されます
- これは正常です（テーブル作成なので行は返されません）

**エラーの場合**:
- エラーメッセージをコピーして教えてください
- 一緒に原因を調査します

### ステップ4: テーブル作成の確認

実行成功後、以下のSQLで確認できます:

```sql
-- テーブルが作成されたか確認
SELECT table_name 
FROM information_schema.tables 
WHERE table_name = 'email_history';

-- カラム構造を確認
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'email_history'
ORDER BY ordinal_position;
```

## 📊 確認済みスキーマ情報

### buyersテーブル
- 主キー: `id` (TEXT型)

### propertiesテーブル
- 主キー: `id` (UUID型)

### email_historyテーブル（作成予定）
- 主キー: `id` (SERIAL)
- 外部キー: `buyer_id` (TEXT) → `buyers(id)`
- 外部キー: `property_id` (UUID) → `properties(id)`

## 🎯 次のステップ

マイグレーション実行成功後:
1. Task 2: 問い合わせ履歴API実装に進みます
2. `tasks.md`のTask 1にチェックマークを付けます
