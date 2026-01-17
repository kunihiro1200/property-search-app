# マイグレーション077の手動実行が必要

## 問題
AA13129の画像が表示されない問題の根本原因は、`hidden_images`カラムが存在しないことです。

## 解決方法

### 1. Supabaseダッシュボードにアクセス
https://supabase.com/dashboard/project/fzcuexscuwhoywcicdqq

### 2. SQL Editorを開く
左側のメニューから「SQL Editor」を選択

### 3. 以下のSQLを実行

```sql
-- hidden_imagesカラムを追加
ALTER TABLE property_listings
ADD COLUMN IF NOT EXISTS hidden_images TEXT[] DEFAULT '{}';

-- コメントを追加
COMMENT ON COLUMN property_listings.hidden_images IS '非表示にした画像のファイルIDリスト';

-- インデックスを追加（配列検索用）
CREATE INDEX IF NOT EXISTS idx_property_listings_hidden_images
ON property_listings USING GIN (hidden_images);
```

### 4. 実行後、バックエンドを再起動
バックエンドは既に起動しているので、再起動は不要です。

### 5. テスト
ブラウザで以下のURLにアクセスして画像が表示されることを確認：
http://localhost:5173/public/properties/593c43f9-8e10-4eea-8209-6484911f3364

## 確認方法
以下のコマンドでカラムが追加されたか確認できます：

```bash
cd backend
npx ts-node migrations/run-077-migration.ts
```

✅が表示されれば成功です。
