# Migration 103: Remove buyer_id from primary key and make it nullable

## 理由

- `buyer_id`はアプリケーションで使用されていない
- 主キーは`buyer_number`であるべき
- `buyer_id`がNULLでも問題ない

## 実行方法

Supabase SQL Editorで以下のSQLを実行してください：

```sql
-- Step 1: Drop the existing primary key constraint
ALTER TABLE buyers DROP CONSTRAINT IF EXISTS buyers_pkey;

-- Step 2: Add buyer_number as the new primary key
ALTER TABLE buyers ADD PRIMARY KEY (buyer_number);

-- Step 3: Remove NOT NULL constraint from buyer_id (now that it's not in the primary key)
ALTER TABLE buyers ALTER COLUMN buyer_id DROP NOT NULL;

-- Step 4: Add comment to clarify that buyer_id is not used
COMMENT ON COLUMN buyers.buyer_id IS 'Legacy UUID column - not used in application. Primary key is buyer_number.';
```

## 確認方法

```sql
-- 主キーを確認
SELECT constraint_name, constraint_type
FROM information_schema.table_constraints
WHERE table_name = 'buyers' AND constraint_type = 'PRIMARY KEY';

-- buyer_idカラムの情報を確認
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'buyers' AND column_name IN ('buyer_id', 'buyer_number');
```

期待される結果：
- 主キーは`buyer_number`のみ
- `buyer_id`の`is_nullable`が`YES`

## 影響

- 既存のデータには影響なし
- 今後の自動同期で`buyer_id`がNULLのまま挿入できるようになる
- アプリケーションコードの変更は不要（`buyer_id`は使用していないため）

## 注意事項

- この変更により、`buyer_id`を使用している既存のクエリがある場合は影響を受ける可能性があります
- しかし、アプリケーションコードでは`buyer_number`のみを使用しているため、問題ありません
