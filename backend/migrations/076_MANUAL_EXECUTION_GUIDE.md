# Migration 076: hidden_images カラム追加 - 手動実行ガイド

## 問題
直接PostgreSQL接続がDNS解決エラーで失敗しています。

## 解決策: Supabase SQL Editorで手動実行

### 手順

1. **Supabase Dashboardにアクセス**
   - https://supabase.com/dashboard にログイン
   - プロジェクト `fzcuexscuwhoywcicdqq` を選択

2. **SQL Editorを開く**
   - 左メニューから「SQL Editor」をクリック

3. **以下のSQLを実行**

```sql
-- Migration: Add hidden_images column to property_listings table
-- Purpose: Store array of hidden image file IDs for public property display

-- Add hidden_images column
ALTER TABLE property_listings
ADD COLUMN IF NOT EXISTS hidden_images TEXT[] DEFAULT '{}';

-- Add comment for documentation
COMMENT ON COLUMN property_listings.hidden_images IS 'Array of Google Drive file IDs that should be hidden from public display';

-- Create index for efficient querying
CREATE INDEX IF NOT EXISTS idx_property_listings_hidden_images 
ON property_listings USING GIN (hidden_images);
```

4. **「Run」ボタンをクリック**

5. **確認クエリを実行**

```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'property_listings' 
AND column_name = 'hidden_images';
```

結果に `hidden_images` が表示されれば成功です。

6. **バックエンドサーバーを再起動**
   - `backend` フォルダで `npm run dev` を実行

7. **公開物件ページをテスト**
   - 物件番号 364 の詳細ページにアクセス
   - 画像が正常に表示されることを確認
