# TASK-26: 文字起こしジョブワーカー実装

## 実装完了日
2025年12月13日

## 概要
通話録音の文字起こし処理をバックグラウンドで実行するジョブワーカーを実装しました。Bull キューシステムを使用して、非同期で文字起こしジョブを処理します。

## 実装内容

### 1. 文字起こしジョブワーカー (`backend/src/jobs/transcriptionWorker.ts`)

#### 主な機能
- **ジョブキュー管理**: Bull を使用した Redis ベースのジョブキュー
- **文字起こし処理**: Amazon Transcribe との統合
- **ステータス監視**: ジョブの進行状況をリアルタイムで追跡
- **自動リトライ**: 失敗時に最大3回まで自動リトライ（指数バックオフ）
- **感情分析トリガー**: 文字起こし完了後に自動的に感情分析を実行
- **エラーハンドリング**: 包括的なエラー処理とログ記録

#### ジョブ処理フロー
```
1. ジョブをキューから取得
   ↓
2. Amazon Transcribe で文字起こしジョブを開始
   ↓
3. ジョブステータスをポーリング（10秒間隔、最大30分）
   ↓
4. 完了したら結果を取得
   ↓
5. データベースに保存
   ↓
6. 感情分析ジョブをトリガー（非ブロッキング）
   ↓
7. ジョブ完了
```

#### 設定
```typescript
{
  attempts: 3,              // 最大リトライ回数
  backoff: {
    type: 'exponential',
    delay: 60000,           // 初回リトライまで1分
  },
  removeOnComplete: 100,    // 完了ジョブを100件まで保持
  removeOnFail: 500,        // 失敗ジョブを500件まで保持
}
```

### 2. PhoneService 統合

通話終了時に自動的に文字起こしジョブをキューに追加するように `PhoneService.endCall()` を更新しました。

```typescript
// 録音ファイルが存在する場合、文字起こしジョブをキューに追加
if (recording && recording.s3_bucket && recording.s3_key) {
  await addTranscriptionJob(
    callLogId,
    recording.s3_bucket,
    recording.s3_key,
    'ja-JP'
  );
}
```

### 3. API エンドポイント

#### POST /api/calls/:callId/transcription/start
文字起こしジョブを手動で開始

**リクエスト:**
```
POST /api/calls/abc-123/transcription/start
Authorization: Bearer <token>
```

**レスポンス:**
```json
{
  "success": true,
  "data": {
    "jobId": "transcription-abc-123-1702456789000",
    "callLogId": "abc-123",
    "status": "queued",
    "message": "Transcription job added to queue"
  }
}
```

#### GET /api/calls/jobs/:jobId/status
ジョブのステータスを取得

**レスポンス:**
```json
{
  "success": true,
  "data": {
    "state": "active",
    "progress": 45,
    "result": null,
    "error": null
  }
}
```

**ステータス:**
- `waiting`: キューで待機中
- `active`: 処理中
- `completed`: 完了
- `failed`: 失敗
- `delayed`: 遅延中（リトライ待ち）

#### POST /api/calls/jobs/:jobId/retry
失敗したジョブを再試行

**レスポンス:**
```json
{
  "success": true,
  "data": {
    "jobId": "transcription-abc-123-1702456789000",
    "message": "Job retry initiated"
  }
}
```

#### GET /api/calls/jobs/stats
キューの統計情報を取得

**レスポンス:**
```json
{
  "success": true,
  "data": {
    "waiting": 5,
    "active": 2,
    "completed": 150,
    "failed": 3,
    "delayed": 1,
    "paused": 0
  }
}
```

### 4. ワーカープロセス (`backend/src/workers/transcription.ts`)

メインAPIサーバーとは別のプロセスとして実行できるスタンドアロンワーカー。

#### 起動方法

**開発環境:**
```bash
npm run worker:transcription:dev
```

**本番環境:**
```bash
npm run worker:transcription
```

#### 出力例
```
============================================================
Transcription Worker Process
============================================================
Environment: development
Redis URL: redis://localhost:6379
AWS Region: ap-northeast-1
AWS Mock Mode: auto-detect
============================================================
Worker is now listening for transcription jobs...
Press Ctrl+C to stop
============================================================
```

## 技術スタック

### 依存関係
- **Bull**: ジョブキューシステム
- **Redis**: キューのバックエンドストレージ
- **Amazon Transcribe**: 音声文字起こしサービス
- **Supabase**: データベース

### 新規インストールパッケージ
```bash
npm install bull @types/bull --save
```

## 環境変数

```env
# Redis設定
REDIS_URL=redis://localhost:6379

# AWS設定
AWS_REGION=ap-northeast-1
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key

# モックモード（開発用）
USE_AWS_MOCK=true
```

## デプロイメント

### 本番環境での推奨構成

#### オプション1: 単一サーバー
APIサーバーと同じサーバーでワーカーを実行
```bash
# ターミナル1: APIサーバー
npm run dev

# ターミナル2: ワーカー
npm run worker:transcription
```

#### オプション2: 専用ワーカーサーバー
スケーラビリティのために専用サーバーでワーカーを実行
```bash
# ワーカーサーバー
npm run worker:transcription
```

複数のワーカーインスタンスを起動して並列処理も可能：
```bash
# ワーカー1
npm run worker:transcription

# ワーカー2
npm run worker:transcription

# ワーカー3
npm run worker:transcription
```

### プロセス管理

#### PM2 を使用した管理
```bash
# インストール
npm install -g pm2

# ワーカー起動
pm2 start npm --name "transcription-worker" -- run worker:transcription

# ステータス確認
pm2 status

# ログ確認
pm2 logs transcription-worker

# 再起動
pm2 restart transcription-worker

# 停止
pm2 stop transcription-worker
```

