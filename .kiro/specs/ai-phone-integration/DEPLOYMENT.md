# Deployment Guide - AI電話統合機能

## 概要

このガイドでは、AI電話統合機能を本番環境にデプロイする手順を説明します。

## 前提条件

以下が完了していることを確認してください：

- [ ] AWSアカウントのセットアップ完了（[AWS_SETUP_GUIDE.md](./AWS_SETUP_GUIDE.md)参照）
- [ ] Amazon Connectインスタンス作成完了
- [ ] 電話番号取得完了
- [ ] S3バケット作成完了
- [ ] IAMユーザー・認証情報取得完了
- [ ] 本番環境のデータベース（Supabase）準備完了
- [ ] Redisサーバー準備完了（バックグラウンドジョブ用）

## デプロイメント手順

### Phase 1: 環境変数の設定

#### 1.1 バックエンド環境変数

`backend/.env`ファイルに以下の環境変数を追加します：

```bash
# ============================================================================
# AWS Configuration
# ============================================================================
AWS_REGION=ap-northeast-1
AWS_ACCESS_KEY_ID=your-access-key-id
AWS_SECRET_ACCESS_KEY=your-secret-access-key

# ============================================================================
# Amazon Connect Configuration
# ============================================================================
AMAZON_CONNECT_INSTANCE_ID=your-instance-id
AMAZON_CONNECT_INSTANCE_ARN=arn:aws:connect:ap-northeast-1:123456789012:instance/your-instance-id
AMAZON_CONNECT_CONTACT_FLOW_ID=your-contact-flow-id
AMAZON_CONNECT_PHONE_NUMBER=+81-xx-xxxx-xxxx

# ============================================================================
# Amazon S3 Configuration
# ============================================================================
S3_RECORDINGS_BUCKET=seller-system-call-recordings
S3_RECORDINGS_REGION=ap-northeast-1

# ============================================================================
# Amazon Transcribe Configuration
# ============================================================================
TRANSCRIBE_CUSTOM_VOCABULARY=real-estate-terms
TRANSCRIBE_LANGUAGE_CODE=ja-JP

# ============================================================================
# Amazon Comprehend Configuration (Optional)
# ============================================================================
ENABLE_SENTIMENT_ANALYSIS=true

# ============================================================================
# Phone Integration Feature Flags
# ============================================================================
ENABLE_PHONE_INTEGRATION=true
ENABLE_INBOUND_CALLS=true
ENABLE_OUTBOUND_CALLS=true

# ============================================================================
# AWS Mock Mode (Development Only)
# ============================================================================
# 本番環境では必ずfalseに設定
AWS_USE_MOCK=false

```

**重要な注意事項**:
- `AWS_ACCESS_KEY_ID`と`AWS_SECRET_ACCESS_KEY`は絶対に公開しないでください
- `.env`ファイルは`.gitignore`に含まれていることを確認してください
- 本番環境では`AWS_USE_MOCK=false`に設定してください

#### 1.2 環境変数の検証

環境変数が正しく設定されているか確認します：

```bash
cd backend
node -e "
const dotenv = require('dotenv');
dotenv.config();
console.log('AWS_REGION:', process.env.AWS_REGION);
console.log('AMAZON_CONNECT_INSTANCE_ID:', process.env.AMAZON_CONNECT_INSTANCE_ID ? '✓ Set' : '✗ Not set');
console.log('S3_RECORDINGS_BUCKET:', process.env.S3_RECORDINGS_BUCKET ? '✓ Set' : '✗ Not set');
console.log('ENABLE_PHONE_INTEGRATION:', process.env.ENABLE_PHONE_INTEGRATION);
"
```

---

### Phase 2: データベースマイグレーション

#### 2.1 マイグレーションファイルの確認

マイグレーションファイルが存在することを確認：

```bash
ls backend/migrations/043_add_phone_integration.sql
```

#### 2.2 マイグレーションの実行

**オプション1: Supabase Dashboard経由**

1. Supabaseダッシュボードにログイン
2. プロジェクトを選択
3. 「SQL Editor」を開く
4. `backend/migrations/043_add_phone_integration.sql`の内容をコピー＆ペースト
5. 「Run」をクリック
6. エラーがないことを確認

**オプション2: コマンドライン経由**

