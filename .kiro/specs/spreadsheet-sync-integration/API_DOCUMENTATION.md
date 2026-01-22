# API ドキュメント

スプレッドシート同期機能のAPIエンドポイント一覧です。

## 目次

1. [同期ステータス API](#同期ステータス-api)
2. [手動同期 API](#手動同期-api)
3. [スナップショット API](#スナップショット-api)
4. [メール統合 API](#メール統合-api)
5. [レート制限 API](#レート制限-api)

---

## 同期ステータス API

### GET /api/sync/status

同期の全体的なステータスを取得します。

**レスポンス:**
```json
{
  "success": true,
  "data": {
    "recentLogs": [...],
    "stats": {
      "totalSyncs": 150,
      "successCount": 145,
      "failureCount": 5,
      "averageDuration": 1234,
      "errorsByType": {
        "network": 2,
        "validation": 3,
        "rate_limit": 0,
        "auth": 0,
        "conflict": 0,
        "unknown": 0
      }
    },
    "rateLimitUsage": {
      "available": 95,
      "capacity": 100,
      "usagePercentage": 5,
      "isNearLimit": false,
      "warning": null
    }
  }
}
```

### GET /api/sync/history

同期履歴を取得します。

**クエリパラメータ:**
- `limit` (optional): 取得件数（デフォルト: 100）
- `syncType` (optional): 同期タイプでフィルタ（migration, create, update, delete, manual, batch）
- `status` (optional): ステータスでフィルタ（success, failure, pending）

**レスポンス:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "sync_type": "create",
      "seller_id": "uuid",
      "status": "success",
      "error_message": null,
      "rows_affected": 1,
      "started_at": "2024-01-01T00:00:00Z",
      "completed_at": "2024-01-01T00:00:02Z",
      "duration_ms": 2000
    }
  ]
}
```

### GET /api/sync/errors

エラーログを取得します。

**クエリパラメータ:**
- `limit` (optional): 取得件数（デフォルト: 100）
- `errorType` (optional): エラータイプでフィルタ（network, validation, rate_limit, auth, conflict, unknown）

**レスポンス:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "error_type": "network",
      "error_message": "Connection timeout",
      "stack_trace": "...",
      "seller_id": "uuid",
      "operation": "sync_to_spreadsheet",
      "retry_count": 3,
      "created_at": "2024-01-01T00:00:00Z"
    }
  ]
}
```

---

## 手動同期 API

### POST /api/sync/manual

手動同期を開始します。

**リクエストボディ:**
```json
{
  "mode": "incremental"  // "full" または "incremental"
}
```

**レスポンス:**
```json
{
  "success": true,
  "message": "Manual sync started",
  "mode": "incremental"
}
```

**エラーレスポンス（既に実行中）:**
```json
{
  "success": false,
  "error": "Sync is already running",
  "progress": {
    "total": 1000,
    "processed": 500,
    "succeeded": 495,
    "failed": 5,
    "percentage": 50
  }
}
```

### GET /api/sync/manual/progress

手動同期の進行状況を取得します。

**レスポンス:**
```json
{
  "success": true,
  "data": {
    "isRunning": true,
    "progress": {
      "total": 1000,
      "processed": 500,
      "succeeded": 495,
      "failed": 5,
      "percentage": 50,
      "currentSellerId": "uuid"
    }
  }
}
```

---

## スナップショット API

### POST /api/sync/snapshot

データのスナップショットを作成します。

**リクエストボディ:**
```json
{
  "description": "移行前のバックアップ"  // optional
}
```

**レスポンス:**
```json
{
  "success": true,
  "message": "Snapshot created successfully",
  "data": {
    "id": "uuid",
    "created_at": "2024-01-01T00:00:00Z",
    "seller_count": 10000,
    "description": "移行前のバックアップ"
  }
}
```

### GET /api/sync/snapshots

スナップショット一覧を取得します。

**クエリパラメータ:**
- `limit` (optional): 取得件数（デフォルト: 50）

**レスポンス:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "created_at": "2024-01-01T00:00:00Z",
      "seller_count": 10000,
      "description": "移行前のバックアップ"
    }
  ]
}
```

### POST /api/sync/rollback

スナップショットからロールバックします。

**リクエストボディ:**
```json
{
  "snapshotId": "uuid"
}
```

**レスポンス:**
```json
{
  "success": true,
  "message": "Rollback completed successfully",
  "data": {
    "success": true,
    "restoredCount": 10000,
    "duration": 30000
  }
}
```

### DELETE /api/sync/snapshot/:id

スナップショットを削除します。

**レスポンス:**
```json
{
  "success": true,
  "message": "Snapshot deleted successfully"
}
```

---

## メール統合 API

### POST /api/integration/inquiry-email

査定依頼メールから売主を自動登録します。

**リクエストボディ:**
```json
{
  "name": "山田太郎",
  "address": "東京都渋谷区...",
  "phoneNumber": "090-1234-5678",
  "email": "yamada@example.com",
  "propertyAddress": "東京都渋谷区...",
  "inquirySource": "SUUMO",
  "inquiryDate": "2024-01-01T00:00:00Z"
}
```

**レスポンス:**
```json
{
  "success": true,
  "message": "Seller created successfully",
  "data": {
    "sellerId": "uuid",
    "sellerNumber": "AA123"
  }
}
```

### POST /api/integration/inquiry-email/batch

複数の査定依頼メールを一括処理します。

**リクエストボディ:**
```json
{
  "emails": [
    {
      "name": "山田太郎",
      "address": "東京都渋谷区...",
      "phoneNumber": "090-1234-5678",
      ...
    },
    ...
  ]
}
```

**レスポンス:**
```json
{
  "success": true,
  "message": "Batch processing completed",
  "data": {
    "successCount": 95,
    "failureCount": 5,
    "results": [
      {
        "success": true,
        "sellerId": "uuid",
        "sellerNumber": "AA123"
      },
      ...
    ]
  }
}
```

### POST /api/integration/check-duplicates

重複チェックを実行します。

**リクエストボディ:**
```json
{
  "phoneNumber": "090-1234-5678",
  "email": "yamada@example.com"  // optional
}
```

**レスポンス:**
```json
{
  "success": true,
  "data": {
    "isDuplicate": true,
    "existingSeller": {
      "id": "uuid",
      "seller_number": "AA123",
      "name": "山田太郎"
    }
  }
}
```

---

## レート制限 API

### GET /api/sync/rate-limit

レート制限の使用状況を取得します。

**レスポンス:**
```json
{
  "success": true,
  "data": {
    "available": 95,
    "capacity": 100,
    "usagePercentage": 5,
    "isNearLimit": false,
    "warning": null
  }
}
```

### POST /api/sync/rate-limit/reset

レート制限をリセットします（管理者用）。

**レスポンス:**
```json
{
  "success": true,
  "message": "Rate limiter reset successfully"
}
```

---

## エラーレスポンス

すべてのエンドポイントは、エラー時に以下の形式でレスポンスを返します:

```json
{
  "success": false,
  "error": "エラーメッセージ"
}
```

HTTPステータスコード:
- `200`: 成功
- `201`: 作成成功
- `400`: リクエストエラー
- `409`: 競合（同期が既に実行中など）
- `500`: サーバーエラー

---

## 認証

現在、これらのAPIエンドポイントは認証なしでアクセス可能です。本番環境では、適切な認証ミドルウェアを追加してください。

## レート制限

Google Sheets API のレート制限: 100リクエスト/100秒

システムは自動的にレート制限を管理し、必要に応じてリクエストを遅延させます。
