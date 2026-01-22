# Design Document - AI電話統合機能

## 1. システムアーキテクチャ

### 1.1 全体構成図

```
┌─────────────────────────────────────────────────────────────┐
│                     売主管理システム                          │
│  ┌──────────────┐         ┌──────────────┐                  │
│  │   Frontend   │◄────────┤   Backend    │                  │
│  │   (React)    │         │  (Node.js)   │                  │
│  └──────────────┘         └──────┬───────┘                  │
│                                   │                          │
└───────────────────────────────────┼──────────────────────────┘
                                    │
                    ┌───────────────┴───────────────┐
                    │    AWS SDK Integration        │
                    └───────────────┬───────────────┘
                                    │
        ┌───────────────────────────┼───────────────────────────┐
        │                           │                           │
        ▼                           ▼                           ▼
┌──────────────┐          ┌──────────────┐          ┌──────────────┐
│   Amazon     │          │   Amazon     │          │   Amazon     │
│   Connect    │─────────▶│  Transcribe  │          │      S3      │
│              │          │              │          │              │
└──────────────┘          └──────────────┘          └──────────────┘
        │                           │                           │
        │                           │                           │
        ▼                           ▼                           ▼
┌──────────────┐          ┌──────────────┐          ┌──────────────┐
│  電話回線     │          │   Amazon     │          │  録音ファイル  │
│  (発信/着信)  │          │  Comprehend  │          │   保存領域    │
└──────────────┘          └──────────────┘          └──────────────┘
```

### 1.2 コンポーネント構成

#### フロントエンド層
- **CallButton Component**: 発信ボタンUI
- **CallHistory Component**: 通話履歴表示
- **CallLog Component**: 通話詳細・文字起こし表示
- **CallStatistics Component**: 統計情報ダッシュボード
- **AudioPlayer Component**: 録音再生プレーヤー

#### バックエンド層
- **PhoneService**: 電話機能の統合サービス
- **TranscriptionService**: 文字起こし処理サービス
- **CallLogService**: 通話ログ管理サービス
- **SentimentAnalysisService**: 感情分析サービス
- **AWSConnectClient**: Amazon Connect APIクライアント
- **AWSTranscribeClient**: Amazon Transcribe APIクライアント
- **AWSS3Client**: S3ストレージクライアント

#### データベース層
- **call_logs**: 通話ログテーブル
- **call_transcriptions**: 文字起こしテーブル
- **call_recordings**: 録音ファイル参照テーブル

## 2. データモデル設計

### 2.1 データベーススキーマ

#### call_logs テーブル
```sql
CREATE TABLE call_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  seller_id UUID NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
  user_id UUID REFERENCES employees(id),
  
  -- 通話情報
  direction VARCHAR(10) NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  phone_number VARCHAR(20) NOT NULL,
  call_status VARCHAR(20) NOT NULL CHECK (call_status IN ('completed', 'missed', 'failed', 'busy')),
  
  -- タイミング情報
  started_at TIMESTAMP WITH TIME ZONE NOT NULL,
  ended_at TIMESTAMP WITH TIME ZONE,
  duration_seconds INTEGER,
  
  -- AWS Connect情報
  contact_id VARCHAR(255) UNIQUE,
  instance_id VARCHAR(255),
  queue_id VARCHAR(255),
  agent_id VARCHAR(255),
  
  -- メタデータ
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  INDEX idx_call_logs_seller_id (seller_id),
  INDEX idx_call_logs_user_id (user_id),
  INDEX idx_call_logs_started_at (started_at),
  INDEX idx_call_logs_contact_id (contact_id)
);
```

