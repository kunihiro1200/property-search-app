# Supabase Google OAuth 設定手順（詳細版）

## 🔑 提供されたClient情報

```
Client ID: 248674138906-s1m16db6dl79374h29d6gmdrjtg76v4q.apps.googleusercontent.com
Client Secret: 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
```

---

## 📋 設定手順

### ステップ1: Supabase Dashboardにアクセス

1. ブラウザで https://supabase.com/dashboard を開く
2. ログインする
3. プロジェクト一覧から **krxhrbtlgfjzsseegaqq** を選択

### ステップ2: Authentication設定を開く

1. 左側のメニューから **Authentication** (🔐アイコン) をクリック
2. 上部のタブから **Providers** をクリック

### ステップ3: Google Providerを設定

1. プロバイダー一覧から **Google** を探す
2. **Google** の行をクリックして展開
3. 右上の **Enabled** トグルスイッチを **ON** にする

### ステップ4: Client情報を入力

以下の情報を入力してください：

**Client ID (for OAuth):**
```
248674138906-s1m16db6dl79374h29d6gmdrjtg76v4q.apps.googleusercontent.com
```

**Client Secret (for OAuth):**
```
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
```

### ステップ5: Redirect URLを確認

Supabaseが自動的に生成するRedirect URLが表示されます：

```
https://krxhrbtlgfjzsseegaqq.supabase.co/auth/v1/callback
```

**この URL をコピーしてください**（次のステップで使用します）

### ステップ6: 保存

画面下部の **Save** ボタンをクリック

---

## 🌐 Google Cloud Console での設定

### ステップ1: Google Cloud Consoleにアクセス

1. ブラウザで https://console.cloud.google.com/ を開く
2. ログインする

### ステップ2: プロジェクトを選択

1. 上部のプロジェクト選択ドロップダウンをクリック
2. Client IDに対応するプロジェクトを選択
   - Client ID: `248674138906-...` で始まるプロジェクト

### ステップ3: 認証情報ページを開く

1. 左側のメニュー（☰）をクリック
2. **APIs & Services** → **Credentials** を選択

### ステップ4: OAuth 2.0 Client IDを編集

1. **OAuth 2.0 Client IDs** セクションを探す
2. Client ID `248674138906-s1m16db6dl79374h29d6gmdrjtg76v4q.apps.googleusercontent.com` をクリック

### ステップ5: Authorized redirect URIsを追加

**Authorized redirect URIs** セクションで：

1. **+ ADD URI** ボタンをクリック
2. 以下のURIを1つずつ追加：

```
http://localhost:5173/auth/callback
```

3. もう一度 **+ ADD URI** をクリック
4. Supabaseから取得したURIを追加：

```
https://krxhrbtlgfjzsseegaqq.supabase.co/auth/v1/callback
```

### ステップ6: 保存

画面下部の **SAVE** ボタンをクリック

---

## ✅ 設定完了後の確認

### 1. .envファイルを更新

`backend/.env` ファイルを開いて、以下の行を更新：

```env
GOOGLE_CLIENT_ID=248674138906-s1m16db6dl79374h29d6gmdrjtg76v4q.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=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
```

### 2. サーバーを再起動

バックエンドサーバーを再起動して設定を反映：

```bash
# ターミナルで Ctrl+C を押してサーバーを停止
# その後、再起動
cd backend
npm run dev
```

### 3. ログインをテスト

1. ブラウザで http://localhost:5173/login を開く
2. **Googleでログイン** ボタンをクリック
3. Googleアカウントを選択
4. 認証が完了すると自動的にダッシュボードにリダイレクトされます

---

## 🎯 設定のまとめ

### Supabase Dashboard
- ✅ Google Provider を有効化
- ✅ Client ID を入力
- ✅ Client Secret を入力
- ✅ 保存

### Google Cloud Console
- ✅ OAuth 2.0 Client ID を編集
- ✅ Redirect URI を2つ追加：
  - `http://localhost:5173/auth/callback`
  - `https://krxhrbtlgfjzsseegaqq.supabase.co/auth/v1/callback`
- ✅ 保存

### ローカル環境
- ✅ .env ファイルを更新
- ✅ サーバーを再起動

---

## 🔍 トラブルシューティング

### "redirect_uri_mismatch" エラー

**原因**: Google Cloud ConsoleのRedirect URIが正しく設定されていない

**解決策**:
1. Google Cloud Consoleで設定したRedirect URIを再確認
2. スペースや改行が入っていないか確認
3. 保存ボタンを押したか確認

### "Invalid client" エラー

**原因**: Client IDまたはClient Secretが間違っている

**解決策**:
1. Supabase DashboardのClient IDとClient Secretを再確認
2. コピー時に余分なスペースが入っていないか確認

### ログインボタンを押しても何も起こらない

**原因**: Supabase DashboardでGoogle Providerが有効になっていない

**解決策**:
1. Supabase Dashboard → Authentication → Providers を開く
2. Google の **Enabled** トグルが ON になっているか確認

---

## 📞 サポート

問題が解決しない場合は、以下の情報を確認してください：

1. ブラウザのコンソール（F12キー）でエラーメッセージを確認
2. バックエンドのログでエラーを確認
3. Supabase Dashboardの Logs セクションでエラーを確認
