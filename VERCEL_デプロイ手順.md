# 🚀 Vercelデプロイ完全ガイド

## 📋 前提条件

✅ Vercelアカウント作成済み
✅ GitHubにコードをプッシュ済み
✅ ローカル環境でテスト完了

---

## ステップ1: Vercelにプロジェクトをインポート

### 1.1 Vercelダッシュボードにアクセス

https://vercel.com/kunihiro1200s-projects にアクセス

### 1.2 新しいプロジェクトを追加

1. **「Add New...」** → **「Project」** をクリック
2. **「Import Git Repository」** セクションで **「GitHub」** を選択
3. リポジトリ一覧から **「property-search-app」** を探してクリック
4. **「Import」** をクリック

---

## ステップ2: プロジェクト設定

### 2.1 基本設定

以下の設定を確認・入力してください：

| 項目 | 値 |
|------|-----|
| **Project Name** | `property-search-app` または任意の名前 |
| **Framework Preset** | `Other` を選択 |
| **Root Directory** | `.` (デフォルトのまま) |
| **Build Command** | `cd backend && npm install && npm run build` |
| **Output Directory** | `backend/dist` |
| **Install Command** | `npm install` |

### 2.2 環境変数の設定

**重要**: 本番環境で必要な環境変数を設定します。

「Environment Variables」セクションで以下を追加：

#### 必須の環境変数

```
NODE_ENV=production
PORT=3000

# Supabase
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Google Sheets API
GOOGLE_SERVICE_ACCOUNT_KEY_PATH=./google-service-account.json
GOOGLE_SHEETS_SPREADSHEET_ID=your_spreadsheet_id

# Redis (オプション - Vercelでは使えない場合があります)
REDIS_URL=your_redis_url

# その他の環境変数
# ローカルの .env ファイルから必要なものをコピー
```

#### 環境変数の追加方法

1. 「Environment Variables」セクションで **「Add」** をクリック
2. **Key**: 環境変数名（例: `SUPABASE_URL`）
3. **Value**: 環境変数の値
4. **Environment**: `Production`, `Preview`, `Development` すべてにチェック
5. **「Save」** をクリック
6. すべての環境変数について繰り返す

---

## ステップ3: デプロイ実行

### 3.1 デプロイ開始

1. すべての設定を確認
2. **「Deploy」** ボタンをクリック
3. デプロイが開始されます（通常2-5分）

### 3.2 デプロイ状況の確認

デプロイ中は以下が表示されます：
- ✅ Building
- ✅ Deploying
- ✅ Ready

---

## ステップ4: デプロイ後の確認

### 4.1 デプロイ完了

デプロイが完了すると、以下のURLが表示されます：

```
https://property-search-app-xxxx.vercel.app
```

### 4.2 動作確認

#### ヘルスチェック

ブラウザまたはcurlで確認：

```bash
curl https://your-app-name.vercel.app/health
```

**期待される結果**:
```json
{
  "status": "ok",
  "timestamp": "2026-01-12T..."
}
```

#### APIエンドポイントの確認

お気に入り文言APIをテスト：

```bash
curl https://your-app-name.vercel.app/api/public/properties/{物件ID}/favorite-comment
```

---

## ステップ5: カスタムドメインの設定（オプション）

### 5.1 ドメインの追加

1. Vercelダッシュボードでプロジェクトを開く
2. **「Settings」** → **「Domains」** をクリック
3. **「Add」** をクリック
4. ドメイン名を入力（例: `api.example.com`）
5. DNS設定の指示に従う

---

## 🔧 トラブルシューティング

### エラー: ビルドが失敗する

**原因**: 依存関係のインストールエラー

**解決策**:
1. `backend/package.json` を確認
2. ローカルで `npm install` が成功するか確認
3. Vercelのビルドログを確認

### エラー: 環境変数が読み込まれない

**原因**: 環境変数の設定ミス

**解決策**:
1. Vercel ダッシュボードで **「Settings」** → **「Environment Variables」** を確認
2. すべての必要な環境変数が設定されているか確認
3. 再デプロイ

### エラー: Redisに接続できない

**原因**: VercelはサーバーレスなのでRedis接続が制限される

**解決策**:
1. Upstash Redis（Vercel推奨）を使用
2. または、Redisをオプションにする（既にコードで対応済み）

---

## 📊 デプロイ後のモニタリング

### ログの確認

1. Vercelダッシュボードでプロジェクトを開く
2. **「Deployments」** タブをクリック
3. 最新のデプロイをクリック
4. **「Functions」** タブでログを確認

### パフォーマンスの確認

1. **「Analytics」** タブでパフォーマンスを確認
2. レスポンスタイム、エラー率などを監視

---

## 🎯 次のステップ

デプロイが成功したら：

1. ✅ フロントエンドのAPIエンドポイントを本番URLに更新
2. ✅ 本番環境で動作確認
3. ✅ ユーザーに公開

---

## 📞 サポート

問題が発生した場合：
- Vercelのドキュメント: https://vercel.com/docs
- Vercelのサポート: https://vercel.com/support

---

**作成日**: 2026年1月12日
**最終更新**: 2026年1月12日
