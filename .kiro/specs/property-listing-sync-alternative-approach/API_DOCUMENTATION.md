# Property Listing Sync API Documentation

物件リスト同期APIのドキュメント

## 概要

このAPIは、物件リストの同期操作を監視・制御するためのエンドポイントを提供します。

## ベースURL

```
http://localhost:3000/api/property-listing-sync
```

## エンドポイント

### 1. 同期状態の取得

現在の同期状態または特定の同期IDの状態を取得します。

**エンドポイント:** `GET /status`

**クエリパラメータ:**
- `syncId` (オプション): 特定の同期IDを指定

**レスポンス例（最新の同期）:**

```json
{
  "sync": {
    "id": "sync-123",
    "syncType": "manual",
    "status": "completed",
    "startedAt": "2025-01-09T10:00:00Z",
    "completedAt": "2025-01-09T10:05:00Z",
    "totalItems": 100,
    "successCount": 95,
    "failedCount": 3,
    "skippedCount": 2,
    "errorDetails": null,
    "triggeredBy": "user-123",
    "propertyNumbers": null
  }
}
```

**レスポンス例（同期が存在しない）:**

```json
{
  "sync": null,
  "message": "No sync operations found"
}
```

**ステータスコード:**
- `200 OK`: 成功
- `404 Not Found`: 指定された同期IDが見つからない
- `500 Internal Server Error`: サーバーエラー

---

### 2. 同期履歴の取得

過去の同期操作の履歴を取得します。

**エンドポイント:** `GET /history`

**クエリパラメータ:**
- `limit` (オプション): 取得件数（デフォルト: 50）
- `offset` (オプション): オフセット（デフォルト: 0）
- `syncId` (オプション): 特定の同期IDの詳細履歴を取得

**レスポンス例（同期履歴）:**

```json
{
  "history": [
    {
      "id": "sync-1",
      "syncType": "manual",
      "status": "completed",
      "startedAt": "2025-01-09T10:00:00Z",
      "completedAt": "2025-01-09T10:05:00Z",
      "totalItems": 100,
      "successCount": 100,
      "failedCount": 0,
      "skippedCount": 0,
      "triggeredBy": "user-123",
      "propertyNumbers": null
    },
    {
      "id": "sync-2",
      "syncType": "auto",
      "status": "partial",
      "startedAt": "2025-01-09T09:00:00Z",
      "completedAt": "2025-01-09T09:10:00Z",
      "totalItems": 150,
      "successCount": 145,
      "failedCount": 5,
      "skippedCount": 0,
      "triggeredBy": "system",
      "propertyNumbers": null
    }
  ],
  "pagination": {
    "limit": 50,
    "offset": 0,
    "total": 2
  }
}
```

**レスポンス例（詳細履歴）:**

```json
{
  "syncId": "sync-123",
  "history": [
    {
      "id": "history-1",
      "propertyNumber": "AA12345",
      "operation": "update",
      "status": "success",
      "errorMessage": null,
      "errorCode": null,
      "retryCount": 0,
      "durationMs": 150,
      "createdAt": "2025-01-09T10:00:00Z"
    },
    {
      "id": "history-2",
      "propertyNumber": "AA12346",
      "operation": "insert",
      "status": "success",
      "errorMessage": null,
      "errorCode": null,
      "retryCount": 0,
      "durationMs": 200,
      "createdAt": "2025-01-09T10:00:01Z"
    }
  ],
  "total": 2
}
```

**ステータスコード:**
- `200 OK`: 成功
- `500 Internal Server Error`: サーバーエラー

---

### 3. 手動同期のトリガー

手動で同期操作を開始します。

**エンドポイント:** `POST /trigger`

**リクエストボディ:**

```json
{
  "syncType": "full",
  "triggeredBy": "user-123"
}
```

または

```json
{
  "syncType": "selective",
  "propertyNumbers": ["AA12345", "AA12346"],
  "triggeredBy": "user-123"
}
```

**パラメータ:**
- `syncType` (必須): 同期タイプ（`"full"` または `"selective"`）
- `propertyNumbers` (selectiveの場合必須): 同期する物件番号の配列
- `triggeredBy` (オプション): トリガー元のユーザーID（デフォルト: `"api"`）

**レスポンス例:**

```json
{
  "message": "Sync operation queued",
  "sync": {
    "id": "sync-789",
    "syncType": "manual",
    "status": "queued",
    "triggeredBy": "user-123",
    "propertyNumbers": null
  }
}
```

**ステータスコード:**
- `202 Accepted`: 同期がキューに追加された
- `400 Bad Request`: 不正なリクエスト
- `500 Internal Server Error`: サーバーエラー

**エラーレスポンス例:**

```json
{
  "error": {
    "code": "INVALID_SYNC_TYPE",
    "message": "syncType must be either \"full\" or \"selective\""
  }
}
```

```json
{
  "error": {
    "code": "MISSING_PROPERTY_NUMBERS",
    "message": "propertyNumbers array is required for selective sync"
  }
}
```

---

### 4. ヘルスチェック

同期システムのヘルスステータスを取得します。

**エンドポイント:** `GET /health`

**レスポンス例:**

