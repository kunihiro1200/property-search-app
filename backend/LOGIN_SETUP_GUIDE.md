# ログイン機能セットアップガイド

## 現在の状況

✅ **データベース**: 6,649件の売主データが正常に同期されました  
✅ **バックエンド**: http://localhost:3000 で起動中  
✅ **フロントエンド**: http://localhost:5173 で起動中  
⚠️  **ログイン**: Google OAuthの設定が必要です

## ログイン方式

このシステムは**Google OAuth**を使用しています。メールアドレス/パスワードでのログインはサポートしていません。

## Google OAuthの設定手順

### 1. Supabase Dashboardにアクセス

1. https://supabase.com/dashboard にアクセス
2. プロジェクト `krxhrbtlgfjzsseegaqq` を選択
3. 左メニューから **Authentication** → **Providers** を選択

### 2. Google Providerを有効化

1. **Google** プロバイダーを探す
2. **Enabled** トグルをONにする
3. 以下の情報を入力：

```
Client ID: [Google Cloud ConsoleのClient IDを入力]
Client Secret: [Google Cloud ConsoleのClient Secretを入力]
```

**注意**: 実際の値は`.env`ファイルまたはGoogle Cloud Consoleから取得してください。

4. **Authorized redirect URIs** に以下を追加：
```
http://localhost:5173/auth/callback
https://krxhrbtlgfjzsseegaqq.supabase.co/auth/v1/callback
```

5. **Save** をクリック

### 3. Google Cloud Consoleの設定確認

Google Cloud Console (https://console.cloud.google.com/) で以下を確認：

1. **APIs & Services** → **Credentials** を開く
2. OAuth 2.0 Client ID を選択
3. **Authorized redirect URIs** に以下が含まれているか確認：
   - `http://localhost:5173/auth/callback`
   - `https://krxhrbtlgfjzsseegaqq.supabase.co/auth/v1/callback`

含まれていない場合は追加して保存してください。

## ログイン手順

設定完了後、以下の手順でログインできます：

1. http://localhost:5173/login にアクセス
2. **Googleでログイン** ボタンをクリック
3. Googleアカウントを選択
4. 認証が完了すると自動的にダッシュボードにリダイレクトされます

## 既存ユーザー

以下のユーザーがデータベースに存在します：

1. tomoko.kunihiro@ifoo-oita.com
2. jyuna.wada@ifoo-oita.com
3. genta.hayashida@ifoo-oita.com
4. oitaifoo@gmail.com
5. yurine.kimura@ifoo-oita.com
6. mariko.kume@ifoo-oita.com
7. rikuto.shouno@ifoo-oita.com
8. yuuko.yamamoto@ifoo-oita.com
9. tenma.ura@ifoo-oita.com
10. hiromitsu-kakui@ifoo-oita.com
11. naomi.hirose@ifoo-oita.com
12. tenant@ifoo-oita.com

これらのGoogleアカウントでログインできます。

## トラブルシューティング

### ログインボタンをクリックしても何も起こらない

- ブラウザのコンソールを開いてエラーを確認
- Supabase DashboardでGoogle Providerが有効になっているか確認

### "認証に失敗しました"エラー

- Google Cloud ConsoleのAuthorized redirect URIsが正しく設定されているか確認
- Supabase DashboardのClient IDとClient Secretが正しいか確認

### "有効なセッションが見つかりません"エラー

- ブラウザのキャッシュとCookieをクリア
- もう一度ログインを試す

## 次のステップ

1. ✅ Supabase DashboardでGoogle Providerを有効化
2. ✅ Google Cloud ConsoleでRedirect URIsを確認
3. ✅ http://localhost:5173/login でログインをテスト
4. ✅ ログイン成功後、売主リストが表示されることを確認

## サーバーの起動状態

現在、以下のサーバーが起動しています：

- **バックエンド**: http://localhost:3000 (Process ID: 4)
- **フロントエンド**: http://localhost:5173 (Process ID: 5)

サーバーを停止する必要がある場合は、ターミナルで `Ctrl+C` を押してください。
