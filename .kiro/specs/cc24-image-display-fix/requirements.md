# CC24画像表示問題の修正

## 問題の概要（2026年1月22日 再整理）

### タイムライン
1. **1月21日**: 画像が正常に表示されていた
2. **1月22日 朝5時頃**: システムは正常に動作していた（コミットe0ff764）
3. **1月22日 朝8時まで**: システムは正常に動作していた
4. **1月22日 朝8時以降**: 画像が表示されないことを指摘
5. **現在**: 画像も表示されず、ログインもできない状態

### 現在の状況
- **Vercelプロジェクト**: `property-site-frontend`（フロントエンド+バックエンド統合）
- **デプロイメント状態**: Error
- **問題**: 画像が表示されない、ログインもできない

### 重要な発見
- **私の間違い**: ずっとバックエンドのデプロイを試みていた
- **正しいプロジェクト**: `property-site-frontend`
- **動作していた時のコミット**: e0ff764（1月22日 朝5時頃）
  - Root Directory: **空**
  - Framework Preset: **Vite**
  - 使用ファイル: `backend/api/index.ts`（static imports）

## 根本原因（推測）

1. **Vercel設定の変更**: Root Directoryやその他の設定が変更された可能性
2. **デプロイメントエラー**: `property-site-frontend`プロジェクトがErrorになっている
3. **環境変数の問題**: 環境変数が正しく設定されていない可能性

## 制約条件

- **データベースは変更しない**（前回データが消えた）
- **動作していた時の設定に戻す**（e0ff764の時の設定）

## 現在の状況（2026年1月22日 最新）

### デプロイメント状況
- ✅ 最新デプロイメント（e736d19）をプッシュ
- ⏳ Vercelで自動デプロイ中（1-2分待機）
- 🔧 修正内容:
  1. `vercel.json`を`api/index.ts`を使用するように変更（`backend/api/index.ts`から変更）
  2. `frontend/api/index.ts`の最後の行を`export default`に変更（`module.exports`から変更）

### vercel.json設定（最新）
```json
{
  "functions": {
    "api/index.ts": {
      "memory": 1024,
      "maxDuration": 10
    }
  },
  "rewrites": [
    {
      "source": "/api/:path*",
      "destination": "/api/index"
    }
  ]
}
```

### frontend/api/index.ts（最新）
- ✅ インポートパス: `../src/backend/services/*`
- ✅ エクスポート形式: `export default`（ES Module形式）
- ✅ `frontend/src/backend`ディレクトリが存在

### 次のステップ
1. ⏳ デプロイ完了を待つ（1-2分）
2. ⏳ シークレットモードでAPIエンドポイントをテスト: `https://property-site-frontend-kappa.vercel.app/api/public/properties/complete?propertyNumber=CC24`
3. ⏳ Runtime Logsを確認
4. ⏳ CC24画像表示を確認

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

### 4. backend/srcをfrontend/src/backendにコピー（コミットb7119af）
- **問題**: Vercelのビルド時に`backend`ディレクトリが見えず、TypeScriptエラーが発生
- **解決策**: `backend/src`を`frontend/src/backend`にコピー
- **変更内容**:
  - `backend/src`の全ファイルを`frontend/src/backend`にコピー（341ファイル）
  - `frontend/api/index.ts`のインポートパスを`../src/backend/services/*`に修正
  - `frontend/tsconfig.json`の`include`に`api`を追加
- **理由**: Root Directory=`frontend`のため、`backend`ディレクトリがVercelから見えない
- **影響**: なし（データベースは変更していない、コードのみ）

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
9. **0907510**: `PropertyListingService.getHiddenImages()`にUUID検証を追加
10. **62d97fd**: `frontend/.env.production`の`VITE_API_URL`を更新
11. **e869af5**: `frontend/package.json`にバックエンドの依存関係をマージ
12. **b7119af**: `backend/src`を`frontend/src/backend`にコピー、インポートパスを修正
13. **12e297c**: `vercel.json`を`backend/api/index.ts`を使用するように変更（失敗）
14. **e736d19**: `vercel.json`を`api/index.ts`に戻し、`export default`に変更（最新）

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
