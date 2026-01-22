# ログイン機能 - トラブルシューティングガイド

## よくある問題と解決方法

### 1. ログインボタンをクリックしても何も起こらない

**症状**: ログインボタンをクリックしてもGoogle OAuth画面が表示されない

**原因と解決方法**:

1. **Supabase設定の確認**
   - Supabase Dashboardにログイン
   - Authentication > URL Configuration を確認
   - Redirect URLsに以下が追加されているか確認:
     - Development: `http://localhost:5173/auth/callback`
     - Production: `https://your-domain.com/auth/callback`

2. **環境変数の確認**
   ```bash
   # frontend/.env
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   
   # backend/.env
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_SERVICE_KEY=your-service-key
   ```

3. **ブラウザのコンソールを確認**
   - F12キーを押して開発者ツールを開く
   - Consoleタブでエラーメッセージを確認
   - エラーメッセージに基づいて対処

### 2. OAuth画面は表示されるが、認証後にエラーが表示される

**症状**: Google OAuth画面で承認後、エラーメッセージが表示される

**原因と解決方法**:

1. **Redirect URIの不一致**
   - Google Cloud Consoleで設定されているRedirect URIを確認
   - Supabase Dashboardで設定されているRedirect URLsを確認
   - 両方が一致しているか確認

2. **トークンの有効期限切れ**
   - ブラウザのlocalStorageをクリア
   - もう一度ログインを試す

3. **バックエンドAPIエラー**
   - バックエンドのログを確認
   - `/auth/callback`エンドポイントのエラーログを確認

### 3. 認証は成功するが、ホームページにリダイレクトされない

**症状**: 認証処理は完了するが、ログインページから移動しない

**原因と解決方法**:

1. **ルーティング設定の確認**
   - `App.tsx`に`/auth/callback`ルートが追加されているか確認
   - `AuthCallbackPage`が正しくインポートされているか確認

2. **セッション保存の確認**
   - ブラウザの開発者ツールでlocalStorageを確認
   - `session_token`と`refresh_token`が保存されているか確認

3. **ProtectedRouteの確認**
   - `ProtectedRoute`コンポーネントが正しく動作しているか確認
   - `isAuthenticated`状態が正しく更新されているか確認

### 4. ページをリロードするとログアウトされる

**症状**: ログイン後にページをリロードすると、ログインページに戻される

**原因と解決方法**:

1. **checkAuth()の実行確認**
   - `App.tsx`または`ProtectedRoute`で`checkAuth()`が呼ばれているか確認
   - ブラウザのコンソールで`checkAuth()`のログを確認

2. **セッション復元の確認**
   - localStorageに`session_token`が保存されているか確認
   - Supabase Authのセッションが有効か確認

3. **トークンの有効期限**
   - トークンの有効期限が切れている可能性
   - `refresh_token`を使用してトークンをリフレッシュ

### 5. 「認証エラー」が表示される

**症状**: 認証処理中に「認証エラー」というメッセージが表示される

**原因と解決方法**:

1. **Supabase Service Keyの確認**
   - バックエンドの`.env`ファイルで`SUPABASE_SERVICE_KEY`が正しく設定されているか確認
   - Service Keyは`service_role`キーであることを確認（Anon Keyではない）

2. **データベース接続の確認**
   - Supabaseのダッシュボードでデータベースが正常に動作しているか確認
   - `employees`テーブルが存在するか確認

3. **ネットワークエラー**
   - バックエンドAPIが起動しているか確認
   - CORSエラーが発生していないか確認

## Supabase設定の確認手順

### 1. Redirect URLsの設定

1. Supabase Dashboardにログイン
2. プロジェクトを選択
3. Authentication > URL Configuration に移動
4. Redirect URLsセクションで以下を追加:
   - `http://localhost:5173/auth/callback` (開発環境)
   - `https://your-domain.com/auth/callback` (本番環境)
5. 「Save」をクリック

### 2. Google OAuth設定の確認

1. Supabase Dashboard > Authentication > Providers
2. Googleプロバイダーを選択
3. 「Enable Google provider」がオンになっているか確認
4. Client IDとClient Secretが設定されているか確認
5. Authorized redirect URIsに以下が含まれているか確認:
   - `https://your-project.supabase.co/auth/v1/callback`

### 3. Google Cloud Consoleの設定

1. Google Cloud Consoleにログイン
2. プロジェクトを選択
3. APIs & Services > Credentials
4. OAuth 2.0 Client IDsを選択
5. Authorized redirect URIsに以下を追加:
   - `https://your-project.supabase.co/auth/v1/callback`
   - `http://localhost:5173/auth/callback` (開発環境)

## 環境変数の設定手順

### フロントエンド (frontend/.env)

```env
VITE_API_URL=http://localhost:3000
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### バックエンド (backend/.env)

```env
PORT=3000
NODE_ENV=development

SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-key

FRONTEND_URL=http://localhost:5173
```

## デバッグ方法

### 1. ブラウザのコンソールログ

ログインフローの各ステップでログが出力されます:

```
🔵 Starting Supabase Google login...
🔵 Redirect URL: http://localhost:5173/auth/callback
✅ Supabase login initiated

🔵 handleAuthCallback called
🔵 Current URL: http://localhost:5173/auth/callback#access_token=...
🔵 Hash params: { hasAccessToken: true, hasRefreshToken: true }
🔵 Supabase session: { hasSession: true, hasAccessToken: true }
🔵 Calling backend /auth/callback...
✅ Got employee info: { id: '...', name: '...', email: '...' }
✅ Auth callback completed successfully
```

### 2. バックエンドのログ

バックエンドでもログが出力されます:

```
🔵 /auth/callback called
🔵 Has access_token: true
🔵 Has refresh_token: true
🔵 Verifying token with Supabase...
🔵 Session result: { hasUser: true, userId: '...', userEmail: '...' }
🔵 Creating/getting employee record...
✅ Employee record created/retrieved: { id: '...', name: '...', email: '...' }
```

### 3. ネットワークタブ

ブラウザの開発者ツールでNetworkタブを開き、以下のリクエストを確認:

1. `POST /auth/callback` - ステータス200であることを確認
2. `GET /auth/me` - ステータス200であることを確認

## サポート

上記の手順で解決しない場合は、以下の情報を含めて問い合わせてください:

1. エラーメッセージ（ブラウザのコンソールとバックエンドのログ）
2. 使用しているブラウザとバージョン
3. 環境（開発環境 or 本番環境）
4. 再現手順