```bash
cd backend

# マイグレーション実行スクリプトを作成
cat > run-043-migration.ts << 'EOF'
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function runMigration() {
  console.log('Running migration 043_add_phone_integration...');
  
  const migrationPath = path.join(__dirname, 'migrations', '043_add_phone_integration.sql');
  const sql = fs.readFileSync(migrationPath, 'utf8');
  
  const { error } = await supabase.rpc('exec_sql', { sql_query: sql });
  
  if (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
  
  console.log('Migration completed successfully!');
}

runMigration();
EOF

# 実行
npx ts-node run-043-migration.ts
```

#### 2.3 マイグレーション検証

テーブルが正しく作成されたか確認：

```sql
-- Supabase SQL Editorで実行
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('call_logs', 'call_transcriptions', 'call_recordings', 'call_keywords');
```

期待される結果：4つのテーブルが表示される

---

### Phase 3: 依存パッケージのインストール

#### 3.1 バックエンド依存パッケージ

```bash
cd backend

# AWS SDK関連
npm install @aws-sdk/client-connect
npm install @aws-sdk/client-transcribe
npm install @aws-sdk/client-s3
npm install @aws-sdk/client-comprehend
npm install @aws-sdk/s3-request-presigner

# ジョブキュー関連
npm install bull
npm install @types/bull --save-dev

# その他
npm install express-validator
```

#### 3.2 フロントエンド依存パッケージ

```bash
cd frontend

# Chart.js（統計グラフ用）
npm install chart.js react-chartjs-2

# アイコン
npm install lucide-react
```

#### 3.3 依存パッケージの検証

```bash
# バックエンド
cd backend
npm list @aws-sdk/client-connect @aws-sdk/client-transcribe bull

# フロントエンド
cd frontend
npm list chart.js react-chartjs-2 lucide-react
```

---

### Phase 4: ビルドとテスト

#### 4.1 TypeScriptコンパイル

```bash
# バックエンド
cd backend
npm run build

# エラーがないことを確認
echo $?  # 0が返ればOK
```

#### 4.2 ユニットテストの実行

```bash
cd backend
npm test -- --testPathPattern="PhoneService"

# 基本的なテストがパスすることを確認
```

#### 4.3 AWS接続テスト

```bash
cd backend

# AWS接続テストスクリプトを作成
cat > test-aws-connection.ts << 'EOF'
import { getConnectClient } from './src/services/aws/ConnectClient';
import { getTranscribeClient } from './src/services/aws/TranscribeClient';
import { getS3Client } from './src/services/aws/S3Client';
import { getComprehendClient } from './src/services/aws/ComprehendClient';

async function testConnections() {
  console.log('Testing AWS connections...\n');
  
  try {
    const connectClient = getConnectClient();
    const result = await connectClient.testConnection();
    console.log('✓ Amazon Connect:', result ? 'Connected' : 'Failed');
  } catch (error) {
    console.error('✗ Amazon Connect:', error.message);
  }
  
  try {
    const transcribeClient = getTranscribeClient();
    const result = await transcribeClient.testConnection();
    console.log('✓ Amazon Transcribe:', result ? 'Connected' : 'Failed');
  } catch (error) {
    console.error('✗ Amazon Transcribe:', error.message);
  }
  
  try {
    const s3Client = getS3Client();
    const result = await s3Client.testConnection();
    console.log('✓ Amazon S3:', result ? 'Connected' : 'Failed');
  } catch (error) {
    console.error('✗ Amazon S3:', error.message);
  }
  
  try {
    const comprehendClient = getComprehendClient();
    const result = await comprehendClient.testConnection();
    console.log('✓ Amazon Comprehend:', result ? 'Connected' : 'Failed');
  } catch (error) {
    console.error('✗ Amazon Comprehend:', error.message);
  }
}

testConnections();
EOF

# 実行
npx ts-node test-aws-connection.ts
```

すべてのサービスが「Connected」と表示されることを確認してください。

---

### Phase 5: バックグラウンドワーカーの起動

#### 5.1 Redisサーバーの起動確認

```bash
# Redisが起動しているか確認
redis-cli ping
# 「PONG」が返ればOK
```

Redisが起動していない場合：

```bash
# Windows
# Redis for Windowsをインストール後
redis-server

# Linux/Mac
sudo systemctl start redis
# または
redis-server
```

#### 5.2 文字起こしワーカーの起動

```bash
cd backend

# 開発環境
npm run worker:transcription

# 本番環境（PM2使用）
pm2 start src/jobs/transcriptionWorker.ts --name transcription-worker --interpreter ts-node
```

#### 5.3 感情分析ワーカーの起動

