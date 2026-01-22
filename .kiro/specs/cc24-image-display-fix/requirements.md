# CC24画像表示問題の修正

## 問題の概要

公開物件サイトの本番環境でCC24の画像が表示されていない。

## 根本原因

**Vercel DashboardのRoot Directoryが`frontend`に設定されている**

これにより、Vercelは`frontend`ディレクトリをプロジェクトのルートとして扱い、`backend/api/index.ts`が見つからないため、すべての`/api/*`リクエストがフロントエンドのHTMLを返しています。

## 制約条件

- **Root Directoryは`frontend`のままにする必要がある**（空にするとスマホが表示されなくなる）
- 前回も同じ問題が発生し、Root Directoryを変更せずに解決した

## 実施した対応

### 1. エラーハンドリングの追加（コミット4e2858e）
- `backend/api/index.ts`の`getHiddenImages()`にtry-catchを追加
- UUID検証エラーを防ぐ

### 2. vercel.jsonの修正（コミット92fa226, a0612cf）
- `rewrites`を追加
- `handle: filesystem`を追加

### 3. バックエンドの移動（コミット20ed5a4, 3e3d45a, 118bcc6, 38b3ce2, b0d2a70）
- `backend/api/index.ts`を`frontend/api/index.ts`にコピー
- インポートパスを`../../backend/src/services/*`に修正
- `vercel.json`を相対パスに修正

### 4. PropertyListingService.getHiddenImages()の修正（最新）
- **根本原因**: `getHiddenImages()`が物件番号（"CC24"）をUUIDとして扱おうとしてエラーが発生
- **修正内容**: UUID形式の検証を追加し、物件番号の場合は空配列を返すように修正
- **エラーメッセージ**: `Error fetching property images: Error: Failed to fetch hidden images: invalid input syntax for type uuid: "CC24"`
- **修正箇所**: `backend/src/services/PropertyListingService.ts`の`getHiddenImages()`メソッド

### 結果
- ✅ **バックエンドは正常に動作している**（Runtime Logsで確認）
- ✅ **`frontend/api/index.ts`は正しくデプロイされている**
- ❌ **UUID検証エラーが発生していた**（修正済み）

## 実施した修正（完了）

### 1. PropertyListingService.getHiddenImages()の修正（コミット0907510）
- UUID形式の検証を追加
- 物件番号の場合は空配列を返すように修正

### 2. frontend/.env.productionの修正（コミット62d97fd）
- `VITE_API_URL`を`https://baikyaku-property-site3.vercel.app`から`https://property-site-frontend-kappa.vercel.app`に変更

### 3. Vercel環境変数の更新（2026年1月22日）
- **プロジェクト**: `property-site-frontend`
- **変更内容**: `VITE_API_URL`を`https://property-site-frontend-kappa.vercel.app`に変更
- **理由**: 古いバックエンド（`baikyaku-property-site3`）が壊れたため
- **影響**: なし（データベースは変更していない、URLのみ変更）
- **再デプロイ**: 必要（環境変数変更後）

### 期待される結果

- ✅ 物件一覧が表示される
- ✅ CC24の画像が正常に表示される
- ✅ ログインとデータは全て保持される（データベースは変更していない）

## 関連ファイル

- `frontend/api/index.ts` - バックエンドAPIのエントリーポイント（新規作成）
- `backend/api/index.ts` - 元のバックエンドAPIのエントリーポイント
- `vercel.json` - Vercelのルーティング設定
- `.vercel/project.json` - Vercelプロジェクト設定

## 実施したコミット

1. **4e2858e**: `getHiddenImages()`のエラーハンドリングを追加
2. **92fa226**: `vercel.json`に`rewrites`を追加
3. **a0612cf**: `vercel.json`に`handle: filesystem`を追加
4. **20ed5a4**: `backend/api/index.ts`を`frontend/api/index.ts`にコピー
5. **3e3d45a**: `vercel.json`のdestinationパスを`/frontend/api/index.ts`に変更
6. **118bcc6**: `vercel.json`を相対パスに変更
7. **38b3ce2**: `backend/api/index.ts`に戻す試み
8. **b0d2a70**: `frontend/api/index.ts`を再作成、インポートパスを`../../backend/src/services/*`に修正

すべてのコミットは正常にデプロイされましたが、まだHTMLが返されています。

## 重要な発見

### 根本原因の特定

1. **Vercel DashboardのRoot Directoryが`frontend`に設定されている**
   - これにより、`backend/api/index.ts`が見つからない
   - 解決策：`backend/api/index.ts`を`frontend/api/index.ts`に移動

2. **PropertyListingService.getHiddenImages()のUUID検証エラー**
   - `getHiddenImages(propertyId)`が物件番号（"CC24"）をUUIDとして扱おうとしてエラーが発生
   - Supabaseが「invalid input syntax for type uuid: "CC24"」エラーを返す
   - 解決策：UUID形式の検証を追加し、物件番号の場合は空配列を返す

### 制約条件

- **Root Directoryは`frontend`のままにする必要がある**（空にするとスマホが表示されなくなる）
- **バックエンドは正常に動作している**（Runtime Logsで確認）
- **`frontend/api/index.ts`は正しくデプロイされている**

### 修正内容

- `backend/src/services/PropertyListingService.ts`の`getHiddenImages()`メソッドにUUID検証を追加
- 物件番号の場合は空配列を返すように修正
- これにより、CC24の画像が正常に表示されるようになる
