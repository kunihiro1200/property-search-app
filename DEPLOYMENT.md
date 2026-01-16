# デプロイメントガイド

## 概要

このドキュメントは、公開物件サイトをVercelにデプロイする手順を説明します。

## 前提条件

- Node.js 18以上がインストールされていること
- Vercel CLIがインストールされていること（`npm install -g vercel`）
- Vercelアカウントを持っていること
- 必要な環境変数の値を取得していること

## 環境変数の設定

### 1. バックエンド環境変数

以下の環境変数をVercel Dashboardで設定してください：

#### 必須の環境変数

```bash
# Database
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
DATABASE_URL=your_postgresql_connection_string

# Google Sheets API
GOOGLE_SHEETS_SPREADSHEET_ID=1wKBRLWbT6pSKa9IlTDabjhjTnfs_GxX6Rn6M6kbio1I
PROPERTY_LISTING_SPREADSHEET_ID=1tI_iXaiLuWBggs5y0RH7qzkbHs9wnLLdRekAmjkhcLY
GOOGLE_SHEETS_BUYER_SPREADSHEET_ID=1tI_iXaiLuWBggs5y0RH7qzkbHs9wnLLdRekAmjkhcLY
GYOMU_LIST_SPREADSHEET_ID=1MO2vs0mDUFCgM-rjXXPRIy3pKKdfIFvUDwacM-2174g

# Security
JWT_SECRET=your_jwt_secret_key_min_32_characters
ENCRYPTION_KEY=your_encryption_key_32_characters

# Node Environment
NODE_ENV=production
```

#### Google Service Accountの設定

`google-service-account.json` ファイルの内容を環境変数として設定：

```bash
GOOGLE_SERVICE_ACCOUNT_JSON='{"type":"service_account","project_id":"...","private_key":"...","client_email":"..."}'
```

または、Vercelのファイルアップロード機能を使用。

### 2. フロントエンド環境変数

```bash
# API URL
VITE_API_URL=https://your-domain.vercel.app/api

# Google Maps (オプション)
VITE_GOOGLE_MAPS_API_KEY=your_google_maps_api_key
```

## Vercel Dashboardでの設定手順

### 1. プロジェクトの作成

1. [Vercel Dashboard](https://vercel.com/dashboard)にログイン
2. "Add New..." → "Project"をクリック
3. GitHubリポジトリを選択
4. "Import"をクリック

### 2. ビルド設定

- **Framework Preset**: Other
- **Build Command**: 自動検出（vercel.jsonを使用）
- **Output Directory**: 自動検出（vercel.jsonを使用）
- **Install Command**: `npm install`

### 3. 環境変数の設定

1. プロジェクト設定 → "Environment Variables"
2. 上記の環境変数を1つずつ追加
3. Environment: "Production", "Preview", "Development"を選択

### 4. デプロイ

"Deploy"ボタンをクリックしてデプロイを開始。

## Vercel CLIでのデプロイ

### 1. Vercel CLIのインストール

```bash
npm install -g vercel
```

### 2. ログイン

```bash
vercel login
```

### 3. プロジェクトのリンク

```bash
vercel link
```

### 4. 環境変数の設定

```bash
# 環境変数を1つずつ追加
vercel env add SUPABASE_URL production
vercel env add SUPABASE_KEY production
# ... 他の環境変数も同様に追加
```

または、`.env.production`ファイルから一括インポート：

```bash
vercel env pull .env.production
```

### 5. プレビューデプロイ

```bash
vercel
```

### 6. 本番デプロイ

```bash
vercel --prod
```

## デプロイ後の確認

### 1. サイトアクセス

デプロイされたURLにアクセスして、サイトが正常に表示されることを確認。

### 2. APIエンドポイントのテスト

```bash
# 物件一覧
curl https://your-domain.vercel.app/api/public/properties

# ヘルスチェック
curl https://your-domain.vercel.app/api/health

# サイトマップ
curl https://your-domain.vercel.app/sitemap.xml
```

### 3. パフォーマンステスト

[PageSpeed Insights](https://pagespeed.web.dev/)でパフォーマンスを確認。

### 4. SEO確認

- メタタグの確認（View Page Source）
- サイトマップの確認（/sitemap.xml）
- [Google Rich Results Test](https://search.google.com/test/rich-results)で構造化データを確認

## トラブルシューティング

### ビルドエラー

**問題**: TypeScriptのコンパイルエラー

**解決策**:
```bash
# ローカルでビルドテスト
cd frontend && npm run build
cd ../backend && npm run build
```

### 環境変数が読み込まれない

**問題**: 環境変数が undefined

**解決策**:
1. Vercel Dashboardで環境変数が正しく設定されているか確認
2. Environment（Production/Preview/Development）が正しく選択されているか確認
3. デプロイを再実行

### APIエンドポイントが404

**問題**: /api/* へのリクエストが404

**解決策**:
1. `vercel.json`のルーティング設定を確認
2. バックエンドのビルドが成功しているか確認
3. Vercelのログを確認（Dashboard → Deployments → ログ）

### データベース接続エラー

**問題**: Supabaseに接続できない

**解決策**:
1. `SUPABASE_URL`と`SUPABASE_KEY`が正しいか確認
2. Supabaseのプロジェクトが有効か確認
3. IPアドレス制限がある場合は、Vercelのアドレスを許可

## ロールバック

### Vercel Dashboardでのロールバック

1. Dashboard → Deployments
2. 以前のデプロイを選択
3. "Promote to Production"をクリック

### Vercel CLIでのロールバック

```bash
vercel rollback
```

## カスタムドメインの設定

### 1. ドメインの追加

1. Vercel Dashboard → Settings → Domains
2. ドメインを入力（例: `www.your-domain.com`）
3. "Add"をクリック

### 2. DNS設定

DNSプロバイダーで以下のレコードを追加：

```
Type    Name    Value                   TTL
A       @       76.76.21.21            Auto
CNAME   www     cname.vercel-dns.com   Auto
```

### 3. SSL証明書

Vercelが自動的にSSL証明書をプロビジョニングします（Let's Encrypt）。

## モニタリング

### Vercel Analytics

Vercel Dashboardで以下を確認：
- デプロイ履歴
- ビルドログ
- ランタイムログ
- パフォーマンスメトリクス

### エラーログ

```bash
# リアルタイムログの確認
vercel logs
```

## セキュリティチェックリスト

- [ ] すべての環境変数が設定されている
- [ ] `.env`ファイルがGitにコミットされていない
- [ ] HTTPSが強制されている
- [ ] CORS設定が適切
- [ ] セキュリティヘッダーが設定されている
- [ ] レート制限が有効
- [ ] 機密情報がクライアントに露出していない

## サポート

問題が発生した場合：
1. Vercelのログを確認
2. ローカル環境で再現できるか確認
3. 環境変数が正しく設定されているか確認
4. [Vercel Documentation](https://vercel.com/docs)を参照
