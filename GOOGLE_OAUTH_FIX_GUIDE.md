# Google OAuth Client ID 修正ガイド

## 🚨 問題の概要

デプロイ時に2つの異なるGoogle Client IDが混在しており、認証エラーが発生しています。

### 確認されたClient ID

1. **ドキュメント記載のID**: `111282429644-7j3br7ehkp57mmfforgit7djsnfaog5k.apps.googleusercontent.com`
2. **別のID**: `248674138906-s1m16db6dl79374h29d6gmdrjtg76v4q.apps.googleusercontent.com`

---

## 📋 修正手順

### ステップ1: Google Cloud Consoleで正しいClient IDを確認

1. [Google Cloud Console](https://console.cloud.google.com/) にアクセス
2. **APIs & Services** → **Credentials**
3. OAuth 2.0 クライアントIDのリストを確認
4. **どちらのClient IDを使用するか決定**

#### 判断基準：
- **本番環境用のプロジェクト**に紐づいているClient IDを使用
- リダイレクトURIに`https://baikyaku-property-site3.vercel.app`が設定されているものを使用

---

### ステップ2: Vercelの環境変数を修正

#### 2-1. Vercel Dashboardにアクセス
1. https://vercel.com/dashboard にアクセス
2. プロジェクト「baikyaku-property-site3」を選択
3. **Settings** → **Environment Variables**

#### 2-2. 以下の環境変数を修正

**修正が必要な環境変数：**

```
GOOGLE_CLIENT_ID=【正しいClient ID】
GOOGLE_CLIENT_SECRET=【対応するClient Secret】

GMAIL_CLIENT_ID=【正しいClient ID】
GMAIL_CLIENT_SECRET=【対応するClient Secret】

GOOGLE_CALENDAR_CLIENT_ID=【正しいClient ID】
GOOGLE_CALENDAR_CLIENT_SECRET=【対応するClient Secret】
```

#### 2-3. リダイレクトURIも確認

```
GOOGLE_REDIRECT_URI=https://baikyaku-property-site3.vercel.app/auth/google/callback
GMAIL_REDIRECT_URI=https://baikyaku-property-site3.vercel.app/auth/google/callback
GOOGLE_CALENDAR_REDIRECT_URI=https://baikyaku-property-site3.vercel.app/api/auth/google/calendar/callback
```

---

### ステップ3: Google Cloud ConsoleでリダイレクトURIを設定

1. Google Cloud Console → **APIs & Services** → **Credentials**
2. 使用するOAuth 2.0 クライアントIDを選択
3. **承認済みのリダイレクトURI**に以下を追加：

```
https://baikyaku-property-site3.vercel.app/auth/google/callback
https://baikyaku-property-site3.vercel.app/api/auth/google/calendar/callback
```

4. **保存**をクリック

---

### ステップ4: 再デプロイ

1. Vercel Dashboard → **Deployments**タブ
2. 最新デプロイの**"..."**メニュー → **Redeploy**
3. デプロイが完了するまで待つ（5-10分）

---

## ✅ 動作確認

### 1. サイトにアクセス
- URL: https://baikyaku-property-site3.vercel.app
- ページが正しく表示されるか確認

### 2. ログイン機能のテスト
1. ログインボタンをクリック
2. Googleアカウントでログイン
3. エラーが出ないか確認

### 3. コンソールエラーの確認
1. ブラウザで**F12**を押す
2. **Console**タブを開く
3. 赤字のエラーがないか確認

---

## 🚨 トラブルシューティング

### エラー: "redirect_uri_mismatch"

**原因**: Google Cloud ConsoleのリダイレクトURIが正しく設定されていない

**解決策**:
1. Google Cloud Console → Credentials
2. OAuth 2.0 クライアントIDを選択
3. リダイレクトURIを確認・修正
4. 保存後、数分待ってから再試行

### エラー: "invalid_client"

**原因**: Client IDまたはClient Secretが間違っている

**解決策**:
1. Google Cloud Consoleで正しいClient IDとSecretを確認
2. Vercelの環境変数を修正
3. 再デプロイ

### エラー: "access_denied"

**原因**: OAuth同意画面の設定が不完全

**解決策**:
1. Google Cloud Console → **OAuth consent screen**
2. 必要な情報を入力
3. スコープを確認（Gmail、Calendar、Sheetsなど）
4. テストユーザーを追加（本番公開前の場合）

---

## 📝 チェックリスト

- [ ] Google Cloud Consoleで正しいClient IDを確認した
- [ ] Vercelの環境変数を修正した（GOOGLE_CLIENT_ID、GMAIL_CLIENT_ID、GOOGLE_CALENDAR_CLIENT_ID）
- [ ] Google Cloud ConsoleでリダイレクトURIを設定した
- [ ] 再デプロイを実行した
- [ ] サイトにアクセスして動作確認した
- [ ] ログイン機能をテストした
- [ ] コンソールエラーがないことを確認した

---

## 🎯 次のステップ

すべてのチェック項目が完了したら、`POST_DEPLOYMENT_CHECKLIST.md`の残りの項目を進めてください。

