# Migration 058: 買主関連検索用インデックス追加

## 概要
買主の関連検索（電話番号・メールアドレスによる検索）のパフォーマンスを向上させるためのインデックスを追加します。

## 実行方法

### Supabaseダッシュボードから実行

1. Supabaseダッシュボードにログイン
2. プロジェクトを選択
3. 左メニューから「SQL Editor」を選択
4. 新しいクエリを作成
5. 以下のSQLを貼り付けて実行

```sql
-- Add index on phone_number for related buyer search
CREATE INDEX IF NOT EXISTS idx_buyers_phone_number 
ON buyers(phone_number) 
WHERE phone_number IS NOT NULL;

-- Add index on email for related buyer search
CREATE INDEX IF NOT EXISTS idx_buyers_email 
ON buyers(email) 
WHERE email IS NOT NULL;

-- Add comment to explain the purpose
COMMENT ON INDEX idx_buyers_phone_number IS 'Index for efficient related buyer detection by phone number';
COMMENT ON INDEX idx_buyers_email IS 'Index for efficient related buyer detection by email address';
```

## 確認方法

インデックスが正しく作成されたことを確認するには、以下のクエリを実行します：

```sql
SELECT 
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'buyers'
  AND indexname IN ('idx_buyers_phone_number', 'idx_buyers_email');
```

## 期待される結果

2つのインデックスが表示されるはずです：
- `idx_buyers_phone_number`
- `idx_buyers_email`

## パフォーマンスへの影響

これらのインデックスにより、関連買主検索のクエリパフォーマンスが大幅に向上します：
- 電話番号による検索: O(n) → O(log n)
- メールアドレスによる検索: O(n) → O(log n)

## ロールバック

インデックスを削除する場合は、以下のSQLを実行します：

```sql
DROP INDEX IF EXISTS idx_buyers_phone_number;
DROP INDEX IF EXISTS idx_buyers_email;
```
