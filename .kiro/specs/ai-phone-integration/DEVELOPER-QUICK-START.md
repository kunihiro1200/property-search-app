# AI電話統合機能 - 開発者クイックスタート

## 🚀 すぐに使える状態

現在、以下の機能が **モック実装** で動作します（AWS 契約不要）:

### ✅ 実装済み機能

1. **発信ボタン（CallButton）**
   - 売主詳細ページから電話をかける
   - 通話ログの自動作成
   
2. **通話履歴表示（PhoneCallLogDisplay）**
   - 通話履歴の一覧表示
   - 文字起こし結果の表示
   - 感情分析結果の表示

3. **バックエンド API**
   - 発信 API: `POST /api/calls/outbound`
   - 通話ログ取得 API: `GET /api/calls`
   - 文字起こし取得 API: `GET /api/calls/:callId/transcription`

## 📦 セットアップ

### 1. 依存関係のインストール

```bash
# フロントエンド
cd frontend
npm install

# バックエンド
cd backend
npm install
```

### 2. 環境変数の設定

**backend/.env**:
```env
# モックモードで動作（AWS 不要）
USE_AWS_MOCK=true

# または AWS 認証情報が未設定の場合、自動的にモックモードになります
# AWS_ACCESS_KEY_ID=
# AWS_SECRET_ACCESS_KEY=
```

### 3. データベースマイグレーション

```bash
cd backend
npm run migrate
```

マイグレーションファイル: `backend/migrations/043_add_phone_integration.sql`

### 4. Redis のインストールと起動

文字起こしジョブワーカーには Redis が必要です。

**Windows:**
```bash
# Chocolatey を使用
choco install redis-64

# Redis を起動
redis-server
```

**Mac:**
```bash
brew install redis
brew services start redis
```

**Linux:**
```bash
sudo apt-get install redis-server
sudo systemctl start redis
```

### 5. 開発サーバーの起動

```bash
# ルートディレクトリから
start-dev.bat

# または個別に起動
cd backend && npm run dev
cd frontend && npm run dev
```

### 6. 文字起こしワーカーの起動（オプション）

文字起こし機能を使用する場合は、別のターミナルでワーカーを起動します：

```bash
cd backend
npm run worker:transcription:dev
```

ワーカーが起動すると以下のように表示されます：
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

## 🎯 使い方

### 発信機能の使用

1. 売主詳細ページを開く: `http://localhost:5173/sellers/:id`
2. 売主情報セクションの電話番号の横に「電話をかける」ボタンが表示される
3. ボタンをクリックすると発信が開始される（モックモード）
4. 通話ログが自動的に作成される

### 通話履歴の確認

1. 売主詳細ページを開く
2. 「AI電話統合 - 通話履歴」セクションが表示される
3. 通話ログをクリックすると詳細が展開される
4. 文字起こし結果と感情分析結果が表示される

## 🔧 開発

### コンポーネントの場所

```
frontend/src/
├── components/
│   ├── CallButton.tsx              # 発信ボタン
│   └── PhoneCallLogDisplay.tsx     # 通話履歴表示
├── services/
│   └── phoneApi.ts                 # Phone API クライアント
├── types/
│   └── phone.ts                    # 型定義
└── pages/
    └── SellerDetailPage.tsx        # 統合先ページ
```

### バックエンドの場所

```
backend/src/
├── routes/
│   └── calls.ts                    # API エンドポイント
├── services/
│   ├── PhoneService.ts             # 電話サービス
│   ├── TranscriptionService.ts     # 文字起こしサービス
│   ├── SentimentAnalysisService.ts # 感情分析サービス
│   ├── CallLogService.ts           # 通話ログサービス
│   └── RecordingService.ts         # 録音サービス
├── services/aws/
│   ├── ConnectClient.ts            # Amazon Connect クライアント
│   ├── TranscribeClient.ts         # Amazon Transcribe クライアント
│   ├── S3Client.ts                 # Amazon S3 クライアント
│   └── ComprehendClient.ts         # Amazon Comprehend クライアント
└── types/
    └── phone.ts                    # 型定義
```

### API エンドポイント

#### 発信
```typescript
POST /api/calls/outbound
Content-Type: application/json

{
  "sellerId": "uuid",
  "phoneNumber": "03-1234-5678",
  "userId": "uuid"
}

Response:
{
  "status": "initiated",
  "callLogId": "uuid",
  "message": "Call initiated successfully"
}
```

#### 通話ログ取得
```typescript
GET /api/calls?sellerId=uuid&page=1&limit=10

Response:
{
  "calls": [
    {
      "id": "uuid",
      "sellerId": "uuid",
      "userId": "uuid",
      "direction": "outbound",
      "callStatus": "completed",
      "startedAt": "2025-12-13T14:30:00Z",
      "endedAt": "2025-12-13T14:35:23Z",
      "durationSeconds": 323,
      "userName": "田中太郎",
      "transcription": {
        "transcriptionStatus": "completed",
        "transcriptionText": "...",
        "sentiment": "positive",
        "sentimentScores": {
          "positive": 0.753,
          "negative": 0.052,
          "neutral": 0.185,
          "mixed": 0.010
        },
        "detectedKeywords": ["訪問希望", "売却検討中"]
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 3,
    "totalPages": 1
  }
}
```

