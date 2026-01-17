# Migration 079: Enable pg_trgm Extension - 実行ガイド

## 概要

このマイグレーションは、PostgreSQLの`pg_trgm`拡張機能を有効化します。この拡張機能は、部分テキストマッチング（トライグラムベースの類似検索）とGINインデックスをサポートし、住所や物件番号フィールドでの効率的な部分一致検索を可能にします。

## 実行手順

### ステップ1: Supabase Dashboardにアクセス

1. Supabase Dashboard (https://app.supabase.com) にログイン
2. プロジェクトを選択
3. 左サイドバーから「SQL Editor」をクリック

### ステップ2: SQLを実行

1. 「New query」ボタンをクリック
2. 以下のSQLをコピー&ペースト:

```sql
-- Migration: Enable pg_trgm Extension for Partial Text Matching
-- Description: Enables the PostgreSQL pg_trgm extension to support trigram-based
--              similarity searches and GIN indexes for efficient partial text matching
--              on address and property_number fields.
-- Date: 2026-01-03

-- Enable pg_trgm extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_trgm;
```

3. 「Run」ボタンをクリックして実行

### ステップ3: 拡張機能の確認

実行後、以下のSQLで拡張機能が有効化されたことを確認します:

```sql
SELECT * FROM pg_extension WHERE extname = 'pg_trgm';
```

**期待される結果:**

| oid   | extname | extowner | extnamespace | extrelocatable | extversion | extconfig | extcondition |
|-------|---------|----------|--------------|----------------|------------|-----------|--------------|
| xxxxx | pg_trgm | xx       | xxxx         | t              | 1.6        | null      | null         |

拡張機能が表示されれば成功です。

### ステップ4: 次のマイグレーション

拡張機能が有効化されたら、次のマイグレーション080を実行して検索フィルター用のインデックスを作成します:

```bash
npx ts-node migrations/run-080-migration.ts
```

## トラブルシューティング

### エラー: "permission denied to create extension"

**原因:** データベースユーザーに拡張機能を作成する権限がありません。

**解決策:** Supabase Dashboardから実行する場合、このエラーは発生しないはずです。もし発生した場合は、Supabaseサポートに連絡してください。

### エラー: "extension 'pg_trgm' already exists"

**原因:** 拡張機能は既に有効化されています。

**解決策:** これは問題ありません。確認クエリを実行して、拡張機能が有効であることを確認してください。

## 注意事項

- この拡張機能は、PostgreSQL 9.1以降で利用可能です
- Supabaseは標準でpg_trgm拡張機能をサポートしています
- 拡張機能の有効化は、データベース全体に影響します（スキーマ単位ではありません）
- 一度有効化すると、無効化する必要はほとんどありません

## 参考資料

- [PostgreSQL pg_trgm Documentation](https://www.postgresql.org/docs/current/pgtrgm.html)
- [Supabase Extensions](https://supabase.com/docs/guides/database/extensions)
