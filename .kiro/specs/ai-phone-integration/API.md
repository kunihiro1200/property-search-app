# API Documentation - AI電話統合機能

## 概要

このドキュメントでは、AI電話統合機能のAPIエンドポイントについて詳細に説明します。

## 基本情報

- **ベースURL**: `/api/calls`
- **認証**: すべてのエンドポイントで認証が必要（JWTトークン）
- **レスポンス形式**: JSON
- **文字コード**: UTF-8

## 共通レスポンス形式

### 成功レスポンス
```json
{
  "success": true,
  "data": {
    // エンドポイント固有のデータ
  }
}
```

### エラーレスポンス
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "エラーメッセージ",
    "retryable": false,
    "details": [] // バリデーションエラーの場合のみ
  }
}
```

## エラーコード一覧

| コード | 説明 | HTTPステータス | リトライ可能 |
|--------|------|----------------|--------------|
| `VALIDATION_ERROR` | リクエストパラメータが無効 | 400 | No |
| `FORBIDDEN` | 権限不足 | 403 | No |
| `CALL_NOT_FOUND` | 通話ログが見つからない | 404 | No |
| `RECORDING_NOT_FOUND` | 録音ファイルが見つからない | 404 | No |
| `TRANSCRIPTION_NOT_FOUND` | 文字起こしが見つからない | 404 | No |
| `OUTBOUND_CALL_FAILED` | 発信失敗 | 500 | Yes |
| `END_CALL_FAILED` | 通話終了失敗 | 500 | Yes |
| `WEBHOOK_PROCESSING_FAILED` | Webhook処理失敗 | 500 | Yes |
| `GET_CALL_LOGS_FAILED` | 通話ログ取得失敗 | 500 | Yes |
| `GET_TRANSCRIPTION_FAILED` | 文字起こし取得失敗 | 500 | Yes |
| `GET_RECORDING_FAILED` | 録音URL取得失敗 | 500 | Yes |
| `GET_STATISTICS_FAILED` | 統計情報取得失敗 | 500 | Yes |

---

## エンドポイント一覧

### 1. 発信関連

#### 1.1 発信を開始

**エンドポイント**: `POST /api/calls/outbound`

**説明**: 売主への発信を開始します。

**リクエストボディ**:
```json
{
  "sellerId": "uuid",
  "phoneNumber": "+81-90-1234-5678",
  "userId": "uuid" // オプション（省略時は認証ユーザー）
}
```

**バリデーション**:
- `sellerId`: 必須、UUID形式
- `phoneNumber`: 必須、文字列
- `userId`: オプション、UUID形式

**レスポンス例**:
```json
{
  "success": true,
  "data": {
    "callLogId": "550e8400-e29b-41d4-a716-446655440000",
    "contactId": "amazon-connect-contact-id",
    "status": "initiated",
    "startedAt": "2025-12-13T10:00:00Z"
  }
}
```

**エラー例**:
```json
{
  "success": false,
  "error": {
    "code": "OUTBOUND_CALL_FAILED",
    "message": "Failed to initiate outbound call",
    "retryable": true
  }
}
```

---

#### 1.2 通話を終了

**エンドポイント**: `POST /api/calls/:callId/end`

**説明**: 進行中の通話を終了します。

**パスパラメータ**:
- `callId`: 通話ログID（UUID）

**リクエストボディ**:
```json
{
  "durationSeconds": 300 // オプション
}
```

**レスポンス例**:
```json
{
  "success": true,
  "data": {
    "callLogId": "550e8400-e29b-41d4-a716-446655440000",
    "status": "completed"
  }
}
```

---

### 2. 着信関連

#### 2.1 着信Webhook

**エンドポイント**: `POST /api/calls/inbound/webhook`

**説明**: Amazon Connectからの着信通知を受信します。

**リクエストボディ**:
```json
{
  "contactId": "amazon-connect-contact-id",
  "phoneNumber": "+81-90-1234-5678",
  "timestamp": "2025-12-13T10:00:00Z",
  "eventType": "call_started", // "call_started" | "call_ended" | "call_connected"
  "instanceId": "instance-id", // オプション
  "queueId": "queue-id", // オプション
  "agentId": "agent-id" // オプション
}
```

**バリデーション**:
- `contactId`: 必須、文字列
- `phoneNumber`: 必須、文字列
- `timestamp`: 必須、ISO 8601形式
- `eventType`: 必須、"call_started" | "call_ended" | "call_connected"

**レスポンス例**:
```json
{
  "success": true,
  "data": {
    "callLogId": "550e8400-e29b-41d4-a716-446655440000",
    "sellerId": "660e8400-e29b-41d4-a716-446655440001",
    "matched": true
  }
}
```

---

### 3. 通話ログ関連

#### 3.1 通話ログ一覧を取得

**エンドポイント**: `GET /api/calls`

**説明**: 通話ログの一覧を取得します。フィルタリング、ソート、ページネーションに対応しています。

**クエリパラメータ**:
| パラメータ | 型 | 必須 | 説明 | デフォルト |
|-----------|-----|------|------|-----------|
| `page` | integer | No | ページ番号（1以上） | 1 |
| `limit` | integer | No | 1ページあたりの件数（1-100） | 20 |
| `sellerId` | UUID | No | 売主IDでフィルタ | - |
| `userId` | UUID | No | ユーザーIDでフィルタ | - |
| `direction` | string | No | 方向でフィルタ（"inbound" or "outbound"） | - |
| `status` | string | No | ステータスでフィルタ | - |
| `startDate` | ISO 8601 | No | 開始日でフィルタ | - |
| `endDate` | ISO 8601 | No | 終了日でフィルタ | - |
| `sortBy` | string | No | ソートフィールド | "started_at" |
| `sortOrder` | string | No | ソート順（"asc" or "desc"） | "desc" |

**ステータス値**:
- `completed`: 完了
- `missed`: 不在着信
- `failed`: 失敗
- `busy`: 話中
- `no_answer`: 応答なし

**レスポンス例**:
```json
{
  "success": true,
  "data": {
    "callLogs": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "sellerId": "660e8400-e29b-41d4-a716-446655440001",
        "userId": "770e8400-e29b-41d4-a716-446655440002",
        "direction": "outbound",
        "phoneNumber": "+81-90-1234-5678",
        "callStatus": "completed",
        "startedAt": "2025-12-13T10:00:00Z",
        "endedAt": "2025-12-13T10:05:00Z",
        "durationSeconds": 300,
        "contactId": "amazon-connect-contact-id",
        "createdAt": "2025-12-13T10:00:00Z",
        "updatedAt": "2025-12-13T10:05:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "totalCount": 150,
      "totalPages": 8
    }
  }
}
```

---

#### 3.2 通話詳細を取得

**エンドポイント**: `GET /api/calls/:callId`

**説明**: 特定の通話ログの詳細情報を取得します。

**パスパラメータ**:
- `callId`: 通話ログID（UUID）

**レスポンス例**:
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "sellerId": "660e8400-e29b-41d4-a716-446655440001",
    "userId": "770e8400-e29b-41d4-a716-446655440002",
    "direction": "outbound",
    "phoneNumber": "+81-90-1234-5678",
    "callStatus": "completed",
    "startedAt": "2025-12-13T10:00:00Z",
    "endedAt": "2025-12-13T10:05:00Z",
    "durationSeconds": 300,
    "contactId": "amazon-connect-contact-id",
    "instanceId": "instance-id",
    "queueId": "queue-id",
    "agentId": "agent-id",
    "createdAt": "2025-12-13T10:00:00Z",
    "updatedAt": "2025-12-13T10:05:00Z"
  }
}
```