#### call_transcriptions テーブル
```sql
CREATE TABLE call_transcriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  call_log_id UUID NOT NULL REFERENCES call_logs(id) ON DELETE CASCADE,
  
  -- 文字起こし内容
  transcription_text TEXT NOT NULL,
  transcription_json JSONB, -- 詳細な文字起こしデータ（話者識別、タイムスタンプ等）
  language_code VARCHAR(10) DEFAULT 'ja-JP',
  confidence_score DECIMAL(5,4),
  
  -- 処理情報
  transcription_status VARCHAR(20) NOT NULL CHECK (transcription_status IN ('pending', 'processing', 'completed', 'failed')),
  transcription_job_id VARCHAR(255),
  
  -- 感情分析結果
  sentiment VARCHAR(20) CHECK (sentiment IN ('positive', 'neutral', 'negative', 'mixed')),
  sentiment_scores JSONB, -- {positive: 0.8, neutral: 0.1, negative: 0.1}
  
  -- キーワード検出
  detected_keywords JSONB, -- ["査定", "専任媒介", "価格"]
  
  -- タイムスタンプ
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  INDEX idx_call_transcriptions_call_log_id (call_log_id),
  INDEX idx_call_transcriptions_status (transcription_status)
);
```

#### call_recordings テーブル
```sql
CREATE TABLE call_recordings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  call_log_id UUID NOT NULL REFERENCES call_logs(id) ON DELETE CASCADE,
  
  -- S3ストレージ情報
  s3_bucket VARCHAR(255) NOT NULL,
  s3_key VARCHAR(500) NOT NULL,
  s3_region VARCHAR(50) NOT NULL,
  
  -- ファイル情報
  file_size_bytes BIGINT,
  duration_seconds INTEGER,
  format VARCHAR(20), -- 'wav', 'mp3', etc.
  
  -- アクセス管理
  presigned_url TEXT,
  presigned_url_expires_at TIMESTAMP WITH TIME ZONE,
  access_count INTEGER DEFAULT 0,
  last_accessed_at TIMESTAMP WITH TIME ZONE,
  
  -- タイムスタンプ
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  INDEX idx_call_recordings_call_log_id (call_log_id),
  UNIQUE (s3_bucket, s3_key)
);
```

#### call_keywords テーブル（キーワード検出ルール）
```sql
CREATE TABLE call_keywords (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  keyword VARCHAR(100) NOT NULL,
  category VARCHAR(50), -- 'urgency', 'interest', 'objection', etc.
  priority INTEGER DEFAULT 0,
  auto_action VARCHAR(50), -- 'create_followup', 'notify_manager', etc.
  is_active BOOLEAN DEFAULT true,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE (keyword)
);
```

### 2.2 Activity Logとの統合

通話ログは既存の`activity_logs`テーブルにも記録されます：

```sql
-- activity_logsテーブルに新しいactivity_typeを追加
-- activity_type = 'phone_call'

INSERT INTO activity_logs (
  seller_id,
  user_id,
  activity_type,
  description,
  metadata,
  created_at
) VALUES (
  :seller_id,
  :user_id,
  'phone_call',
  :formatted_transcription,
  jsonb_build_object(
    'call_log_id', :call_log_id,
    'direction', :direction,
    'duration_seconds', :duration_seconds,
    'sentiment', :sentiment,
    'keywords', :detected_keywords
  ),
  :started_at
);
```

## 3. API設計

### 3.1 エンドポイント一覧

#### 発信関連
```
POST   /api/calls/outbound          - 発信を開始
GET    /api/calls/:callId           - 通話詳細取得
POST   /api/calls/:callId/end       - 通話を終了
```

#### 着信関連
```
POST   /api/calls/inbound/webhook   - Amazon Connectからのwebhook
POST   /api/calls/inbound/match     - 着信番号とseller照合
```

#### 通話ログ関連
```
GET    /api/calls                   - 通話ログ一覧取得
GET    /api/calls/:callId/transcription - 文字起こし取得
GET    /api/calls/:callId/recording - 録音ファイルURL取得
GET    /api/calls/statistics        - 統計情報取得
```

#### 設定関連
```
GET    /api/calls/config            - AWS設定取得
PUT    /api/calls/config            - AWS設定更新
POST   /api/calls/config/test       - 接続テスト
```

### 3.2 API詳細仕様

#### POST /api/calls/outbound
発信を開始する

**Request:**
```json
{
  "sellerId": "uuid",
  "phoneNumber": "+81-90-1234-5678",
  "userId": "uuid"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "callLogId": "uuid",
    "contactId": "amazon-connect-contact-id",
    "status": "initiated",
    "startedAt": "2025-12-13T10:00:00Z"
  }
}
```