## 🧪 テスト

### 手動テスト

```bash
# 1. 売主を作成
# 2. 売主詳細ページを開く
# 3. 「電話をかける」ボタンをクリック
# 4. 通話履歴セクションで新しいログを確認
```

### API テスト（curl）

```bash
# 発信
curl -X POST http://localhost:3000/api/calls/outbound \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "sellerId": "uuid",
    "phoneNumber": "03-1234-5678",
    "userId": "uuid"
  }'

# 通話ログ取得
curl http://localhost:3000/api/calls?sellerId=uuid \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## 🐛 デバッグ

### ログの確認

**バックエンド**:
```bash
# コンソールログを確認
cd backend
npm run dev

# ログファイル（将来実装予定）
tail -f logs/phone-integration.log
```

**フロントエンド**:
```javascript
// ブラウザのコンソールで確認
console.log('Call started:', callLogId);
```

### よくある問題

#### 問題: CallButton が表示されない
```typescript
// authStore の状態を確認
const { employee } = useAuthStore();
console.log('Employee:', employee);
```

#### 問題: API エラー
```typescript
// ネットワークタブで確認
// レスポンスステータス: 401 → 認証エラー
// レスポンスステータス: 500 → サーバーエラー
```

#### 問題: 通話ログが表示されない
```typescript
// phoneApi.ts でエラーをキャッチ
try {
  const response = await phoneApi.getSellerCallLogs(sellerId);
  console.log('Call logs:', response);
} catch (error) {
  console.error('Error:', error);
}
```

## 📚 参考資料

### ドキュメント
- [タスクリスト](./tasks.md)
- [設計ドキュメント](./design.md)
- [要件定義](./requirements.md)
- [統合サマリー](./INTEGRATION-SUMMARY.md)
- [TASK-24 実装詳細](./TASK-24-IMPLEMENTATION.md)

### 外部リソース
- [Amazon Connect ドキュメント](https://docs.aws.amazon.com/connect/)
- [Amazon Transcribe ドキュメント](https://docs.aws.amazon.com/transcribe/)
- [Amazon Comprehend ドキュメント](https://docs.aws.amazon.com/comprehend/)
- [lucide-react アイコン](https://lucide.dev/)

## 🚧 次のステップ

### 優先度: 高
1. **TASK-26**: 文字起こしジョブワーカー実装
   - 通話録音の自動文字起こし処理
   - Bull キューを使用したバックグラウンド処理

2. **TASK-27**: 感情分析ジョブワーカー実装
   - 文字起こし完了後の自動感情分析
   - キーワード検出と自動アクション

### 優先度: 中
3. **TASK-25**: 設定画面実装
   - AWS 認証情報の管理
   - 接続テスト機能

4. **TASK-21**: AudioPlayerコンポーネント実装
   - 録音ファイルの再生機能
   - 文字起こしとの同期ハイライト

## 💡 ヒント

### モックデータのカスタマイズ

**backend/src/services/PhoneService.ts**:
```typescript
// モックの通話ログをカスタマイズ
const mockCallLog = {
  id: uuidv4(),
  seller_id: sellerId,
  user_id: userId,
  direction: 'outbound',
  call_status: 'completed',
  started_at: new Date(),
  ended_at: new Date(Date.now() + 300000), // 5分後
  duration_seconds: 300,
  // ... カスタマイズ
};
```

### 新しいキーワードの追加

**データベース**:
```sql
INSERT INTO call_keywords (keyword, priority, auto_action)
VALUES ('訪問希望', 1, 'create_followup');
```

### カスタムアクションの追加

**backend/src/services/SentimentAnalysisService.ts**:
```typescript
private async executeAutoAction(
  action: string,
  callLogId: string,
  sellerId: string
): Promise<void> {
  switch (action) {
    case 'create_followup':
      // フォローアップを作成
      break;
    case 'notify_manager':
      // マネージャーに通知
      break;
    case 'custom_action':
      // カスタムアクション
      break;
  }
}
```

## 🤝 貢献

バグ報告や機能リクエストは Issue で受け付けています。

## 📝 ライセンス

プロジェクトのライセンスに従います。


### バックエンドサービスの場所

```
backend/src/
├── services/
│   ├── PhoneService.ts                 # 電話機能の統合サービス
│   ├── TranscriptionService.ts         # 文字起こしサービス
│   ├── SentimentAnalysisService.ts     # 感情分析サービス
│   ├── CallLogService.ts               # 通話ログ管理
│   ├── RecordingService.ts             # 録音ファイル管理
│   └── aws/
│       ├── ConnectClient.ts            # Amazon Connect クライアント
│       ├── TranscribeClient.ts         # Amazon Transcribe クライアント
│       ├── S3Client.ts                 # S3 クライアント
│       └── ComprehendClient.ts         # Amazon Comprehend クライアント
├── jobs/
│   └── transcriptionWorker.ts          # 文字起こしジョブワーカー
├── workers/
│   └── transcription.ts                # ワーカープロセス
├── routes/
│   └── calls.ts                        # Phone API エンドポイント
└── types/
    └── phone.ts                        # 型定義