**エラー例**:
```json
{
  "success": false,
  "error": {
    "code": "CALL_NOT_FOUND",
    "message": "Call log not found",
    "retryable": false
  }
}
```

---

### 4. 文字起こし関連

#### 4.1 文字起こしを取得

**エンドポイント**: `GET /api/calls/:callId/transcription`

**説明**: 通話の文字起こしテキストと感情分析結果を取得します。

**パスパラメータ**:
- `callId`: 通話ログID（UUID）

**レスポンス例**:
```json
{
  "success": true,
  "data": {
    "callLogId": "550e8400-e29b-41d4-a716-446655440000",
    "transcriptionText": "こんにちは、査定のご依頼ありがとうございます。はい、よろしくお願いします。",
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
    "languageCode": "ja-JP",
    "confidenceScore": 0.96,
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

**ステータス値**:
- `pending`: 処理待ち
- `processing`: 処理中
- `completed`: 完了
- `failed`: 失敗

**感情値**:
- `positive`: ポジティブ
- `neutral`: ニュートラル
- `negative`: ネガティブ
- `mixed`: 混合

---

#### 4.2 文字起こしジョブを手動で開始

**エンドポイント**: `POST /api/calls/:callId/transcription/start`

**説明**: 文字起こしジョブを手動で開始します。

**パスパラメータ**:
- `callId`: 通話ログID（UUID）

**レスポンス例**:
```json
{
  "success": true,
  "data": {
    "jobId": "12345",
    "callLogId": "550e8400-e29b-41d4-a716-446655440000",
    "status": "queued",
    "message": "Transcription job added to queue"
  }
}
```

---

#### 4.3 文字起こしジョブのステータスを取得

**エンドポイント**: `GET /api/calls/jobs/:jobId/status`

**説明**: 文字起こしジョブの処理状況を取得します。

**パスパラメータ**:
- `jobId`: ジョブID

**レスポンス例**:
```json
{
  "success": true,
  "data": {
    "jobId": "12345",
    "status": "completed",
    "progress": 100,
    "callLogId": "550e8400-e29b-41d4-a716-446655440000",
    "createdAt": "2025-12-13T10:05:00Z",
    "completedAt": "2025-12-13T10:07:00Z"
  }
}
```

---

#### 4.4 失敗した文字起こしジョブを再試行

**エンドポイント**: `POST /api/calls/jobs/:jobId/retry`

**説明**: 失敗した文字起こしジョブを再試行します。

**パスパラメータ**:
- `jobId`: ジョブID

**レスポンス例**:
```json
{
  "success": true,
  "data": {
    "jobId": "12345",
    "message": "Job retry initiated"
  }
}
```

---

#### 4.5 文字起こしジョブキューの統計情報を取得

**エンドポイント**: `GET /api/calls/jobs/stats`

**説明**: 文字起こしジョブキューの統計情報を取得します。

**レスポンス例**:
```json
{
  "success": true,
  "data": {
    "waiting": 5,
    "active": 2,
    "completed": 150,
    "failed": 3,
    "delayed": 0
  }
}
```

---

### 5. 録音関連

#### 5.1 録音ファイルのURLを取得

**エンドポイント**: `GET /api/calls/:callId/recording`

**説明**: 録音ファイルの再生用Presigned URLを取得します。

**パスパラメータ**:
- `callId`: 通話ログID（UUID）

**クエリパラメータ**:
| パラメータ | 型 | 必須 | 説明 | デフォルト |
|-----------|-----|------|------|-----------|
| `expiresIn` | integer | No | URL有効期限（秒、60-86400） | 3600 |

**レスポンス例**:
```json
{
  "success": true,
  "data": {
    "recordingUrl": "https://s3.amazonaws.com/bucket/key?X-Amz-Signature=...",
    "expiresAt": "2025-12-13T11:00:00Z",
    "durationSeconds": 300,
    "format": "wav"
  }
}
```

**注意事項**:
- Presigned URLは指定された時間（デフォルト1時間）で期限切れになります
- 録音ファイルへのアクセスは自動的にログに記録されます

---

### 6. 統計情報関連

#### 6.1 通話統計を取得

**エンドポイント**: `GET /api/calls/statistics`

**説明**: 指定期間の通話統計情報を取得します。

**クエリパラメータ**:
| パラメータ | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| `startDate` | ISO 8601 | Yes | 開始日 |
| `endDate` | ISO 8601 | Yes | 終了日 |
| `userId` | UUID | No | ユーザーIDでフィルタ |
| `direction` | string | No | 方向でフィルタ（"inbound" or "outbound"） |

**レスポンス例**:
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
        "userId": "770e8400-e29b-41d4-a716-446655440002",
        "userName": "山田太郎",
        "callCount": 45,
        "averageDuration": 280
      }
    ],
    "sentimentDistribution": {
      "positive": 85,
      "neutral": 50,
      "negative": 15
    },
    "topKeywords": [
      { "keyword": "査定", "count": 120 },
      { "keyword": "専任媒介", "count": 85 },
      { "keyword": "価格", "count": 75 }
    ]
  }
}
```

