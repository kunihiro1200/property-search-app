# 本番環境デプロイガイド

スプレッドシート同期機能を本番環境にデプロイする手順を説明します。

## 目次

1. [デプロイ前の準備](#デプロイ前の準備)
2. [環境変数の設定](#環境変数の設定)
3. [データベースマイグレーション](#データベースマイグレーション)
4. [バックエンドのデプロイ](#バックエンドのデプロイ)
5. [フロントエンドのデプロイ](#フロントエンドのデプロイ)
6. [動作確認](#動作確認)
7. [監視とアラート](#監視とアラート)
8. [ロールバック手順](#ロールバック手順)

---

## デプロイ前の準備

### チェックリスト

デプロイ前に以下を確認してください:

- [ ] すべてのテストが通過している
- [ ] ローカル環境で動作確認済み
- [ ] Google Sheets API の本番用サービスアカウントを作成済み
- [ ] 本番用スプレッドシートを準備済み
- [ ] Supabase の本番環境を準備済み
- [ ] バックアップを取得済み
- [ ] デプロイ計画を関係者に共有済み

### バックアップの取得

1. **Supabase データベースのバックアップ**:
   - Supabase ダッシュボードから手動バックアップを作成
   - または、スナップショット機能を使用

2. **スプレッドシートのバックアップ**:
   - Google Sheets でスプレッドシートをコピー
   - バックアップ用のフォルダに保存

3. **コードのバックアップ**:
   - Git でタグを作成
   ```bash
   git tag -a v1.0.0-spreadsheet-sync -m "Spreadsheet sync feature release"
   git push origin v1.0.0-spreadsheet-sync
   ```

---

## 環境変数の設定

### バックエンド環境変数

本番環境の `.env` ファイルを作成します:

```bash
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Google Sheets API
GOOGLE_SHEETS_SPREADSHEET_ID=your-spreadsheet-id
GOOGLE_SHEETS_SHEET_NAME=売主リスト
GOOGLE_SERVICE_ACCOUNT_EMAIL=your-service-account@your-project.iam.gserviceaccount.com
GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# Server
PORT=3001
NODE_ENV=production

# Frontend URL (for CORS)
FRONTEND_URL=https://your-frontend-domain.com

# Optional: Logging
LOG_LEVEL=info
```

**重要**: 
- 本番用のサービスアカウントキーを使用
- 機密情報を Git にコミットしない
- 環境変数管理サービス（AWS Secrets Manager など）の使用を推奨

### フロントエンド環境変数

本番環境の `.env` ファイルを作成します:

```bash
VITE_API_URL=https://your-backend-domain.com/api
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

---

## データベースマイグレーション

### マイグレーションの実行

1. **本番環境に接続**:
   ```bash
   cd backend
   # .env ファイルが本番環境用であることを確認
   cat .env | grep SUPABASE_URL
   ```

2. **マイグレーション 026 を実行**（sync_logs, error_logs テーブル）:
   ```bash
   npx ts-node migrations/run-026-migration.ts
   ```

3. **マイグレーション 027 を実行**（seller_snapshots テーブル）:
   ```bash
   npx ts-node migrations/run-027-migration.ts
   ```

4. **マイグレーション結果を確認**:
   - Supabase ダッシュボードでテーブルが作成されていることを確認
   - インデックスが作成されていることを確認

### マイグレーションの検証

```bash
# テーブルの存在確認
npx ts-node -e "
import { createClient } from '@supabase/supabase-js';
const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
(async () => {
  const { data, error } = await supabase.from('sync_logs').select('*').limit(1);
  console.log('sync_logs:', error ? 'ERROR' : 'OK');
  const { data: data2, error: error2 } = await supabase.from('error_logs').select('*').limit(1);
  console.log('error_logs:', error2 ? 'ERROR' : 'OK');
  const { data: data3, error: error3 } = await supabase.from('seller_snapshots').select('*').limit(1);
  console.log('seller_snapshots:', error3 ? 'ERROR' : 'OK');
})();
"
```

---

## バックエンドのデプロイ

### ビルド

```bash
cd backend
npm install --production
npm run build  # TypeScript をコンパイル（必要に応じて）
```

### デプロイ方法

#### オプション 1: 手動デプロイ

1. **ファイルをサーバーにコピー**:
   ```bash
   scp -r backend/ user@server:/path/to/app/
   ```

2. **サーバーで依存関係をインストール**:
   ```bash
   ssh user@server
   cd /path/to/app/backend
   npm install --production
   ```

3. **環境変数を設定**:
   ```bash
   # .env ファイルを作成
   nano .env
   # 上記の環境変数を設定
   ```

4. **サーバーを起動**:
   ```bash
   # PM2 を使用（推奨）
   npm install -g pm2
   pm2 start src/index.ts --name "seller-backend"
   pm2 save
   pm2 startup
   ```

#### オプション 2: Docker デプロイ

1. **Dockerfile を作成**:
   ```dockerfile
   FROM node:18-alpine
   WORKDIR /app
   COPY package*.json ./
   RUN npm install --production
   COPY . .
   EXPOSE 3001
   CMD ["node", "src/index.js"]
   ```

2. **イメージをビルド**:
   ```bash
   docker build -t seller-backend:latest .
   ```

3. **コンテナを起動**:
   ```bash
   docker run -d \
     --name seller-backend \
     -p 3001:3001 \
     --env-file .env \
     seller-backend:latest
   ```

#### オプション 3: クラウドサービス（Heroku, AWS, GCP など）

各サービスのドキュメントに従ってデプロイしてください。

---

## フロントエンドのデプロイ

### ビルド

```bash
cd frontend
npm install
npm run build
```

ビルド成果物は `dist/` ディレクトリに生成されます。

### デプロイ方法

#### オプション 1: 静的ホスティング（Netlify, Vercel など）

1. **Netlify の場合**:
   ```bash
   npm install -g netlify-cli
   netlify deploy --prod --dir=dist
   ```

2. **Vercel の場合**:
   ```bash
   npm install -g vercel
   vercel --prod
   ```

#### オプション 2: 手動デプロイ

1. **ファイルをサーバーにコピー**:
   ```bash
   scp -r frontend/dist/ user@server:/var/www/html/
   ```

2. **Nginx 設定**:
   ```nginx
   server {
     listen 80;
     server_name your-domain.com;
     root /var/www/html/dist;
     index index.html;
     
     location / {
       try_files $uri $uri/ /index.html;
     }
     
     location /api {
       proxy_pass http://localhost:3001;
       proxy_http_version 1.1;
       proxy_set_header Upgrade $http_upgrade;
       proxy_set_header Connection 'upgrade';
       proxy_set_header Host $host;
       proxy_cache_bypass $http_upgrade;
     }
   }
   ```

3. **Nginx を再起動**:
   ```bash
   sudo systemctl restart nginx
   ```

---

## 動作確認

### 1. 接続テスト

```bash
# バックエンド
curl http://your-backend-domain.com/api/sync/status

# フロントエンド
curl http://your-frontend-domain.com
```

### 2. Google Sheets API 接続テスト

```bash
cd backend
npx ts-node src/scripts/test-sheets-connection.ts
```

期待される出力:
```
✓ Google Sheets API 認証成功
✓ スプレッドシートへのアクセス成功
✓ シート '売主リスト' が見つかりました
```

### 3. 同期テスト

1. **テスト用の売主を作成**:
   - フロントエンドから新しい売主を作成
   - または API 経由で作成

2. **スプレッドシートを確認**:
   - Google Sheets でスプレッドシートを開く
   - 新しい行が追加されていることを確認

3. **同期ログを確認**:
   ```bash
   curl http://your-backend-domain.com/api/sync/history?limit=10
   ```

### 4. エラーハンドリングテスト

1. **無効なデータで売主を作成**:
   - 必須フィールドを空にする
   - 不正な電話番号形式を使用

2. **エラーログを確認**:
   ```bash
   curl http://your-backend-domain.com/api/sync/errors?limit=10
   ```

### 5. パフォーマンステスト

1. **レート制限を確認**:
   ```bash
   curl http://your-backend-domain.com/api/sync/rate-limit
   ```

2. **手動同期を実行**:
   - フロントエンドから差分同期を実行
   - 処理時間を確認

---

## 監視とアラート

### ログ監視

1. **バックエンドログ**:
   ```bash
   # PM2 の場合
   pm2 logs seller-backend
   
   # Docker の場合
   docker logs -f seller-backend
   ```

2. **同期ログ**:
   - フロントエンドの「同期履歴」タブで確認
   - または API 経由で定期的に確認

### アラート設定

以下の条件でアラートを設定することを推奨します:

1. **認証エラー**:
   - 条件: `error_type = 'auth'`
   - 重要度: 高
   - 通知先: システム管理者

2. **同期失敗率が20%を超える**:
   - 条件: `failure_count / total_syncs > 0.2`
   - 重要度: 中
   - 通知先: 開発チーム

3. **レート制限が90%を超える**:
   - 条件: `usage_percentage > 90`
   - 重要度: 中
   - 通知先: 開発チーム

### ヘルスチェック

定期的にヘルスチェックを実行します:

```bash
# cron で5分ごとに実行
*/5 * * * * curl -f http://your-backend-domain.com/api/sync/status || echo "Health check failed"
```

---

## ロールバック手順

デプロイに問題が発生した場合のロールバック手順:

### バックエンドのロールバック

1. **前のバージョンに戻す**:
   ```bash
   # Git タグから復元
   git checkout v1.0.0-previous
   
   # PM2 の場合
   pm2 restart seller-backend
   
   # Docker の場合
   docker stop seller-backend
   docker run -d --name seller-backend seller-backend:previous
   ```

2. **動作確認**:
   ```bash
   curl http://your-backend-domain.com/api/sync/status
   ```

### フロントエンドのロールバック

1. **前のビルドに戻す**:
   ```bash
   # バックアップから復元
   cp -r frontend/dist.backup/* /var/www/html/dist/
   
   # または Netlify/Vercel の場合
   netlify rollback
   vercel rollback
   ```

### データベースのロールバック

1. **スナップショットから復元**:
   ```bash
   curl -X POST http://your-backend-domain.com/api/sync/rollback \
     -H "Content-Type: application/json" \
     -d '{"snapshotId": "SNAPSHOT_ID"}'
   ```

2. **または Supabase バックアップから復元**:
   - Supabase ダッシュボードから復元

---

## デプロイ後のチェックリスト

- [ ] バックエンドが正常に起動している
- [ ] フロントエンドが正常に表示される
- [ ] Google Sheets API 接続が成功する
- [ ] 同期テストが成功する
- [ ] エラーハンドリングが正常に動作する
- [ ] ログ監視が設定されている
- [ ] アラートが設定されている
- [ ] ヘルスチェックが設定されている
- [ ] ドキュメントが最新である
- [ ] 関係者にデプロイ完了を通知した

---

## トラブルシューティング

デプロイ中に問題が発生した場合は、[TROUBLESHOOTING.md](./TROUBLESHOOTING.md) を参照してください。

---

## サポート

デプロイに関する質問や問題:
- システム管理者: [連絡先]
- 開発チーム: [連絡先]
- ドキュメント: [リンク]
