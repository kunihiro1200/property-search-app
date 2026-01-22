# 物件画像非表示機能 - 要件定義

## 概要
公開物件サイトで画像の非表示/復元機能が動作しない問題の修正

## 現在の状況

### 問題
- ユーザーが画像の非表示ボタンをクリックしても画像が非表示にならない
- ブラウザコンソールに500エラーが表示される
- エンドポイント: `localhost:3000/api/property-listings/[id]/hide-image`

### 原因分析
1. **エンドポイントミスマッチ（修正済み）**
   - フロントエンド: `/restore-image` を呼び出していた
   - バックエンド: `/unhide-image` を実装していた
   - ✅ `frontend/src/services/api.ts` で修正完了

2. **データベーススキーマ**
   - Migration 077 が実行され、`hidden_images` カラムが追加された
   - カラムタイプ: `TEXT[]` (配列)
   - デフォルト値: `ARRAY[]::TEXT[]`

3. **バックエンド実装**
   - `PropertyListingService.ts` に `hideImage()` と `unhideImage()` メソッドが実装済み
   - Supabase を使用して配列の更新を行う

### 修正内容

#### ✅ 完了した修正
1. **フロントエンドAPIエンドポイント修正**
   - ファイル: `frontend/src/services/api.ts`
   - 変更: `restore-image` → `unhide-image`

#### 🔍 確認が必要な項目
1. **Migration 077 の実行確認**
   - `hidden_images` カラムが正しく追加されているか
   - インデックスが作成されているか
   - 権限が正しく設定されているか

2. **PostgREST スキーマキャッシュ**
   - スキーマキャッシュが更新されているか
   - 必要に応じて Supabase プロジェクトの再起動

3. **エンドツーエンドテスト**
   - 画像の非表示機能が動作するか
   - 画像の復元機能が動作するか
   - エラーハンドリングが適切か

## 技術仕様

### データベーススキーマ
```sql
-- property_listings テーブル
ALTER TABLE property_listings 
ADD COLUMN hidden_images TEXT[] DEFAULT ARRAY[]::TEXT[];

-- インデックス
CREATE INDEX idx_property_listings_hidden_images 
ON property_listings USING GIN (hidden_images);
```

### API エンドポイント

#### 画像を非表示にする
```
POST /api/property-listings/:id/hide-image
Body: { fileId: string }
Response: { success: true, message: string }
```

#### 画像を復元する
```
POST /api/property-listings/:id/unhide-image
Body: { fileId: string }
Response: { success: true, message: string }
```

#### 非表示画像リストを取得
```
GET /api/property-listings/:id/hidden-images
Response: { hiddenImages: string[], count: number }
```

### サービスメソッド

#### PropertyListingService
- `getHiddenImages(propertyId: string): Promise<string[]>`
- `hideImage(propertyId: string, fileId: string): Promise<void>`
- `unhideImage(propertyId: string, fileId: string): Promise<void>`
- `getVisibleImages(propertyId: string): Promise<Image[]>`

## 次のステップ

### 1. データベース確認
Supabase ダッシュボードで以下のクエリを実行:
```sql
-- カラムの存在確認
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'property_listings'
  AND column_name = 'hidden_images';

-- インデックスの確認
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'property_listings'
  AND indexname = 'idx_property_listings_hidden_images';
```

### 2. 権限確認
```sql
-- テーブル権限の確認
SELECT grantee, privilege_type
FROM information_schema.table_privileges
WHERE table_schema = 'public'
  AND table_name = 'property_listings';
```

### 3. スキーマキャッシュのリロード
必要に応じて:
```sql
NOTIFY pgrst, 'reload schema';
```

または Supabase プロジェクトを再起動

### 4. 機能テスト
1. ブラウザで `localhost:5173/public/properties/[id]` にアクセス
2. 画像の非表示ボタンをクリック
3. ブラウザコンソールでエラーがないことを確認
4. 画像が非表示になることを確認
5. 復元ボタンをクリック
6. 画像が再表示されることを確認

## 成功基準
- [ ] 画像の非表示ボタンをクリックすると画像が非表示になる
- [ ] 画像の復元ボタンをクリックすると画像が再表示される
- [ ] ブラウザコンソールにエラーが表示されない
- [ ] 非表示画像のカウントが正しく表示される
- [ ] ページをリロードしても非表示状態が保持される

## 関連ファイル
- `frontend/src/services/api.ts` - API クライアント（修正済み）
- `frontend/src/components/PropertyImageGallery.tsx` - 画像ギャラリーコンポーネント
- `backend/src/routes/propertyListings.ts` - API ルート
- `backend/src/services/PropertyListingService.ts` - サービス実装
- `backend/migrations/077_add_hidden_images_to_property_listings.sql` - マイグレーション
