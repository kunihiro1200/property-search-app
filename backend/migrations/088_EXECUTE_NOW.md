# ⚠️ マイグレーション088を今すぐ実行してください

## 実行手順

1. **Supabase SQL Editorを開く**
   - Supabaseダッシュボードにログイン
   - 左サイドバーから「SQL Editor」を選択

2. **以下のSQLをコピーして実行**

```sql
-- Migration 088: Remove confidence column from sellers table
ALTER TABLE sellers DROP COLUMN IF EXISTS confidence;

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
```

3. **実行結果を確認**
   - `Success. No rows returned` が表示されることを確認

4. **検証SQLを実行**

```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'sellers' 
AND column_name = 'confidence';
```

   - **期待される結果**: 0行（confidenceカラムが存在しない）

## 完了後

マイグレーション実行後、以下を確認してください：

1. ✅ confidenceカラムが削除されている
2. ✅ PostgRESTスキーマキャッシュがリロードされている
3. ✅ バックエンドコードから`confidence`参照が削除されている
4. ✅ フロントエンドコードから`confidence`参照が削除されている

## 次のステップ

マイグレーション実行後：
1. バックエンドサーバーを再起動
2. フロントエンドを再起動
3. 売主関連のAPIエンドポイントをテスト
4. エラーが発生しないことを確認