#### POST /api/calls/inbound/webhook
Amazon Connectからの着信通知を受信

**Request:**
```json
{
  "contactId": "amazon-connect-contact-id",
  "phoneNumber": "+81-90-1234-5678",
  "timestamp": "2025-12-13T10:00:00Z",
  "eventType": "call_started" // or "call_ended"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "callLogId": "uuid",
    "sellerId": "uuid",
    "matched": true
  }
}
```

#### GET /api/calls/:callId/transcription
文字起こしテキストを取得

**Response:**
```json
{
  "success": true,
  "data": {
    "callLogId": "uuid",
    "transcriptionText": "こんにちは、査定のご依頼ありがとうございます...",
    "transcriptionJson": {
      "segments": [
        {
          "speaker": "agent",
          "text": "こんにちは、査定のご依頼ありがとうございます",
          "startTime": 0.0,
          "endTime": 3.5,
          "confidence": 0.98
        },
        {
          "speaker": "customer",
          "text": "はい、よろしくお願いします",
          "startTime": 3.8,
          "endTime": 5.2,
          "confidence": 0.95
        }
      ]
    },
    "sentiment": "positive",
    "sentimentScores": {
      "positive": 0.85,
      "neutral": 0.10,
      "negative": 0.05
    },
    "detectedKeywords": ["査定", "専任媒介"],
    "status": "completed"
  }
}
```

#### GET /api/calls/:callId/recording
録音ファイルの再生用URLを取得

**Response:**
```json
{
  "success": true,
  "data": {
    "recordingUrl": "https://s3.amazonaws.com/...",
    "expiresAt": "2025-12-13T11:00:00Z",
    "durationSeconds": 300,
    "format": "wav"
  }
}
```

#### GET /api/calls/statistics
通話統計情報を取得

**Query Parameters:**
- `startDate`: 開始日（ISO 8601形式）
- `endDate`: 終了日
- `userId`: ユーザーIDでフィルタ（オプション）
- `direction`: 'inbound' or 'outbound'（オプション）

**Response:**
```json
{
  "success": true,
  "data": {
    "totalCalls": 150,
    "inboundCalls": 80,
    "outboundCalls": 70,
    "averageDurationSeconds": 245,
    "totalDurationSeconds": 36750,
    "callsByStatus": {
      "completed": 140,
      "missed": 5,
      "failed": 3,
      "busy": 2
    },
    "callsByUser": [
      {
        "userId": "uuid",
        "userName": "山田太郎",
        "callCount": 45,
        "averageDuration": 280
      }
    ],
    "sentimentDistribution": {
      "positive": 85,
      "neutral": 50,
      "negative": 15
    }
  }
}
```

## 4. AWS統合設計

### 4.1 Amazon Connect統合

#### 発信フロー
1. ユーザーがフロントエンドで発信ボタンをクリック
2. バックエンドが`StartOutboundVoiceContact` APIを呼び出し
3. Amazon Connectが通話を確立
4. 通話開始時にwebhookでバックエンドに通知
5. 通話終了時にwebhookでバックエンドに通知
6. バックエンドが通話ログを作成

#### 着信フロー
1. 売主が指定番号に電話
2. Amazon Connectがコンタクトフローを実行
3. Lambda関数（またはwebhook）でバックエンドに通知
4. バックエンドが電話番号でseller検索
5. マッチした場合、seller情報をAmazon Connectに返す
6. 通話終了後、ログを保存

#### 必要なAWS SDK操作
```typescript
// Amazon Connect Client
import { ConnectClient, StartOutboundVoiceContactCommand } from "@aws-sdk/client-connect";

// 発信
const command = new StartOutboundVoiceContactCommand({
  InstanceId: process.env.AMAZON_CONNECT_INSTANCE_ID,
  ContactFlowId: process.env.AMAZON_CONNECT_CONTACT_FLOW_ID,
  DestinationPhoneNumber: "+81-90-1234-5678",
  SourcePhoneNumber: process.env.AMAZON_CONNECT_PHONE_NUMBER,
  Attributes: {
    sellerId: "uuid",
    userId: "uuid"
  }
});

const response = await connectClient.send(command);
```