```bash
cd backend

# 開発環境
npm run worker:sentiment

# 本番環境（PM2使用）
pm2 start src/jobs/sentimentWorker.ts --name sentiment-worker --interpreter ts-node
```

#### 5.4 ワーカーの動作確認

```bash
# PM2を使用している場合
pm2 list

# ログを確認
pm2 logs transcription-worker
pm2 logs sentiment-worker
```

---

### Phase 6: アプリケーションの起動

#### 6.1 バックエンドの起動

```bash
cd backend

# 開発環境
npm run dev

# 本番環境
npm run build
npm start

# または PM2使用
pm2 start dist/index.js --name seller-system-backend
```

#### 6.2 フロントエンドの起動

```bash
cd frontend

# 開発環境
npm run dev

# 本番環境（ビルド）
npm run build
# ビルドされたファイルをWebサーバー（Nginx等）で配信
```

#### 6.3 ヘルスチェック

```bash
# バックエンドAPIが起動しているか確認
curl http://localhost:3000/health

# 電話統合機能の設定を確認（管理者トークンが必要）
curl -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  http://localhost:3000/api/calls/config
```

---

### Phase 7: 動作確認

#### 7.1 管理画面での設定確認

1. ブラウザで`http://localhost:5173`（または本番URL）にアクセス
2. 管理者アカウントでログイン
3. 「設定」→「電話設定」を開く
4. AWS設定が正しく表示されることを確認
5. 「接続テスト」ボタンをクリック
6. すべてのサービスが「接続成功」と表示されることを確認

#### 7.2 テスト通話の実施

**発信テスト**:
1. 売主詳細ページを開く
2. 「電話をかける」ボタンをクリック
3. 通話が開始されることを確認
4. 通話を終了
5. 通話ログが作成されることを確認

**着信テスト**:
1. 取得した電話番号に電話をかける
2. Amazon Connectのコンタクトフローが実行されることを確認
3. 通話ログが自動的に作成されることを確認

#### 7.3 文字起こしの確認

1. テスト通話を実施
2. 通話終了後、数分待つ
3. 通話履歴ページを開く
4. 文字起こしが表示されることを確認
5. 感情分析結果が表示されることを確認

#### 7.4 録音再生の確認

1. 通話履歴ページを開く
2. 「録音を読み込む」ボタンをクリック
3. 音声プレーヤーが表示されることを確認
4. 再生ボタンをクリック
5. 録音が再生されることを確認

---

## ロールバック手順

問題が発生した場合のロールバック手順：

### データベースロールバック

```sql
-- Supabase SQL Editorで実行
DROP VIEW IF EXISTS call_statistics_daily;
DROP VIEW IF EXISTS call_logs_with_details;
DROP TRIGGER IF EXISTS update_call_keywords_updated_at ON call_keywords;
DROP TRIGGER IF EXISTS update_call_recordings_updated_at ON call_recordings;
DROP TRIGGER IF EXISTS update_call_transcriptions_updated_at ON call_transcriptions;
DROP TRIGGER IF EXISTS update_call_logs_updated_at ON call_logs;
DROP FUNCTION IF EXISTS update_phone_integration_updated_at();
DROP TABLE IF EXISTS call_keywords;
DROP TABLE IF EXISTS call_recordings;
DROP TABLE IF EXISTS call_transcriptions;
DROP TABLE IF EXISTS call_logs;
```

### アプリケーションロールバック

```bash
# 機能フラグを無効化
# backend/.envで以下を設定
ENABLE_PHONE_INTEGRATION=false

# アプリケーションを再起動
pm2 restart seller-system-backend
```

---

## トラブルシューティング

### 問題1: AWS接続エラー

**症状**: 「AWS connection failed」エラーが表示される

**解決策**:
1. 環境変数が正しく設定されているか確認
2. IAMユーザーの権限を確認
3. AWSリージョンが正しいか確認（`ap-northeast-1`推奨）
4. ネットワーク接続を確認

```bash
# AWS CLIで接続テスト
aws sts get-caller-identity --region ap-northeast-1
```

### 問題2: マイグレーションエラー

**症状**: マイグレーション実行時にエラーが発生

**解決策**:
1. Supabaseの接続情報を確認
2. サービスロールキーを使用しているか確認
3. テーブルが既に存在する場合は削除してから再実行

```sql
-- 既存テーブルの確認
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name LIKE 'call_%';
```

### 問題3: 文字起こしが完了しない

**症状**: 通話後、文字起こしが「処理中」のまま

