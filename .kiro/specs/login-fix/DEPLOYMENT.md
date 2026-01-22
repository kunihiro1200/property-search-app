# ログイン機能 - デプロイメントガイド

## 前提条件

- Supabaseプロジェクトが作成されていること
- Google Cloud Consoleでプロジェクトが作成されていること
- Node.js 18以上がインストールされていること

## 1. Supabase設定

### 1.1 プロジェクトの作成（初回のみ）

1. [Supabase Dashboard](https://app.supabase.com/)にアクセス
2. 「New Project」をクリック
3. プロジェクト名、データベースパスワードを入力
4. リージョンを選択（日本の場合は`Northeast Asia (Tokyo)`を推奨）
5. 「Create new project」をクリック

### 1.2 Redirect URLsの設定

1. Supabase Dashboard > Authentication > URL Configuration
2. Redirect URLsセクションで以下を追加:
   ```
   # 開発環境
   http://localhost:5173/auth/callback
   
   # 本番環境（実際のドメインに置き換え）
   https://your-domain.com/auth/callback
   ```
3. 「Save」をクリック

### 1.3 Google OAuth設定

1. Supabase Dashboard > Authentication > Providers
2. Googleプロバイダーを選択
3. 「Enable Google provider」をオンにする
4. Google Cloud ConsoleからClient IDとClient Secretを取得（次のセクション参照）
5. Client IDとClient Secretを入力
6. 「Save」をクリック

## 2. Google Cloud Console設定

### 2.1 OAuth 2.0 Client IDの作成

1. [Google Cloud Console](https://console.cloud.google.com/)にアクセス
2. プロジェクトを選択（または新規作成）
3. APIs & Services > Credentials に移動
4. 「+ CREATE CREDENTIALS」> 「OAuth client ID」をクリック
5. Application typeで「Web application」を選択
6. Nameを入力（例: "Seller Management System"）
7. Authorized redirect URIsに以下を追加:
   ```
   # Supabase Auth callback
   https://your-project.supabase.co/auth/v1/callback
   
   # 開発環境（オプション）
   http://localhost:5173/auth/callback
   ```
8. 「CREATE」をクリック
9. 表示されたClient IDとClient Secretをコピー

### 2.2 OAuth consent screenの設定

1. APIs & Services > OAuth consent screen に移動
2. User Typeで「External」を選択（内部ユーザーのみの場合は「Internal」）
3. App informationを入力:
   - App name: アプリケーション名
   - User support email: サポートメールアドレス
   - Developer contact information: 開発者メールアドレス
4. Scopesで必要な権限を追加:
   - `openid`
   - `email`
   - `profile`
5. 「SAVE AND CONTINUE」をクリック

## 3. 環境変数の設定

### 3.1 フロントエンド環境変数

`frontend/.env`ファイルを作成:

```env
# API URL
VITE_API_URL=http://localhost:3000

# Supabase Configuration
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

**本番環境**:
```env
VITE_API_URL=https://api.your-domain.com
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### 3.2 バックエンド環境変数

`backend/.env`ファイルを作成:

```env
# Server Configuration
PORT=3000
NODE_ENV=development

# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-key

# Frontend URL (CORS設定用)
FRONTEND_URL=http://localhost:5173

# その他の設定...
```

**本番環境**:
```env
PORT=3000
NODE_ENV=production

SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-key

FRONTEND_URL=https://your-domain.com
```

### 3.3 環境変数の取得方法

**Supabase URL, Anon Key, Service Key**:
1. Supabase Dashboard > Settings > API
2. Project URLをコピー → `SUPABASE_URL`
3. Project API keysセクション:
   - `anon` `public`キーをコピー → `SUPABASE_ANON_KEY`
   - `service_role` `secret`キーをコピー → `SUPABASE_SERVICE_KEY`

## 4. データベースの確認

### 4.1 employeesテーブルの確認

Supabase Dashboard > Table Editor で`employees`テーブルが存在することを確認:

```sql
CREATE TABLE employees (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  supabase_user_id TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'staff',
  initials TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

テーブルが存在しない場合は、マイグレーションを実行してください。

## 5. アプリケーションのビルドとデプロイ

### 5.1 フロントエンドのビルド

```bash
cd frontend
npm install
npm run build
```

ビルド成果物は`frontend/dist`ディレクトリに生成されます。

### 5.2 バックエンドのビルド

```bash
cd backend
npm install
npm run build
```

TypeScriptファイルがJavaScriptにコンパイルされます。

### 5.3 本番環境へのデプロイ

**フロントエンド（例: Vercel）**:
```bash
# Vercel CLIを使用
cd frontend
vercel --prod
```

**バックエンド（例: Railway, Render）**:
```bash
# 環境変数を設定
# PORT, NODE_ENV, SUPABASE_URL, SUPABASE_SERVICE_KEY, FRONTEND_URL

# アプリケーションを起動
npm start
```

## 6. 動作確認

### 6.1 ログイン機能の確認

1. ブラウザでアプリケーションにアクセス
2. ログインページが表示されることを確認
3. 「Googleでログイン」ボタンをクリック
4. Google OAuth画面が表示されることを確認
5. Googleアカウントを選択して承認
6. ホームページにリダイレクトされることを確認
7. ユーザー情報が正しく表示されることを確認

### 6.2 セッション管理の確認

1. ログイン後、ページをリロード
2. ログイン状態が維持されることを確認
3. ログアウトボタンをクリック
4. ログインページにリダイレクトされることを確認

### 6.3 エラーハンドリングの確認

1. OAuth承認をキャンセル
2. エラーメッセージが表示されることを確認
3. 「もう一度試す」ボタンが表示されることを確認

## 7. トラブルシューティング

### 7.1 ログの確認

**フロントエンド**:
- ブラウザの開発者ツール（F12）> Consoleタブ
- ログインフローの各ステップでログが出力される

**バックエンド**:
- サーバーのログを確認
- `/auth/callback`エンドポイントのログを確認

### 7.2 よくある問題

1. **Redirect URIの不一致**
   - Supabase DashboardとGoogle Cloud Consoleの設定を確認
   - 両方に同じRedirect URIが設定されているか確認

2. **CORS エラー**
   - バックエンドの`FRONTEND_URL`環境変数を確認
   - CORS設定が正しいか確認

3. **環境変数の設定ミス**
   - `.env`ファイルの内容を確認
   - 環境変数が正しく読み込まれているか確認

詳細なトラブルシューティングは`TROUBLESHOOTING.md`を参照してください。

## 8. セキュリティチェックリスト

- [ ] `SUPABASE_SERVICE_KEY`は環境変数で管理され、コードにハードコードされていない
- [ ] 本番環境では`NODE_ENV=production`が設定されている
- [ ] HTTPS通信が有効になっている（本番環境）
- [ ] CORS設定が適切に設定されている
- [ ] Supabase Row Level Security (RLS)が有効になっている
- [ ] 不要なログ出力が削除されている（本番環境）

## 9. モニタリング

### 9.1 Supabase Dashboard

- Authentication > Users: ユーザー数の確認
- Authentication > Logs: 認証ログの確認

### 9.2 アプリケーションログ

- 認証成功率の監視
- エラーログの監視
- レスポンスタイムの監視

## 10. ロールバック手順

問題が発生した場合のロールバック手順:

1. **フロントエンド**:
   ```bash
   # 前のバージョンにロールバック
   vercel rollback
   ```

2. **バックエンド**:
   ```bash
   # 前のバージョンをデプロイ
   git checkout <previous-commit>
   git push origin main --force
   ```

3. **Supabase設定**:
   - Supabase Dashboardで設定を元に戻す
   - Redirect URLsを確認

## サポート

デプロイ中に問題が発生した場合は、`TROUBLESHOOTING.md`を参照するか、以下の情報を含めて問い合わせてください:

1. エラーメッセージ
2. 環境（開発 or 本番）
3. 実行したコマンド
4. 環境変数の設定（機密情報は除く）