### 4.2 Amazon Transcribe統合

#### 文字起こしフロー
1. 通話終了後、録音ファイルがS3に保存される
2. バックエンドが`StartTranscriptionJob` APIを呼び出し
3. Amazon Transcribeが非同期で文字起こし処理
4. 完了時にS3にJSON結果を出力
5. バックエンドがポーリングまたはEventBridgeで完了を検知
6. 結果を取得してデータベースに保存

#### 必要なAWS SDK操作
```typescript
// Amazon Transcribe Client
import { TranscribeClient, StartTranscriptionJobCommand } from "@aws-sdk/client-transcribe";

const command = new StartTranscriptionJobCommand({
  TranscriptionJobName: `call-${callLogId}-${Date.now()}`,
  LanguageCode: "ja-JP",
  MediaFormat: "wav",
  Media: {
    MediaFileUri: `s3://${bucket}/${key}`
  },
  OutputBucketName: process.env.S3_RECORDINGS_BUCKET,
  Settings: {
    ShowSpeakerLabels: true,
    MaxSpeakerLabels: 2,
    VocabularyName: process.env.TRANSCRIBE_CUSTOM_VOCABULARY
  }
});

const response = await transcribeClient.send(command);
```

### 4.3 Amazon Comprehend統合

#### 感情分析フロー
1. 文字起こし完了後、テキストを取得
2. `DetectSentiment` APIを呼び出し
3. 感情スコアを取得してデータベースに保存

#### 必要なAWS SDK操作
```typescript
// Amazon Comprehend Client
import { ComprehendClient, DetectSentimentCommand } from "@aws-sdk/client-comprehend";

const command = new DetectSentimentCommand({
  Text: transcriptionText,
  LanguageCode: "ja"
});

const response = await comprehendClient.send(command);
// response.Sentiment: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL' | 'MIXED'
// response.SentimentScore: { Positive: 0.85, Negative: 0.05, ... }
```

### 4.4 Amazon S3統合

#### 録音ファイル管理
1. Amazon Connectが自動的にS3に録音を保存
2. バックエンドがファイル情報をデータベースに記録
3. ユーザーが再生リクエスト時、presigned URLを生成
4. フロントエンドがpresigned URLで直接S3から再生

#### 必要なAWS SDK操作
```typescript
// S3 Client
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// Presigned URL生成（1時間有効）
const command = new GetObjectCommand({
  Bucket: process.env.S3_RECORDINGS_BUCKET,
  Key: recordingKey
});

const presignedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
```

## 5. セキュリティ設計

### 5.1 認証・認可
- AWS認証情報は環境変数で管理、暗号化して保存
- IAMロールベースのアクセス制御
- APIエンドポイントは既存の認証ミドルウェアで保護
- 録音ファイルアクセスは権限チェック必須

### 5.2 データ保護
- 通話録音はS3で暗号化保存（SSE-S3またはSSE-KMS）
- 文字起こしテキストはデータベースで暗号化
- Presigned URLは短時間（1時間）で期限切れ
- 個人情報を含む通話ログは適切な保持期間後に削除

### 5.3 監査ログ
- すべての通話アクセスを記録
- 録音再生時のアクセスログ
- AWS CloudTrailでAPI呼び出しを監視

## 6. エラーハンドリング設計

### 6.1 エラーカテゴリ

#### AWS接続エラー
- 認証失敗
- サービス利用不可
- レート制限超過

#### 通話エラー
- 電話番号無効
- 通話確立失敗
- 通話中断

#### 文字起こしエラー
- 音声品質不良
- 処理タイムアウト
- 言語認識失敗

### 6.2 エラーハンドリング戦略

```typescript
class PhoneServiceError extends Error {
  constructor(
    message: string,
    public code: string,
    public category: 'aws' | 'call' | 'transcription',
    public retryable: boolean = false
  ) {
    super(message);
  }
}