---

### 7. 設定関連（管理者のみ）

#### 7.1 AWS設定を取得

**エンドポイント**: `GET /api/calls/config`

**説明**: AWS設定情報を取得します（管理者のみアクセス可能）。

**権限**: 管理者（admin）のみ

**レスポンス例**:
```json
{
  "success": true,
  "data": {
    "awsRegion": "ap-northeast-1",
    "amazonConnectInstanceId": "***1234",
    "s3RecordingsBucket": "seller-system-call-recordings",
    "enableSentimentAnalysis": true,
    "enablePhoneIntegration": true,
    "enableInboundCalls": true,
    "enableOutboundCalls": true,
    "useMock": false
  }
}
```

**注意事項**:
- 機密情報（APIキー、シークレット）は末尾4文字のみ表示されます

---

#### 7.2 AWS接続テスト

**エンドポイント**: `POST /api/calls/config/test`

**説明**: AWS各サービスへの接続をテストします（管理者のみアクセス可能）。

**権限**: 管理者（admin）のみ

**レスポンス例**:
```json
{
  "success": true,
  "data": {
    "allPassed": true,
    "results": {
      "connect": true,
      "transcribe": true,
      "s3": true,
      "comprehend": true
    },
    "message": "All AWS services are accessible"
  }
}
```

