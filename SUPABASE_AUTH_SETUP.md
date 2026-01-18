# Supabase認証設定ガイド

## 問題の原因

ログインできない問題は、以下の設定が不足している可能性があります：

1. **フロントエンドの環境変数**: `.env.local`がVercelのURLを指している
2. **SupabaseのリダイレクトURL設定**: 開発環境のURLが登録されていない
3. **バックエンドのCORS設定**: 必要なヘッダーが不足している

## 修正内容

### 1. フロントエンドの環境変数

新しく`frontend/.env.development`ファイルを作成しました。
ローカル開発時は自動的にこのファイルが使用されます。

```env
VITE_API_URL=http://localhost:3000
VITE_SUPABASE_URL=https://krxhrbtlgfjzsseegaqq.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 2. Supabaseの設定（手動で設定が必要）

Supabaseダッシュボードで以下の設定を確認してください：

#### 2.1 Authentication → URL Configuration

1. **Site URL**: `http://localhost:5173`
2. **Redirect URLs**に以下を追加:
   - `http://localhost:5173/auth/callback`
   - `http://localhost:5174/auth/callback`
   - `http://localhost:5175/auth/callback`
   - `http://localhost:5173/**` (ワイルドカード)

#### 2.2 Authentication → Providers → Google

1. **Enabled**: オンにする
2. **Client ID**: `111282429644-7j3br7ehkp57mmfforgit7djsnfaog5k.apps.googleusercontent.com`
3. **Client Secret**: `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`

### 3. Google Cloud Consoleの設定（手動で設定が必要）

Google Cloud Consoleで以下の設定を確認してください：

#### 3.1 OAuth 2.0 クライアントID

1. **承認済みのJavaScript生成元**:
   - `http://localhost:5173`
   - `http://localhost:5174`
   - `http://localhost:5175`
   - `https://krxhrbtlgfjzsseegaqq.supabase.co`

2. **承認済みのリダイレクトURI**:
   - `http://localhost:5173/auth/callback`
   - `http://localhost:5174/auth/callback`
   - `http://localhost:5175/auth/callback`
   - `https://krxhrbtlgfjzsseegaqq.supabase.co/auth/v1/callback`

## 確認手順

### 1. バックエンドを再起動

```bash
cd backend
npm run dev
```

### 2. フロントエンドを再起動

```bash
cd frontend
npm run dev
```

### 3. ブラウザのキャッシュをクリア

1. ブラウザの開発者ツールを開く（F12）
2. Application → Storage → Clear site data
3. ページをリロード

### 4. ログインを試す

1. `http://localhost:5173`にアクセス
2. 「Googleでログイン」ボタンをクリック
3. Googleアカウントを選択
4. 認証後、自動的にリダイレクトされる

## トラブルシューティング

### エラー: "Access to XMLHttpRequest has been blocked by CORS policy"

**原因**: バックエンドのCORS設定が不足している

**解決策**: 
- バックエンドの`src/index.ts`のCORS設定を確認
- 既に修正済み（`methods`と`allowedHeaders`を追加）

### エラー: "Failed to load resource: net::ERR_FAILED"

**原因**: バックエンドが起動していない、またはポートが間違っている

**解決策**:
- バックエンドが`http://localhost:3000`で起動していることを確認
- `frontend/.env.development`の`VITE_API_URL`が正しいことを確認

### エラー: "Invalid redirect URL"

**原因**: SupabaseまたはGoogle Cloud ConsoleのリダイレクトURL設定が不足している

**解決策**:
- 上記の「Supabaseの設定」と「Google Cloud Consoleの設定」を確認
- 設定変更後、数分待ってから再試行

### エラー: "Authentication failed"

**原因**: Supabaseのセッションが無効、またはトークンが期限切れ

**解決策**:
1. ブラウザのローカルストレージをクリア
2. Supabaseダッシュボードで認証ログを確認
3. バックエンドのログを確認（`console.log`で詳細が出力される）

## 開発環境と本番環境の切り替え

### 開発環境（ローカル）

- フロントエンド: `http://localhost:5173`
- バックエンド: `http://localhost:3000`
- 環境変数: `frontend/.env.development`

### 本番環境（Vercel）

- フロントエンド: `https://baikyaku-property-site3.vercel.app`
- バックエンド: `https://baikyaku-property-site3.vercel.app`
- 環境変数: `frontend/.env.local`（Vercelが自動設定）

Viteは自動的に環境に応じて適切な`.env`ファイルを読み込みます。

## 次のステップ

1. ✅ フロントエンドの環境変数ファイルを作成（完了）
2. ✅ バックエンドのCORS設定を修正（完了）
3. ⚠️ Supabaseの設定を確認（手動で実施が必要）
4. ⚠️ Google Cloud Consoleの設定を確認（手動で実施が必要）
5. 🔄 バックエンドとフロントエンドを再起動
6. 🧪 ログインをテスト

## 参考リンク

- [Supabase Authentication](https://supabase.com/docs/guides/auth)
- [Google OAuth 2.0](https://developers.google.com/identity/protocols/oauth2)
- [Vite Environment Variables](https://vitejs.dev/guide/env-and-mode.html)
