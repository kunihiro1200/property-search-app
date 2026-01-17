# デプロイ成功後のチェックリスト

## ✅ デプロイ成功を確認

- [ ] Vercel Dashboard → Deployments で最新デプロイが **Ready** になっている
- [ ] デプロイログにエラーがない
- [ ] ビルドが成功している（`✓ built in XXs`）

---

## 🔧 環境変数を追加

### 1. VITE_API_URL を追加

1. Vercel Dashboard → **Settings** → **Environment Variables**
2. 新しい環境変数を追加：
   - **Name**: `VITE_API_URL`
   - **Value**: `https://baikyaku-property-site3.vercel.app`
   - **Environment**: `Production` ✓
3. **Save** をクリック

### 2. 再デプロイ

環境変数を追加したら、**Redeploy** して反映させる：

1. Deployments タブ → 最新デプロイの **"..."** メニュー
2. **Redeploy** をクリック

---

## 🔐 Google OAuth設定を更新

### Google Cloud Console

1. [Google Cloud Console](https://console.cloud.google.com/) にアクセス
2. **APIs & Services** → **Credentials**
3. OAuth 2.0 クライアントIDを選択
4. **承認済みのリダイレクトURI** に以下を追加：
   ```
   https://baikyaku-property-site3.vercel.app/auth/google/callback
   https://baikyaku-property-site3.vercel.app/api/auth/google/calendar/callback
   ```
5. **保存**

---

## 🧪 動作確認

### 1. サイトにアクセス

- URL: https://baikyaku-property-site3.vercel.app
- [ ] ページが正しく表示される
- [ ] ローディングが完了する
- [ ] レイアウトが崩れていない

### 2. コンソールエラーを確認

1. ブラウザで **F12** を押す
2. **Console** タブを開く
3. [ ] エラーメッセージがない（赤字のエラー）
4. [ ] 警告が少ない（黄色の警告は許容範囲）

### 3. APIエンドポイントを確認

ブラウザのコンソールで以下を実行：

```javascript
fetch('https://baikyaku-property-site3.vercel.app/api/health')
  .then(res => res.json())
  .then(data => console.log(data))
```

- [ ] レスポンスが返ってくる
- [ ] エラーが出ない

### 4. 公開物件ページを確認

1. トップページから公開物件ページに移動
2. [ ] 物件リストが表示される
3. [ ] 画像が表示される
4. [ ] フィルター機能が動作する

---

## 📝 Vercel環境変数の最終確認

以下の環境変数が**すべて設定されているか**確認：

### 必須環境変数

- [ ] `VITE_API_URL`
- [ ] `SUPABASE_URL`
- [ ] `SUPABASE_ANON_KEY`
- [ ] `SUPABASE_SERVICE_KEY`
- [ ] `DATABASE_URL`
- [ ] `GOOGLE_CLIENT_ID`
- [ ] `GOOGLE_CLIENT_SECRET`
- [ ] `GOOGLE_SERVICE_ACCOUNT_EMAIL`
- [ ] `GOOGLE_PRIVATE_KEY`
- [ ] `GOOGLE_SHEETS_SPREADSHEET_ID`
- [ ] `PROPERTY_LISTING_SPREADSHEET_ID`
- [ ] `ENCRYPTION_KEY`
- [ ] `SESSION_SECRET`

詳細は `VERCEL_ENV_VARIABLES.md` を参照

---

## 🚨 トラブルシューティング

### サイトが表示されない

1. Vercel Dashboard → Deployments → 最新デプロイのログを確認
2. エラーメッセージを確認
3. 環境変数が正しく設定されているか確認

### APIエラーが出る

1. `VITE_API_URL` が正しく設定されているか確認
2. 再デプロイして環境変数を反映
3. ブラウザのキャッシュをクリア（Ctrl+Shift+R）

### Google OAuth エラー

1. Google Cloud Console でリダイレクトURIが正しく設定されているか確認
2. `GOOGLE_CLIENT_ID` と `GOOGLE_CLIENT_SECRET` が正しいか確認

---

## ✅ 完了

すべてのチェック項目が完了したら、デプロイは成功です！🎉

次のステップ：
- ユーザーにサイトURLを共有
- 動作確認を依頼
- フィードバックを収集