---

### 8. クリーンアップ関連（管理者のみ）

#### 8.1 録音ファイルクリーンアップを手動実行

**エンドポイント**: `POST /api/calls/cleanup/run`

**説明**: 古い録音ファイルのクリーンアップを手動で実行します（管理者のみアクセス可能）。

**権限**: 管理者（admin）のみ

**リクエストボディ**:
```json
{
  "retentionDays": 90, // オプション、保持期間（日数）
  "archiveDays": 30, // オプション、アーカイブ期間（日数）
  "dryRun": true, // オプション、実際に削除せずに確認のみ
  "batchSize": 100 // オプション、バッチサイズ（1-1000）
}
```

**レスポンス例**:
```json
{
  "success": true,
  "data": {
    "archivedCount": 25,
    "deletedCount": 10,
    "failedCount": 0,
    "totalProcessed": 35,
    "dryRun": false,
    "executionTime": 12.5
  }
}
```

---

#### 8.2 録音ファイルクリーンアップのスケジュールを設定

**エンドポイント**: `POST /api/calls/cleanup/schedule`

**説明**: 録音ファイルクリーンアップの自動実行スケジュールを設定します（管理者のみアクセス可能）。

**権限**: 管理者（admin）のみ

**リクエストボディ**:
```json
{
  "cronExpression": "0 2 * * *", // 必須、cron形式のスケジュール
  "retentionDays": 90, // オプション、保持期間（日数）
  "archiveDays": 30 // オプション、アーカイブ期間（日数）
}
```

**cron形式の例**:
- `0 2 * * *`: 毎日深夜2時
- `0 3 * * 0`: 毎週日曜日午前3時
- `0 4 1 * *`: 毎月1日午前4時

**レスポンス例**:
```json
{
  "success": true,
  "data": {
    "jobId": "cleanup-scheduled",
    "cronExpression": "0 2 * * *",
    "message": "クリーンアップジョブをスケジュールしました"
  }
}
```

---

#### 8.3 録音ファイルクリーンアップのスケジュールを削除

**エンドポイント**: `DELETE /api/calls/cleanup/schedule`

**説明**: 設定されたクリーンアップスケジュールを削除します（管理者のみアクセス可能）。

**権限**: 管理者（admin）のみ

**レスポンス例**:
```json
{
  "success": true,
  "message": "スケジュールされたクリーンアップジョブを削除しました"
}
```

---

#### 8.4 クリーンアップキューの統計情報を取得

**エンドポイント**: `GET /api/calls/cleanup/stats`

**説明**: クリーンアップジョブキューの統計情報を取得します。

**レスポンス例**:
```json
{
  "success": true,
  "data": {
    "waiting": 0,
    "active": 0,
    "completed": 15,
    "failed": 0,
    "delayed": 0
  }
}
```

---

#### 8.5 クリーンアップジョブのステータスを取得

**エンドポイント**: `GET /api/calls/cleanup/jobs/:jobId`

**説明**: 特定のクリーンアップジョブの処理状況を取得します。

**パスパラメータ**:
- `jobId`: ジョブID