```json
{
  "status": "healthy",
  "sync": {
    "status": "healthy",
    "lastSync": "2025-01-09T10:00:00Z",
    "errorRate": 0.01,
    "avgSyncDuration": 300,
    "queueSize": 0,
    "circuitBreakerState": "closed"
  },
  "statistics": {
    "totalSyncs": 100,
    "successfulSyncs": 95,
    "failedSyncs": 3,
    "partialSyncs": 2,
    "totalItems": 10000,
    "successRate": 0.95,
    "avgDurationSeconds": 300,
    "errorRate": 0.01
  }
}
```

**ステータス値:**
- `healthy`: 正常
- `degraded`: 性能低下
- `unhealthy`: 異常

**サーキットブレーカーの状態:**
- `closed`: 正常（リクエストを通す）
- `open`: 異常（リクエストを遮断）
- `half-open`: 回復中（テストリクエストを通す）

**ステータスコード:**
- `200 OK`: 成功
- `500 Internal Server Error`: サーバーエラー

---

## データモデル

### SyncState

同期操作の状態を表します。

```typescript
interface SyncState {
  id: string;                    // 同期ID
  syncType: string;              // 同期タイプ（full, selective, auto, manual）
  status: string;                // ステータス（queued, in_progress, completed, failed, partial）
  startedAt: string;             // 開始時刻（ISO 8601形式）
  completedAt?: string;          // 完了時刻（ISO 8601形式）
  totalItems?: number;           // 総アイテム数
  successCount: number;          // 成功件数
  failedCount: number;           // 失敗件数
  skippedCount: number;          // スキップ件数
  errorDetails?: any;            // エラー詳細
  triggeredBy?: string;          // トリガー元
  propertyNumbers?: string[];    // 物件番号配列（selectiveの場合）
}
```

### SyncHistory

同期操作の詳細履歴を表します。

```typescript
interface SyncHistory {
  id: string;                    // 履歴ID
  propertyNumber: string;        // 物件番号
  operation: string;             // 操作タイプ（insert, update, skip, error）
  status: string;                // ステータス（success, failed, skipped）
  errorMessage?: string;         // エラーメッセージ
  errorCode?: string;            // エラーコード
  retryCount: number;            // リトライ回数
  durationMs?: number;           // 処理時間（ミリ秒）
  createdAt: string;             // 作成時刻（ISO 8601形式）
}
```

### HealthStatus

システムのヘルスステータスを表します。

```typescript
interface HealthStatus {
  status: string;                // ヘルスステータス（healthy, degraded, unhealthy）
  sync: {
    status: string;              // 同期サービスのステータス
    lastSync?: string;           // 最後の同期時刻（ISO 8601形式）
    errorRate: number;           // エラー率（0-1）
    avgSyncDuration: number;     // 平均同期時間（秒）
    queueSize: number;           // キューサイズ
    circuitBreakerState: string; // サーキットブレーカーの状態
  };
  statistics: {
    totalSyncs: number;          // 総同期回数
    successfulSyncs: number;     // 成功した同期回数
    failedSyncs: number;         // 失敗した同期回数
    partialSyncs: number;        // 部分的に成功した同期回数
    totalItems: number;          // 総アイテム数
    successRate: number;         // 成功率（0-1）
    avgDurationSeconds: number;  // 平均処理時間（秒）
    errorRate: number;           // エラー率（0-1）
  };
}
```

---

## エラーハンドリング

すべてのエラーレスポンスは以下の形式で返されます：

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Error message",
    "details": "Additional error details"
  }
}
```

### エラーコード

- `SYNC_NOT_FOUND`: 指定された同期IDが見つからない
- `INVALID_SYNC_TYPE`: 不正な同期タイプ
- `MISSING_PROPERTY_NUMBERS`: 物件番号が指定されていない
- `INTERNAL_ERROR`: サーバー内部エラー

---

## 使用例

### cURLでの使用例

**最新の同期状態を取得:**

```bash
curl http://localhost:3000/api/property-listing-sync/status
```

**特定の同期IDの状態を取得:**

```bash
curl "http://localhost:3000/api/property-listing-sync/status?syncId=sync-123"
```

**同期履歴を取得:**

```bash
curl "http://localhost:3000/api/property-listing-sync/history?limit=10&offset=0"
```

**全件同期をトリガー:**

```bash
curl -X POST http://localhost:3000/api/property-listing-sync/trigger \
  -H "Content-Type: application/json" \
  -d '{
    "syncType": "full",
    "triggeredBy": "user-123"
  }'
```

**選択同期をトリガー:**

```bash
curl -X POST http://localhost:3000/api/property-listing-sync/trigger \
  -H "Content-Type: application/json" \
  -d '{
    "syncType": "selective",
    "propertyNumbers": ["AA12345", "AA12346"],
    "triggeredBy": "user-123"
  }'
```

**ヘルスチェック:**

```bash
curl http://localhost:3000/api/property-listing-sync/health
```

---

## レート制限

現在、APIレート制限は実装されていません。将来的に実装される可能性があります。

---

## 認証

現在、認証は実装されていません。将来的に実装される可能性があります。

---

## バージョニング

現在のAPIバージョン: v1（URLにバージョン番号は含まれていません）

---

## サポート

問題が発生した場合は、開発チームにお問い合わせください。