```

### 文字起こしワーカーの開発

#### ジョブの追加
```typescript
import { addTranscriptionJob } from '../jobs/transcriptionWorker';

// ジョブをキューに追加
const job = await addTranscriptionJob(
  callLogId,
  's3-bucket-name',
  's3-key',
  'ja-JP'
);

console.log(`Job ${job.id} added to queue`);
```

#### ジョブステータスの確認
```typescript
import { getTranscriptionJobStatus } from '../jobs/transcriptionWorker';

const status = await getTranscriptionJobStatus(jobId);
console.log(`Job state: ${status.state}, Progress: ${status.progress}%`);
```

#### キュー統計の取得
```typescript
import { getQueueStats } from '../jobs/transcriptionWorker';

const stats = await getQueueStats();
console.log(`Waiting: ${stats.waiting}, Active: ${stats.active}`);
```

### API エンドポイントのテスト

#### 文字起こしジョブを手動で開始
```bash
curl -X POST http://localhost:3000/api/calls/abc-123/transcription/start \
  -H "Authorization: Bearer <token>"
```

#### ジョブステータスを確認
```bash
curl http://localhost:3000/api/calls/jobs/transcription-abc-123-1702456789000/status \
  -H "Authorization: Bearer <token>"
```

#### キュー統計を確認
```bash
curl http://localhost:3000/api/calls/jobs/stats \
  -H "Authorization: Bearer <token>"
```

## 🧪 テスト

### モックモードでのテスト

モックモードでは、実際の AWS サービスを使用せずに動作をテストできます：

1. **発信テスト**: CallButton をクリックすると、ダミーの通話ログが作成される
2. **文字起こしテスト**: ダミーの文字起こし結果が返される
3. **感情分析テスト**: ダミーの感情分析結果が返される

### 本番モードへの切り替え

実際の AWS サービスを使用する場合：

1. **AWS 認証情報を設定**:
```env
USE_AWS_MOCK=false
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_REGION=ap-northeast-1
```

2. **Amazon Connect を設定**:
```env
AWS_CONNECT_INSTANCE_ID=your_instance_id
AWS_CONNECT_CONTACT_FLOW_ID=your_flow_id
AWS_CONNECT_PHONE_NUMBER=+81-xx-xxxx-xxxx
```

3. **S3 バケットを設定**:
```env
AWS_S3_BUCKET_NAME=your_bucket_name
```

## 📊 モニタリング

### ログの確認

**バックエンドログ**:
```bash
cd backend
npm run dev
# ログがコンソールに出力される
```

**ワーカーログ**:
```bash
cd backend
npm run worker:transcription:dev
# ワーカーのログがコンソールに出力される
```

### Redis の確認

```bash
# Redis CLI に接続
redis-cli

# キューの確認
KEYS bull:transcription-jobs:*

# ジョブ数の確認
LLEN bull:transcription-jobs:waiting
LLEN bull:transcription-jobs:active
```

## 🐛 トラブルシューティング

### 問題: ワーカーが起動しない

**エラー**: `Error: connect ECONNREFUSED 127.0.0.1:6379`

**解決策**: Redis が起動していません
```bash
# Redis を起動
redis-server

# または Windows の場合
redis-server.exe
```

### 問題: 文字起こしジョブが処理されない

**原因**: ワーカープロセスが起動していない

**解決策**:
```bash
cd backend
npm run worker:transcription:dev
```

### 問題: CallButton が表示されない

**原因**: employee 情報が取得できていない

**解決策**: ログイン状態を確認し、authStore の状態を確認

## 📚 関連ドキュメント

- [TASK-26 実装詳細](./TASK-26-IMPLEMENTATION.md) - 文字起こしワーカーの詳細
- [TASK-24 実装詳細](./TASK-24-IMPLEMENTATION.md) - フロントエンド統合の詳細
- [統合サマリー](./INTEGRATION-SUMMARY.md) - 全体の統合状況
- [タスクリスト](./tasks.md) - 全タスクの進捗
- [設計ドキュメント](./design.md) - アーキテクチャ設計

## 🎉 次のステップ

### 実装予定の機能

1. **TASK-27**: 感情分析ジョブワーカー
   - 文字起こし完了後の自動感情分析
   - キーワード検出と自動アクション

2. **TASK-25**: 設定画面
   - AWS 認証情報の管理
   - 接続テスト機能

3. **TASK-21**: AudioPlayer コンポーネント
   - 録音ファイルの再生
   - 文字起こしとの同期ハイライト

### 貢献方法

1. 新しい機能を実装する場合は、tasks.md を確認
2. 実装後は対応するドキュメントを更新
3. テストを追加（未実装の場合）

## 📝 変更履歴

- 2025-12-13: TASK-26 完了、文字起こしワーカー追加
- 2025-12-13: TASK-24 完了、フロントエンド統合
- 2025-12-13: 初版作成
