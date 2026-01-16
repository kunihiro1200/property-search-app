# Vercelデプロイチェックリスト

## デプロイ前の確認事項

### 1. コードの準備

- [x] vercel.jsonが正しく設定されている
- [x] .vercelignoreが作成されている
- [x] フロントエンドのビルド設定が完了している
- [x] バックエンドのビルド設定が完了している
- [x] SEOコンポーネントが実装されている
- [x] 画像最適化コンポーネントが実装されている
- [ ] すべてのテストが通過している
- [ ] TypeScriptのコンパイルエラーがない

### 2. 環境変数の準備

以下の環境変数をVercel Dashboardで設定する必要があります：

#### バックエンド環境変数（必須）

```bash
# Database
SUPABASE_URL=
SUPABASE_KEY=
SUPABASE_SERVICE_ROLE_KEY=
DATABASE_URL=

# Google Sheets
GOOGLE_SHEETS_SPREADSHEET_ID=1wKBRLWbT6pSKa9IlTDabjhjTnfs_GxX6Rn6M6kbio1I
PROPERTY_LISTING_SPREADSHEET_ID=1tI_iXaiLuWBggs5y0RH7qzkbHs9wnLLdRekAmjkhcLY
GOOGLE_SHEETS_BUYER_SPREADSHEET_ID=1tI_iXaiLuWBggs5y0RH7qzkbHs9wnLLdRekAmjkhcLY
GYOMU_LIST_SPREADSHEET_ID=1MO2vs0mDUFCgM-rjXXPRIy3pKKdfIFvUDwacM-2174g

# Security
JWT_SECRET=
ENCRYPTION_KEY=

# Node
NODE_ENV=production
```

#### フロントエンド環境変数

```bash
# API URL（デプロイ後に設定）
VITE_API_URL=https://your-domain.vercel.app/api

# Google Maps（オプション）
VITE_GOOGLE_MAPS_API_KEY=
```

### 3. ローカルビルドテスト

デプロイ前に必ずローカルでビルドテストを実行：

```bash
# フロントエンドのビルド
cd frontend
npm install
npm run build

# バックエンドのビルド
cd ../backend
npm install
npm run build
```

### 4. Gitの準備

```bash
# 変更をコミット
git add .
git commit -m "feat: Vercel deployment configuration"

# リモートにプッシュ
git push origin main
```

## Vercelへのデプロイ手順

### 方法1: Vercel Dashboard（推奨）

1. **Vercelにログイン**
   - https://vercel.com/dashboard にアクセス

2. **新しいプロジェクトを作成**
   - "Add New..." → "Project" をクリック
   - GitHubリポジトリを選択
   - "Import" をクリック

3. **ビルド設定**
   - Framework Preset: Other
   - Build Command: 自動検出（vercel.jsonを使用）
   - Output Directory: 自動検出
   - Install Command: `npm install`

4. **環境変数を設定**
   - "Environment Variables" セクションで上記の環境変数を追加
   - Environment: "Production", "Preview", "Development" を選択

5. **デプロイ**
   - "Deploy" ボタンをクリック
   - デプロイ完了を待つ（5-10分程度）

### 方法2: Vercel CLI

```bash
# Vercel CLIをインストール
npm install -g vercel

# ログイン
vercel login

# プロジェクトをリンク
vercel link

# 環境変数を設定
vercel env add SUPABASE_URL production
vercel env add SUPABASE_KEY production
# ... 他の環境変数も同様に追加

# プレビューデプロイ
vercel

# 本番デプロイ
vercel --prod
```

## デプロイ後の確認

### 1. サイトアクセス確認

- [ ] デプロイされたURLにアクセスできる
- [ ] トップページが正しく表示される
- [ ] 物件一覧ページが表示される
- [ ] 物件詳細ページが表示される

### 2. 機能テスト

- [ ] 物件検索が動作する
- [ ] フィルター機能が動作する
- [ ] 物件詳細ページへの遷移が動作する
- [ ] 問い合わせフォームが送信できる
- [ ] 画像が正しく表示される

### 3. APIエンドポイントテスト

```bash
# 物件一覧
curl https://your-domain.vercel.app/api/public/properties

# 物件詳細
curl https://your-domain.vercel.app/api/public/properties/{id}

# ヘルスチェック
curl https://your-domain.vercel.app/api/health

# サイトマップ
curl https://your-domain.vercel.app/sitemap.xml
```

### 4. SEO確認

- [ ] メタタグが正しく設定されている（View Page Source）
- [ ] サイトマップが生成されている（/sitemap.xml）
- [ ] 構造化データが正しい（Google Rich Results Test）
- [ ] Open Graphタグが設定されている

### 5. パフォーマンステスト

- [ ] Lighthouse テストを実行
- [ ] Performance スコアが90以上
- [ ] ページロード時間が3秒以内
- [ ] 画像が遅延読み込みされている

### 6. セキュリティ確認

- [ ] HTTPSが強制されている
- [ ] セキュリティヘッダーが設定されている
- [ ] CORS設定が正しい
- [ ] 環境変数が露出していない

## トラブルシューティング

### ビルドエラー

**症状**: デプロイ時にビルドが失敗する

**解決策**:
1. Vercelのログを確認
2. ローカルで `npm run build` を実行してエラーを確認
3. TypeScriptのエラーを修正
4. 依存関係を確認（`npm install`）

### 環境変数が読み込まれない

**症状**: APIが動作しない、データベースに接続できない

**解決策**:
1. Vercel Dashboard → Settings → Environment Variables を確認
2. 環境変数名が正しいか確認
3. Environment（Production/Preview/Development）が正しく選択されているか確認
4. デプロイを再実行

### 404エラー

**症状**: ページが見つからない

**解決策**:
1. `vercel.json` のルーティング設定を確認
2. フロントエンドのビルドが成功しているか確認
3. `dist` フォルダが正しく生成されているか確認

### APIエンドポイントが動作しない

**症状**: `/api/*` へのリクエストが失敗する

**解決策**:
1. バックエンドのビルドが成功しているか確認
2. 環境変数が正しく設定されているか確認
3. Vercelのログでエラーメッセージを確認

## ロールバック手順

デプロイに問題がある場合、以前のバージョンにロールバック：

### Vercel Dashboard

1. Dashboard → Deployments
2. 以前のデプロイを選択
3. "Promote to Production" をクリック

### Vercel CLI

```bash
vercel rollback
```

## カスタムドメイン設定（オプション）

### 1. ドメインを追加

1. Vercel Dashboard → Settings → Domains
2. ドメインを入力（例: `www.your-domain.com`）
3. "Add" をクリック

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

- デプロイ履歴
- ビルドログ
- ランタイムログ
- パフォーマンスメトリクス

### ログの確認

```bash
# リアルタイムログ
vercel logs

# 特定のデプロイのログ
vercel logs [deployment-url]
```

## サポート

問題が発生した場合：

1. Vercelのログを確認
2. ローカル環境で再現できるか確認
3. 環境変数が正しく設定されているか確認
4. [Vercel Documentation](https://vercel.com/docs) を参照
5. [Vercel Community](https://github.com/vercel/vercel/discussions) で質問

## 次のステップ

デプロイが成功したら：

1. [ ] Google Search Consoleにサイトマップを送信
2. [ ] Google Analyticsを設定（オプション）
3. [ ] パフォーマンスモニタリングを設定
4. [ ] エラートラッキングを設定（Sentry等）
5. [ ] 定期的なバックアップを設定
