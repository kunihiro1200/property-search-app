# Vercel環境変数修正手順

## 🚨 現在の状況

- **正しいClient ID**: `248674138906-s1m16db6dl79374h29d6gmdrjtg76v4q.apps.googleusercontent.com`
- **間違ったClient ID**: `111282429644-7j3br7ehkp57mmfforgit7djsnfaog5k.apps.googleusercontent.com`（存在しない）

すべてのドキュメントとVercel環境変数を正しいClient IDに統一する必要があります。

---

## 📋 修正手順

### ステップ1: Google Cloud ConsoleでClient Secretを確認

1. [Google Cloud Console - Credentials](https://console.cloud.google.com/apis/credentials) にアクセス
2. Client ID `248674138906-s1m16db6dl79374h29d6gmdrjtg76v4q.apps.googleusercontent.com` をクリック
3. **Client Secret**の値をコピー（表示されていない場合は、新しいSecretを生成）

---

### ステップ2: Vercel環境変数を修正

#### 2-1. 現在の環境変数を確認

Vercel Dashboard → Settings → Environment Variables で、以下の環境変数を探してください：

**確認が必要な環境変数：**
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GMAIL_CLIENT_ID`
- `GMAIL_CLIENT_SECRET`
- `GOOGLE_CALENDAR_CLIENT_ID`
- `GOOGLE_CALENDAR_CLIENT_SECRET`
- `GOOGLE_REDIRECT_URI`
- `GMAIL_REDIRECT_URI`
- `GOOGLE_CALENDAR_REDIRECT_URI`

#### 2-2. 環境変数を追加・修正

**存在しない場合は追加、存在する場合は値を修正してください：**

```
GOOGLE_CLIENT_ID=248674138906-s1m16db6dl79374h29d6gmdrjtg76v4q.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=【Google Cloud Consoleで確認したSecret】
GOOGLE_REDIRECT_URI=https://baikyaku-property-site3.vercel.app/auth/google/callback

GMAIL_CLIENT_ID=248674138906-s1m16db6dl79374h29d6gmdrjtg76v4q.apps.googleusercontent.com
GMAIL_CLIENT_SECRET=【Google Cloud Consoleで確認したSecret】
GMAIL_REDIRECT_URI=https://baikyaku-property-site3.vercel.app/auth/google/callback

GOOGLE_CALENDAR_CLIENT_ID=248674138906-s1m16db6dl79374h29d6gmdrjtg76v4q.apps.googleusercontent.com
GOOGLE_CALENDAR_CLIENT_SECRET=【Google Cloud Consoleで確認したSecret】
GOOGLE_CALENDAR_REDIRECT_URI=https://baikyaku-property-site3.vercel.app/api/auth/google/calendar/callback
```

**重要**: すべて`Production`環境に設定してください。

---

### ステップ3: Google Cloud ConsoleでリダイレクトURIを設定

1. [Google Cloud Console - Credentials](https://console.cloud.google.com/apis/credentials) にアクセス
2. Client ID `248674138906-s1m16db6dl79374h29d6gmdrjtg76v4q.apps.googleusercontent.com` をクリック
3. **承認済みのリダイレクトURI**セクションで、以下のURIを追加：

```
https://baikyaku-property-site3.vercel.app/auth/google/callback
https://baikyaku-property-site3.vercel.app/api/auth/google/calendar/callback
```

4. **保存**をクリック

---

### ステップ4: ローカル環境変数も修正

ローカルの`.env`ファイルも修正しておきましょう：

**ファイル**: `backend/.env`

以下の行を修正：

```env
GOOGLE_CLIENT_ID=248674138906-s1m16db6dl79374h29d6gmdrjtg76v4q.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=【Google Cloud Consoleで確認したSecret】

GMAIL_CLIENT_ID=248674138906-s1m16db6dl79374h29d6gmdrjtg76v4q.apps.googleusercontent.com
GMAIL_CLIENT_SECRET=【Google Cloud Consoleで確認したSecret】

GOOGLE_CALENDAR_CLIENT_ID=248674138906-s1m16db6dl79374h29d6gmdrjtg76v4q.apps.googleusercontent.com
GOOGLE_CALENDAR_CLIENT_SECRET=【Google Cloud Consoleで確認したSecret】
```

**注意**: ローカル環境のリダイレクトURIは`http://localhost:3000`のままでOKです。

---

### ステップ5: ドキュメントを修正

`VERCEL_ENV_VARIABLES.md`ファイルも修正しておきます。

---

### ステップ6: 再デプロイ

1. Vercel Dashboard → **Deployments**タブ
2. 最新デプロイの**"..."**メニュー → **Redeploy**
3. デプロイが完了するまで待つ（5-10分）

---

## ✅ チェックリスト

- [ ] Google Cloud ConsoleでClient Secretを確認した
- [ ] Vercelの環境変数を追加・修正した（6つの環境変数）
- [ ] Google Cloud ConsoleでリダイレクトURIを設定した
- [ ] ローカルの`.env`ファイルを修正した
- [ ] 再デプロイを実行した
- [ ] デプロイが成功したことを確認した

---

## 🚨 トラブルシューティング

### デプロイが失敗する場合

1. Vercel Dashboard → Deployments → 最新デプロイをクリック
2. **Build Logs**を確認
3. エラーメッセージをコピーして確認

### 環境変数が反映されない場合

1. 環境変数を追加・修正した後、必ず**再デプロイ**が必要
2. 環境変数の**Environment**が`Production`になっているか確認

---

## 🎯 次のステップ

すべての修正が完了したら、`POST_DEPLOYMENT_CHECKLIST.md`の動作確認に進んでください。