**解決策**:
1. 文字起こしワーカーが起動しているか確認
2. Redisが起動しているか確認
3. S3に録音ファイルが保存されているか確認
4. ジョブキューの状態を確認

```bash
# ワーカーのログを確認
pm2 logs transcription-worker

# ジョブキューの統計を確認
curl http://localhost:3000/api/calls/jobs/stats
```

### 問題4: 録音が再生できない

**症状**: 「録音ファイルが見つかりません」エラー

**解決策**:
1. S3バケットに録音ファイルが存在するか確認
2. IAMユーザーにS3読み取り権限があるか確認
3. Presigned URLの有効期限を確認
4. S3バケット名が正しいか確認

```bash
# S3バケットの内容を確認
aws s3 ls s3://seller-system-call-recordings/ --region ap-northeast-1
```

### 問題5: 通話ログが作成されない

**症状**: 通話後、通話ログが表示されない

**解決策**:
1. データベース接続を確認
2. `call_logs`テーブルが存在するか確認
3. バックエンドのログを確認

```bash
# バックエンドのログを確認
pm2 logs seller-system-backend

# データベースを直接確認
# Supabase SQL Editorで実行
SELECT * FROM call_logs ORDER BY created_at DESC LIMIT 10;
```

---

## パフォーマンス最適化

### データベースインデックスの確認

```sql
-- インデックスが正しく作成されているか確認
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename IN ('call_logs', 'call_transcriptions', 'call_recordings');
```

### Redisメモリ使用量の監視

```bash
# Redisのメモリ使用量を確認
redis-cli info memory
```

### S3ストレージコストの最適化

1. ライフサイクルポリシーが設定されているか確認
2. 古い録音ファイルを定期的にアーカイブ
3. 不要なファイルを削除

```bash
# S3バケットのサイズを確認
aws s3 ls s3://seller-system-call-recordings/ --recursive --summarize
```

---

## セキュリティチェックリスト

デプロイ前に以下を確認してください：

- [ ] `.env`ファイルが`.gitignore`に含まれている
- [ ] AWS認証情報が安全に保管されている
- [ ] S3バケットのパブリックアクセスがブロックされている
- [ ] 録音ファイルが暗号化されている（SSE-S3またはSSE-KMS）
- [ ] Presigned URLの有効期限が適切に設定されている（デフォルト1時間）
- [ ] 管理者権限が必要なエンドポイントに認証チェックがある
- [ ] 本番環境で`AWS_USE_MOCK=false`に設定されている
- [ ] IAMユーザーの権限が最小限に設定されている
- [ ] CloudTrailでAPI呼び出しを監視している

---

## モニタリング

### CloudWatchアラートの設定

1. AWSマネジメントコンソールで「CloudWatch」を開く
2. 「アラーム」→「アラームの作成」
3. 以下のメトリクスにアラートを設定：
   - Amazon Connect: 通話失敗率
   - Amazon Transcribe: ジョブ失敗率
   - S3: ストレージ使用量
   - Lambda（使用している場合）: エラー率

### アプリケーションログの監視

```bash
# PM2を使用している場合
pm2 logs --lines 100

# ログファイルを確認
tail -f backend/logs/app.log
```

---

## 定期メンテナンス

### 週次タスク

- [ ] 通話ログの確認
- [ ] エラーログの確認
- [ ] ストレージ使用量の確認

### 月次タスク

- [ ] AWSコストの確認
- [ ] 古い録音ファイルのアーカイブ
- [ ] パフォーマンスメトリクスの確認
- [ ] セキュリティパッチの適用

### 四半期タスク

- [ ] IAM権限の見直し
- [ ] バックアップの確認
- [ ] ディザスタリカバリ計画の見直し

---

## サポート

デプロイに関する質問や問題がある場合：

1. まず[トラブルシューティング](#トラブルシューティング)セクションを確認
2. [API.md](./API.md)でAPIドキュメントを確認
3. [AWS_SETUP_GUIDE.md](./AWS_SETUP_GUIDE.md)でAWS設定を確認
4. それでも解決しない場合は開発チームに連絡

---

## 参考資料

- [AWS_SETUP_GUIDE.md](./AWS_SETUP_GUIDE.md) - AWSセットアップガイド
- [API.md](./API.md) - APIドキュメント
- [design.md](./design.md) - 設計ドキュメント
- [tasks.md](./tasks.md) - タスク一覧

---

**最終更新**: 2025-12-13  
**ドキュメントバージョン**: 1.0.0
