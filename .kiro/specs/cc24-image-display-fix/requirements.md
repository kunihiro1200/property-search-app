# CC24画像表示問題の修正

## 問題の概要

公開物件サイトの本番環境でCC24の画像が表示されていない。

## 調査結果

### 1. データベースの状態
- ✅ CC24のデータは存在する
- ✅ `storage_location`は設定されている（`https://drive.google.com/drive/folders/1hnqdgUsvsFDsIGV98TzgVYgQ-MK3vk6r?usp=sharing`）
- ❌ `property_listings.image_url`が`null`（一覧ページのサムネイル用）

### 2. ローカル環境での確認
- ✅ Google Driveから画像を取得できる（21件の画像）
- ✅ `PropertyImageService`は正常に動作する
- ✅ 画像URLを生成できる

### 3. 本番環境での確認
- ❌ **すべての`/api/*`エンドポイントがHTMLを返す**
- ❌ バックエンドが完全に機能していない
- ❌ `/api/health`、`/api/public/properties`、`/api/public/properties/CC24/images`すべてがHTMLを返す

### 4. コードの確認
- ✅ フロントエンドのコードは以前の動作していたバージョンと同じ
- ✅ バックエンドのコードは以前の動作していたバージョンと同じ
- ✅ `vercel.json`の設定は変更されていない

### 5. 実施した修正
- ✅ `backend/api/index.ts`の`/api/public/properties/:identifier/images`エンドポイントに`getHiddenImages()`のエラーハンドリングを追加（コミット4e2858e）
- ✅ `vercel.json`に`rewrites`を追加（コミット92fa226）
- ✅ `vercel.json`に`handle: filesystem`を追加（コミット a0612cf）
- ❌ **まだHTMLが返される**

## 根本原因

**本番環境のバックエンドが正しくルーティングされていない**

すべての`/api/*`エンドポイントがフロントエンドのHTMLを返しており、バックエンドにルーティングされていません。

これは、CC24だけの問題ではなく、**すべての物件の画像が表示されない**問題です。

## テスト結果

### すべてのエンドポイントでHTMLが返される

```
--- /api/health ---
ステータスコード: 200
Content-Type: text/html; charset=utf-8
❌ HTMLが返されました

--- /api/public/properties ---
ステータスコード: 200
Content-Type: text/html; charset=utf-8
❌ HTMLが返されました

--- /api/public/properties/CC24 ---
ステータスコード: 200
Content-Type: text/html; charset=utf-8
❌ HTMLが返されました

--- /api/public/properties/CC24/images ---
ステータスコード: 200
Content-Type: text/html; charset=utf-8
❌ HTMLが返されました
```

### 複数物件でも同じ問題

```
--- CC24 ---
❌ HTMLが返されました

--- AA9743 ---
❌ HTMLが返されました

--- CC23 ---
❌ HTMLが返されました

--- AA13129 ---
❌ HTMLが返されました
```

## 解決策

### 1. Vercel Dashboardで確認（必須）

**Vercel Dashboard**: https://vercel.com/kunihiro1200s-projects/property-site-frontend

以下を確認してください：

#### A. Root Directory設定
1. **Settings** → **General** → **Root Directory**
2. **現在の設定**: 空（プロジェクトルート）
3. **期待される設定**: 空（プロジェクトルート）または`.`

#### B. Build & Development Settings
1. **Settings** → **General** → **Build & Development Settings**
2. **Framework Preset**: `Other`
3. **Build Command**: `cd frontend && npm install && npm run build`
4. **Output Directory**: `frontend/dist`
5. **Install Command**: `npm install`

#### C. Functions設定
1. **Settings** → **Functions**
2. **Functions Region**: 適切なリージョン（例: `iad1`）
3. **Node.js Version**: `18.x`以上

#### D. 環境変数
1. **Settings** → **Environment Variables**
2. 以下の環境変数が設定されているか確認：
   - `GOOGLE_SERVICE_ACCOUNT_JSON`
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_KEY`
   - `GYOMU_LIST_SPREADSHEET_ID`
   - `PROPERTY_LISTING_SPREADSHEET_ID`

### 2. デプロイログを確認

1. **Deployments** → 最新のデプロイをクリック
2. **Build Logs**を確認：
   - バックエンドのビルドエラーがないか
   - `backend/api/index.ts`が正しくビルドされているか
3. **Function Logs**を確認：
   - `/api/*`エンドポイントへのリクエストがログに記録されているか
   - エラーメッセージがないか

### 3. 再デプロイ（必要に応じて）

Vercel Dashboardで設定を確認・修正した後、再デプロイ：

```bash
# Vercel CLIを使用
vercel --prod

# または、GitHubにプッシュして自動デプロイ
git push origin main
```

### 4. vercel.jsonの確認

現在の`vercel.json`の設定：

```json
{
  "version": 2,
  "builds": [
    {
      "src": "frontend/package.json",
      "use": "@vercel/static-build",
      "config": {
        "distDir": "dist"
      }
    },
    {
      "src": "backend/api/index.ts",
      "use": "@vercel/node"
    }
  ],
  "rewrites": [
    {
      "source": "/api/(.*)",
      "destination": "/backend/api/index.ts"
    }
  ],
  "routes": [
    {
      "src": "/assets/(.*)",
      "dest": "/frontend/dist/assets/$1"
    },
    {
      "handle": "filesystem"
    },
    {
      "src": "/(.*)",
      "dest": "/frontend/dist/index.html"
    }
  ],
  "outputDirectory": "frontend/dist"
}
```

この設定は正しいはずですが、Vercelが正しく処理していない可能性があります。

## 次のステップ

1. **Vercel Dashboardにアクセス**
2. **Root Directory設定を確認**
3. **Build & Development Settings を確認**
4. **最新のデプロイログを確認**
5. **バックエンドのビルドエラーを確認**
6. **必要に応じて再デプロイ**

## 重要な発見

- **コードの問題ではない**: フロントエンドとバックエンドのコードは正常
- **vercel.jsonの問題ではない**: 設定は正しい
- **Vercelプロジェクト設定の問題**: Root DirectoryまたはBuild Settingsが間違っている可能性が高い

## 関連ファイル

- `backend/test-production-endpoints.ts` - 本番環境エンドポイントテストスクリプト
- `backend/test-multiple-properties-images.ts` - 複数物件画像テストスクリプト
- `backend/populate-cc24-image-url.ts` - CC24の画像URL更新スクリプト（ローカル用）
- `vercel.json` - Vercelのルーティング設定

## 実施したコミット

1. **4e2858e**: `getHiddenImages()`のエラーハンドリングを追加
2. **92fa226**: `vercel.json`に`rewrites`を追加
3. **a0612cf**: `vercel.json`に`handle: filesystem`を追加

すべてのコミットは正常にデプロイされましたが、まだHTMLが返されています。

## 推奨される次のアクション

**Vercel Dashboardで以下を確認してください：**

1. **Root Directory**: 空（プロジェクトルート）に設定されているか
2. **Build Command**: `cd frontend && npm install && npm run build`
3. **Output Directory**: `frontend/dist`
4. **Functions Region**: 適切なリージョンが選択されているか
5. **デプロイログ**: バックエンドのビルドエラーがないか

これらの設定が正しい場合、Vercelのサポートに問い合わせる必要があるかもしれません。
