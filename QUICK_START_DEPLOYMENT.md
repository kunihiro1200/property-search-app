# Vercelデプロイ クイックスタートガイド

このガイドは、Vercelへのデプロイを最短で完了するための手順です。
詳細な説明は`DEPLOYMENT.md`を参照してください。

---

## 🚀 5ステップでデプロイ

### ステップ1: 環境変数の準備（5分）

1. `VERCEL_ENV_VARIABLES.md`を開く
2. 以下の2つの値を新しく生成：

```powershell
# SESSION_SECRET（64文字）
-join ((65..90) + (97..122) + (48..57) | Get-Random -Count 64 | ForEach-Object {[char]$_})

# WEBHOOK_VERIFICATION_TOKEN（32文字）
-join ((65..90) + (97..122) + (48..57) | Get-Random -Count 32 | ForEach-Object {[char]$_})
```

3. 生成した値を`VERCEL_ENV_VARIABLES.md`に記録

---

### ステップ2: GitHubにプッシュ（2分）

```bash
git add .
git commit -m "feat: Vercelデプロイ設定を追加"
git push origin main
```

---

### ステップ3: Vercelでプロジェクト作成（3分）

1. https://vercel.com にアクセス
2. **Add New** → **Project**をクリック
3. GitHubリポジトリを選択
4. **Import**をクリック
5. **Framework Preset**: `Other`を選択
6. **Root Directory**: そのまま（`.`）
7. **Build Command**: `cd backend && npm install && npm run build && cd ../frontend && npm install && npm run build`
8. **Output Directory**: `frontend/dist`
9. **Install Command**: `npm install`

---

### ステップ4: 環境変数を設定（10分）

#### 方法1: 一括設定（推奨）

1. Vercel Dashboard → **Settings** → **Environment Variables**
2. **Bulk Edit**をクリック
3. `VERCEL_ENV_VARIABLES.md`の内容をコピー＆ペースト
4. **Save**をクリック

#### 方法2: 個別設定

1. Vercel Dashboard → **Settings** → **Environment Variables**
2. `VERCEL_ENV_VARIABLES.md`を見ながら1つずつ追加
3. **Environment**: `Production`のみを選択

**⚠️ 重要**: 以下の環境変数は**後で更新**します（デプロイ後にドメインが確定してから）：
- `GOOGLE_REDIRECT_URI`
- `GMAIL_REDIRECT_URI`
- `GOOGLE_CALENDAR_REDIRECT_URI`
- `FRONTEND_URL`
- `WEBHOOK_BASE_URL`

---

### ステップ5: デプロイ実行（5-10分）

1. **Deploy**ボタンをクリック
2. デプロイが完了するまで待つ
3. デプロイ完了後、Vercelドメインをコピー（例: `https://your-project.vercel.app`）

---

## 🔄 デプロイ後の設定（5分）

### 1. 環境変数を更新

デプロイが完了したら、以下の環境変数を実際のVercelドメインに更新：

```
GOOGLE_REDIRECT_URI=https://your-actual-domain.vercel.app/auth/google/callback
GMAIL_REDIRECT_URI=https://your-actual-domain.vercel.app/auth/google/callback
GOOGLE_CALENDAR_REDIRECT_URI=https://your-actual-domain.vercel.app/api/auth/google/calendar/callback
FRONTEND_URL=https://your-actual-domain.vercel.app
WEBHOOK_BASE_URL=https://your-actual-domain.vercel.app
```

### 2. フロントエンド環境変数を追加

```
VITE_API_URL=https://your-actual-domain.vercel.app
```

### 3. 再デプロイ

1. Vercel Dashboard → **Deployments**
2. **Redeploy**ボタンをクリック
3. デプロイが完了するまで待つ

---

## ✅ 動作確認（5分）

### 1. サイトにアクセス

```
https://your-actual-domain.vercel.app
```

### 2. 機能テスト

- [ ] 物件一覧が表示される
- [ ] 物件詳細が表示される
- [ ] フィルターが動作する
- [ ] 問い合わせフォームが動作する

### 3. APIテスト

```bash
# 物件一覧取得
curl https://your-actual-domain.vercel.app/api/public/properties

# 物件詳細取得
curl https://your-actual-domain.vercel.app/api/public/properties/1
```

### 4. SEO確認

- [ ] ページタイトルが表示される
- [ ] メタディスクリプションが設定されている
- [ ] OGP画像が設定されている

ブラウザの開発者ツールで確認：
```
Elements → <head> → <meta>タグを確認
```

### 5. パフォーマンステスト

1. https://pagespeed.web.dev/ にアクセス
2. デプロイしたURLを入力
3. **Analyze**をクリック
4. スコアを確認（目標: 90点以上）

---

## 🎉 デプロイ完了！

すべての確認が完了したら、デプロイは成功です！

---

## 📚 次のステップ

### カスタムドメインの設定（オプション）

1. Vercel Dashboard → **Settings** → **Domains**
2. **Add Domain**をクリック
3. ドメイン名を入力（例: `properties.example.com`）
4. DNSレコードを設定（Vercelが指示を表示）
5. 設定完了後、環境変数を更新：

```
GOOGLE_REDIRECT_URI=https://properties.example.com/auth/google/callback
GMAIL_REDIRECT_URI=https://properties.example.com/auth/google/callback
GOOGLE_CALENDAR_REDIRECT_URI=https://properties.example.com/api/auth/google/calendar/callback
FRONTEND_URL=https://properties.example.com
WEBHOOK_BASE_URL=https://properties.example.com
VITE_API_URL=https://properties.example.com
```

6. **Redeploy**で再デプロイ

---

## 🆘 トラブルシューティング

### デプロイエラー

#### "Build failed"
```bash
# ローカルでビルドテスト
cd backend && npm run build
cd ../frontend && npm run build
```

エラーがある場合は修正してから再プッシュ。

#### "Environment variable not found"
- Vercel Dashboardで環境変数が正しく設定されているか確認
- 環境変数名にタイポがないか確認

### 実行時エラー

#### "Database connection failed"
- `DATABASE_URL`が正しいか確認
- Supabaseのファイアウォール設定を確認

#### "Google API authentication failed"
- `GOOGLE_PRIVATE_KEY`の改行が`\n`になっているか確認
- サービスアカウントがスプレッドシートに共有されているか確認

#### "CORS error"
- `FRONTEND_URL`が正しく設定されているか確認
- 再デプロイを実行

### パフォーマンス問題

#### "Lighthouse score is low"
- 画像が最適化されているか確認（OptimizedImageコンポーネントを使用）
- キャッシュ設定を確認（vercel.jsonのheaders設定）
- React Queryのキャッシュ設定を確認

---

## 📖 詳細ドキュメント

- **DEPLOYMENT.md**: 詳細なデプロイ手順
- **VERCEL_DEPLOYMENT_CHECKLIST.md**: チェックリスト形式のガイド
- **PRE_DEPLOYMENT_CHECKLIST.md**: デプロイ前の準備チェックリスト
- **VERCEL_ENV_VARIABLES.md**: 環境変数の完全なリスト（機密情報含む）

---

## 🎯 まとめ

1. **環境変数を準備**（5分）
2. **GitHubにプッシュ**（2分）
3. **Vercelでプロジェクト作成**（3分）
4. **環境変数を設定**（10分）
5. **デプロイ実行**（5-10分）
6. **デプロイ後の設定**（5分）
7. **動作確認**（5分）

**合計時間**: 約35-40分

デプロイが完了したら、公開物件サイトが本番環境で稼働します！
