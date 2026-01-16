# デプロイ前チェックリスト

このチェックリストを使用して、Vercelデプロイ前にすべての準備が整っているか確認してください。

---

## ✅ ステップ1: コードの準備

### 1.1 必要なファイルが存在するか確認
- [ ] `vercel.json` - Vercelデプロイ設定
- [ ] `.vercelignore` - デプロイ除外ファイル
- [ ] `.env.production.template` - バックエンド環境変数テンプレート
- [ ] `frontend/.env.production.template` - フロントエンド環境変数テンプレート
- [ ] `DEPLOYMENT.md` - デプロイ手順書
- [ ] `VERCEL_DEPLOYMENT_CHECKLIST.md` - デプロイチェックリスト
- [ ] `VERCEL_ENV_VARIABLES.md` - 環境変数リスト（機密情報含む）

### 1.2 SEOコンポーネントが実装されているか確認
- [ ] `frontend/src/components/SEOHead.tsx`
- [ ] `frontend/src/components/StructuredData.tsx`
- [ ] `frontend/src/utils/structuredData.ts`
- [ ] `frontend/src/main.tsx`に`HelmetProvider`が追加されている
- [ ] `PublicPropertiesPage.tsx`にSEOが適用されている
- [ ] `PublicPropertyDetailPage.tsx`にSEOが適用されている

### 1.3 パフォーマンス最適化が実装されているか確認
- [ ] `frontend/src/components/OptimizedImage.tsx`
- [ ] `frontend/vite.config.ts`が最適化されている
- [ ] `frontend/package.json`に`vercel-build`スクリプトがある

### 1.4 依存関係のインストール
```bash
# バックエンド
cd backend
npm install

# フロントエンド
cd ../frontend
npm install
```

- [ ] バックエンドの依存関係がインストールされている
- [ ] フロントエンドの依存関係がインストールされている
- [ ] `package-lock.json`が最新である

---

## ✅ ステップ2: 環境変数の準備

### 2.1 環境変数の値を確認
`VERCEL_ENV_VARIABLES.md`を開いて、以下の値を確認：

#### Supabase
- [ ] `SUPABASE_URL`
- [ ] `SUPABASE_ANON_KEY`
- [ ] `SUPABASE_SERVICE_KEY`
- [ ] `SUPABASE_SERVICE_ROLE_KEY`
- [ ] `DATABASE_URL`
- [ ] `SUPABASE_DB_PASSWORD`

#### セキュリティ
- [ ] `ENCRYPTION_KEY`
- [ ] `SESSION_SECRET`（本番環境用に新しい値を生成）
- [ ] `JWT_EXPIRES_IN`

#### Google API
- [ ] `GOOGLE_CLIENT_ID`
- [ ] `GOOGLE_CLIENT_SECRET`
- [ ] `GOOGLE_REDIRECT_URI`（デプロイ後に更新）
- [ ] `GMAIL_CLIENT_ID`
- [ ] `GMAIL_CLIENT_SECRET`
- [ ] `GMAIL_REDIRECT_URI`（デプロイ後に更新）
- [ ] `GMAIL_REFRESH_TOKEN`
- [ ] `GOOGLE_CALENDAR_CLIENT_ID`
- [ ] `GOOGLE_CALENDAR_CLIENT_SECRET`
- [ ] `GOOGLE_CALENDAR_REDIRECT_URI`（デプロイ後に更新）

#### Google Sheets
- [ ] `GOOGLE_SHEETS_SPREADSHEET_ID`
- [ ] `GOOGLE_SHEETS_SHEET_NAME`
- [ ] `GYOMU_LIST_SPREADSHEET_ID`
- [ ] `GYOMU_LIST_SHEET_NAME`
- [ ] `GOOGLE_SHEETS_BUYER_SPREADSHEET_ID`
- [ ] `GOOGLE_SHEETS_BUYER_SHEET_NAME`
- [ ] `PROPERTY_LISTING_SPREADSHEET_ID`
- [ ] `PROPERTY_LISTING_SHEET_NAME`

#### Google Service Account
- [ ] `GOOGLE_SERVICE_ACCOUNT_EMAIL`
- [ ] `GOOGLE_PRIVATE_KEY`（改行が`\n`になっているか確認）

#### その他のAPI
- [ ] `GOOGLE_DRIVE_PARENT_FOLDER_ID`
- [ ] `REPLICATE_API_TOKEN`
- [ ] `GOOGLE_MAPS_API_KEY`
- [ ] `SMS_API_KEY`

#### アプリケーション設定
- [ ] `NODE_ENV=production`
- [ ] `PORT=3000`
- [ ] `FRONTEND_URL`（デプロイ後に更新）
- [ ] `WEBHOOK_BASE_URL`（デプロイ後に更新）
- [ ] `WEBHOOK_VERIFICATION_TOKEN`（本番環境用に新しい値を生成）

### 2.2 本番環境用の新しい値を生成

#### SESSION_SECRETの生成
```powershell
# PowerShellで実行
-join ((65..90) + (97..122) + (48..57) | Get-Random -Count 64 | ForEach-Object {[char]$_})
```
- [ ] 新しい`SESSION_SECRET`を生成した
- [ ] `VERCEL_ENV_VARIABLES.md`に記録した