// リトライロジック
async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  backoffMs: number = 1000
): Promise<T> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      if (attempt === maxRetries || !isRetryable(error)) {
        throw error;
      }
      await sleep(backoffMs * Math.pow(2, attempt - 1));
    }
  }
  throw new Error('Max retries exceeded');
}
```

### 6.3 フォールバック処理
- 文字起こし失敗時も録音ファイルは保存
- 感情分析失敗時も通話ログは保存
- 部分的な文字起こしでも保存

## 7. パフォーマンス最適化

### 7.1 非同期処理
- 文字起こしは非同期ジョブで処理
- 感情分析はバックグラウンドで実行
- キューシステム（Bull/Redis）で処理管理

### 7.2 キャッシング
- AWS認証情報のキャッシュ
- Presigned URLのキャッシュ（有効期限内）
- 統計情報のキャッシュ（5分間）

### 7.3 データベース最適化
- 適切なインデックス設定
- 古い通話ログのアーカイブ
- パーティショニング（日付ベース）

## 8. テスト戦略

### 8.1 ユニットテスト
- 各サービスクラスの単体テスト
- AWS SDKのモック化
- エラーハンドリングのテスト

### 8.2 統合テスト
- Amazon Connect Sandboxでの通話テスト
- 文字起こしパイプラインのE2Eテスト
- Webhook受信のテスト

### 8.3 手動テスト
- 実際の電話での発信・着信テスト
- 音声品質の確認
- UI/UXの確認

## 9. モニタリング・ロギング

### 9.1 ログ出力
```typescript
logger.info('Outbound call initiated', {
  callLogId,
  sellerId,
  phoneNumber: maskPhoneNumber(phoneNumber),
  userId
});

logger.error('Transcription failed', {
  callLogId,
  error: error.message,
  transcriptionJobId
});
```

### 9.2 メトリクス
- 通話成功率
- 平均通話時間
- 文字起こし成功率
- API応答時間
- AWS APIエラー率

### 9.3 アラート
- AWS接続失敗時
- 文字起こし失敗率が閾値超過時
- ストレージ容量警告時

## 10. デプロイメント計画

### 10.1 段階的ロールアウト
1. **Phase 1**: AWS環境セットアップ
2. **Phase 2**: バックエンドAPI実装
3. **Phase 3**: フロントエンドUI実装
4. **Phase 4**: 内部テスト
5. **Phase 5**: パイロット運用（限定ユーザー）
6. **Phase 6**: 本番展開

### 10.2 環境変数
```bash
# AWS設定
AWS_REGION=ap-northeast-1
AWS_ACCESS_KEY_ID=xxx
AWS_SECRET_ACCESS_KEY=xxx

# Amazon Connect
AMAZON_CONNECT_INSTANCE_ID=xxx
AMAZON_CONNECT_INSTANCE_ARN=xxx
AMAZON_CONNECT_CONTACT_FLOW_ID=xxx
AMAZON_CONNECT_PHONE_NUMBER=+81-xx-xxxx-xxxx

# S3
S3_RECORDINGS_BUCKET=seller-system-call-recordings

# Transcribe
TRANSCRIBE_CUSTOM_VOCABULARY=real-estate-terms

# Comprehend
ENABLE_SENTIMENT_ANALYSIS=true

# 機能フラグ
ENABLE_PHONE_INTEGRATION=true
ENABLE_INBOUND_CALLS=true
ENABLE_OUTBOUND_CALLS=true
```

## 11. 今後の拡張性

### 11.1 将来的な機能追加
- Amazon Lexによる対話型IVR
- Amazon Pollyによる音声合成（自動応答）
- リアルタイム文字起こし表示
- 通話中のリアルタイムアシスト
- 多言語対応
- ビデオ通話対応

### 11.2 スケーラビリティ
- 複数のAmazon Connectインスタンス対応
- マルチリージョン展開
- 大量通話時の負荷分散

## 12. 参考資料

- [Amazon Connect API Reference](https://docs.aws.amazon.com/connect/latest/APIReference/)
- [Amazon Transcribe Developer Guide](https://docs.aws.amazon.com/transcribe/latest/dg/)
- [Amazon Comprehend Developer Guide](https://docs.aws.amazon.com/comprehend/latest/dg/)
- [AWS SDK for JavaScript v3](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/)