#### systemd を使用した管理（Linux）
```ini
# /etc/systemd/system/transcription-worker.service
[Unit]
Description=Transcription Worker
After=network.target redis.service

[Service]
Type=simple
User=nodejs
WorkingDirectory=/path/to/backend
ExecStart=/usr/bin/npm run worker:transcription
Restart=always
RestartSec=10
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

```bash
# サービス有効化
sudo systemctl enable transcription-worker

# サービス起動
sudo systemctl start transcription-worker

# ステータス確認
sudo systemctl status transcription-worker
```

## モニタリング

### ログ出力
ワーカーは詳細なログを出力します：

```
[TranscriptionWorker] Processing job 123 for call log abc-123
[TranscriptionWorker] Starting transcription for call log abc-123
[TranscriptionWorker] Polling for transcription job transcribe-job-456
[TranscriptionWorker] Job transcribe-job-456 status: IN_PROGRESS
[TranscriptionWorker] Retrieving transcription results for job transcribe-job-456
[TranscriptionWorker] Saving transcription to database for call log abc-123
[TranscriptionWorker] Triggering sentiment analysis for transcription xyz-789
[TranscriptionWorker] Successfully completed job 123 for call log abc-123
```

### メトリクス監視
Bull Board を使用してジョブキューを可視化（オプション）：

```bash
npm install @bull-board/express --save
```

```typescript
// backend/src/index.ts に追加
import { createBullBoard } from '@bull-board/api';
import { BullAdapter } from '@bull-board/api/bullAdapter';
import { ExpressAdapter } from '@bull-board/express';
import { transcriptionQueue } from './jobs/transcriptionWorker';

const serverAdapter = new ExpressAdapter();
createBullBoard({
  queues: [new BullAdapter(transcriptionQueue)],
  serverAdapter,
});

serverAdapter.setBasePath('/admin/queues');
app.use('/admin/queues', serverAdapter.getRouter());
```

アクセス: `http://localhost:3000/admin/queues`

## トラブルシューティング

### 問題: ワーカーが起動しない
**原因**: Redis に接続できない
**解決策**:
1. Redis が起動しているか確認: `redis-cli ping`
2. REDIS_URL が正しいか確認
3. ファイアウォール設定を確認

### 問題: ジョブが処理されない
**原因**: ワーカープロセスが起動していない
**解決策**:
1. ワーカープロセスを起動: `npm run worker:transcription`
2. プロセスが実行中か確認: `ps aux | grep transcription`

### 問題: 文字起こしが失敗する
**原因**: AWS 認証情報が不正、または録音ファイルが存在しない
**解決策**:
1. AWS 認証情報を確認
2. S3 バケットとキーが正しいか確認
3. ジョブログを確認: `GET /api/calls/jobs/:jobId/status`
4. 手動でリトライ: `POST /api/calls/jobs/:jobId/retry`

### 問題: ジョブがスタックする
**原因**: Amazon Transcribe のタイムアウト
**解決策**:
1. ジョブは30分でタイムアウトします
2. 失敗したジョブは自動的にリトライされます
3. 手動でリトライ可能

## パフォーマンス最適化

### 並列処理
複数のワーカーインスタンスを起動して並列処理を実現：

```bash
# 3つのワーカーを起動
pm2 start npm --name "worker-1" -i 1 -- run worker:transcription
pm2 start npm --name "worker-2" -i 1 -- run worker:transcription
pm2 start npm --name "worker-3" -i 1 -- run worker:transcription
```

### リソース管理
- **CPU**: 文字起こし処理は CPU 集約的ではない（AWS 側で処理）
- **メモリ**: ワーカーあたり約 100-200MB
- **ネットワーク**: ポーリング時に定期的な API 呼び出し

### スケーリング戦略
1. **垂直スケーリング**: より強力なサーバーを使用
2. **水平スケーリング**: 複数のワーカーインスタンスを追加
3. **Redis クラスタリング**: 大規模な場合は Redis クラスタを使用

## テスト

### 手動テスト

#### 1. ジョブを手動で追加
```bash
curl -X POST http://localhost:3000/api/calls/abc-123/transcription/start \
  -H "Authorization: Bearer <token>"
```

#### 2. ジョブステータスを確認
```bash
curl http://localhost:3000/api/calls/jobs/transcription-abc-123-1702456789000/status \
  -H "Authorization: Bearer <token>"
```

#### 3. キュー統計を確認
```bash
curl http://localhost:3000/api/calls/jobs/stats \
  -H "Authorization: Bearer <token>"
```

### 自動テスト（未実装）
- ユニットテスト: ジョブ処理ロジックのテスト
- 統合テスト: AWS Transcribe モックとの統合テスト
- E2Eテスト: 完全な文字起こしパイプラインのテスト

## 次のステップ

### TASK-27: 感情分析ジョブワーカー実装
文字起こし完了後の感情分析処理を専用のワーカーで実行

### TASK-28: 録音ファイルクリーンアップジョブ実装
古い録音ファイルを定期的にアーカイブ・削除

### 改善案
1. **リアルタイム通知**: WebSocket で文字起こし完了を通知
2. **優先度キュー**: 重要な通話を優先的に処理
3. **バッチ処理**: 複数の録音を一度に処理
4. **カスタム語彙**: 不動産用語の認識精度向上

## 関連ドキュメント
- [タスクリスト](./tasks.md)
- [設計ドキュメント](./design.md)
- [統合サマリー](./INTEGRATION-SUMMARY.md)
- [開発者クイックスタート](./DEVELOPER-QUICK-START.md)

## 変更履歴
- 2025-12-13: 初版作成、TASK-26 完了