#### WEBHOOK_VERIFICATION_TOKENの生成
```powershell
# PowerShellで実行
-join ((65..90) + (97..122) + (48..57) | Get-Random -Count 32 | ForEach-Object {[char]$_})
```
- [ ] 新しい`WEBHOOK_VERIFICATION_TOKEN`を生成した
- [ ] `VERCEL_ENV_VARIABLES.md`に記録した

---

## ✅ ステップ3: GitHubの準備

### 3.1 GitHubリポジトリの確認
- [ ] GitHubアカウントがある
- [ ] リポジトリが作成されている（または既存のリポジトリを使用）
- [ ] リポジトリがpublicまたはprivate（Vercelはどちらでも対応）

### 3.2 コードをGitHubにプッシュ
```bash
# 変更をステージング
git add .

# コミット
git commit -m "feat: Vercelデプロイ設定とSEO/パフォーマンス最適化を追加"

# GitHubにプッシュ
git push origin main
```

- [ ] すべての変更がコミットされている
- [ ] GitHubにプッシュされている
- [ ] `.gitignore`が正しく設定されている（`VERCEL_ENV_VARIABLES.md`が除外されている）

---

## ✅ ステップ4: Vercelアカウントの準備

### 4.1 Vercelアカウントの作成（初回のみ）
- [ ] https://vercel.com にアクセス
- [ ] GitHubアカウントでサインアップ
- [ ] Vercelアカウントが作成されている

### 4.2 GitHubとの連携
- [ ] VercelがGitHubリポジトリにアクセスできる
- [ ] 必要に応じてGitHub Appをインストール

---

## ✅ ステップ5: デプロイ前の最終確認

### 5.1 ローカルでのビルドテスト
```bash
# バックエンドのビルド
cd backend
npm run build

# フロントエンドのビルド
cd ../frontend
npm run build
```

- [ ] バックエンドのビルドが成功する
- [ ] フロントエンドのビルドが成功する
- [ ] ビルドエラーがない

### 5.2 ローカルでの動作確認
```bash
# バックエンドの起動
cd backend
npm start

# フロントエンドの起動（別のターミナル）
cd frontend
npm run dev
```

- [ ] バックエンドが正常に起動する
- [ ] フロントエンドが正常に起動する
- [ ] 公開物件サイトが表示される
- [ ] 物件一覧が表示される
- [ ] 物件詳細が表示される
- [ ] フィルターが動作する
- [ ] 問い合わせフォームが動作する

### 5.3 APIエンドポイントの確認
- [ ] `GET /api/public/properties` - 物件一覧取得
- [ ] `GET /api/public/properties/:id` - 物件詳細取得
- [ ] `POST /api/public/inquiries` - 問い合わせ送信
- [ ] `GET /api/public/sitemap` - サイトマップ取得

### 5.4 データベースの確認
- [ ] Supabaseにアクセスできる
- [ ] `property_listings`テーブルにデータがある
- [ ] `buyers`テーブルにデータがある
- [ ] `sellers`テーブルにデータがある

### 5.5 Google APIの確認
- [ ] Google Sheets APIが有効になっている
- [ ] Google Drive APIが有効になっている
- [ ] Google Calendar APIが有効になっている
- [ ] Gmail APIが有効になっている
- [ ] サービスアカウントがスプレッドシートに共有されている

---

## ✅ ステップ6: デプロイ準備完了

すべてのチェックが完了したら、デプロイを開始できます！

### 次のステップ
1. **DEPLOYMENT.md**を開く
2. **手順4: Vercelでプロジェクトを作成**から開始
3. 環境変数を設定（**VERCEL_ENV_VARIABLES.md**を参照）
4. デプロイを実行
5. デプロイ後、`VITE_API_URL`を追加して再デプロイ
6. 動作確認

---

## 📝 メモ

### デプロイ後に更新が必要な環境変数
デプロイが完了したら、以下の環境変数を実際のVercelドメインに更新してください：

```
GOOGLE_REDIRECT_URI=https://your-actual-domain.vercel.app/auth/google/callback
GMAIL_REDIRECT_URI=https://your-actual-domain.vercel.app/auth/google/callback
GOOGLE_CALENDAR_REDIRECT_URI=https://your-actual-domain.vercel.app/api/auth/google/calendar/callback
FRONTEND_URL=https://your-actual-domain.vercel.app
WEBHOOK_BASE_URL=https://your-actual-domain.vercel.app
VITE_API_URL=https://your-actual-domain.vercel.app
```

更新後、**Redeploy**ボタンをクリックして再デプロイしてください。

---

## 🆘 問題が発生した場合

### ビルドエラー
- `npm install`を再実行
- `node_modules`を削除して再インストール
- TypeScriptエラーを確認

### 環境変数エラー
- `VERCEL_ENV_VARIABLES.md`の値を再確認
- 特殊文字が正しくエスケープされているか確認
- `GOOGLE_PRIVATE_KEY`の改行が`\n`になっているか確認

### APIエラー
- Supabaseの接続情報を確認
- Google APIの認証情報を確認
- サービスアカウントの権限を確認

詳細なトラブルシューティングは**DEPLOYMENT.md**を参照してください。

---

## ✅ チェックリスト完了

すべてのチェックが完了したら、デプロイを開始してください！

**次のファイルを開く**: `DEPLOYMENT.md`