**レスポンス例**:
```json
{
  "success": true,
  "data": {
    "jobId": "12345",
    "status": "completed",
    "progress": 100,
    "archivedCount": 25,
    "deletedCount": 10,
    "failedCount": 0,
    "createdAt": "2025-12-13T02:00:00Z",
    "completedAt": "2025-12-13T02:00:12Z"
  }
}
```

---

## 認証

すべてのエンドポイントは認証が必要です。リクエストヘッダーに以下を含めてください：

```
Authorization: Bearer <JWT_TOKEN>
```

認証トークンは `/api/auth/login` エンドポイントから取得できます。

## レート制限

現在、レート制限は実装されていませんが、将来的に以下の制限が適用される可能性があります：

- 一般ユーザー: 100リクエスト/分
- 管理者: 500リクエスト/分

## ベストプラクティス

### 1. エラーハンドリング

すべてのAPIレスポンスで `success` フィールドをチェックしてください：

```typescript
const response = await fetch('/api/calls', {
  headers: { Authorization: `Bearer ${token}` }
});
const data = await response.json();

if (!data.success) {
  console.error('API Error:', data.error);
  if (data.error.retryable) {
    // リトライ可能なエラーの場合、再試行
  }
}
```

### 2. Presigned URLのキャッシング

録音ファイルのPresigned URLは有効期限内であれば再利用できます。不要なAPI呼び出しを避けるため、URLをキャッシュしてください。

### 3. ページネーション

大量のデータを取得する場合は、ページネーションを使用してください：

```typescript
let page = 1;
let allCallLogs = [];

while (true) {
  const response = await fetch(`/api/calls?page=${page}&limit=100`);
  const data = await response.json();
  
  allCallLogs.push(...data.data.callLogs);
  
  if (page >= data.data.pagination.totalPages) break;
  page++;
}
```

### 4. 統計情報のキャッシング

統計情報は計算コストが高いため、頻繁に取得しないでください。フロントエンドでキャッシュすることを推奨します（5分間など）。

## サンプルコード

### TypeScript/JavaScript

```typescript
import axios from 'axios';

const API_BASE_URL = 'http://localhost:3000/api/calls';
const token = 'your-jwt-token';

// 発信を開始
async function startOutboundCall(sellerId: string, phoneNumber: string) {
  try {
    const response = await axios.post(
      `${API_BASE_URL}/outbound`,
      { sellerId, phoneNumber },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return response.data.data;
  } catch (error) {
    console.error('Failed to start call:', error);
    throw error;
  }
}

// 通話ログ一覧を取得
async function getCallLogs(filters: {
  page?: number;
  limit?: number;
  sellerId?: string;
  direction?: 'inbound' | 'outbound';
}) {
  try {
    const response = await axios.get(`${API_BASE_URL}`, {
      params: filters,
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data.data;
  } catch (error) {
    console.error('Failed to get call logs:', error);
    throw error;
  }
}

// 文字起こしを取得
async function getTranscription(callId: string) {
  try {
    const response = await axios.get(
      `${API_BASE_URL}/${callId}/transcription`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return response.data.data;
  } catch (error) {
    console.error('Failed to get transcription:', error);
    throw error;
  }
}

// 録音URLを取得
async function getRecordingUrl(callId: string, expiresIn: number = 3600) {
  try {
    const response = await axios.get(
      `${API_BASE_URL}/${callId}/recording`,
      {
        params: { expiresIn },
        headers: { Authorization: `Bearer ${token}` }
      }
    );
    return response.data.data.recordingUrl;
  } catch (error) {
    console.error('Failed to get recording URL:', error);
    throw error;
  }
}

// 統計情報を取得
async function getStatistics(startDate: string, endDate: string) {
  try {
    const response = await axios.get(`${API_BASE_URL}/statistics`, {
      params: { startDate, endDate },
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data.data;
  } catch (error) {
    console.error('Failed to get statistics:', error);
    throw error;
  }
}
```

## 変更履歴

| バージョン | 日付 | 変更内容 |
|-----------|------|---------|
| 1.0.0 | 2025-12-13 | 初版リリース |

## サポート

APIに関する質問や問題がある場合は、開発チームにお問い合わせください。

---

**最終更新**: 2025-12-13  
**ドキュメントバージョン**: 1.0.0
