# Design Document

## Overview

本設計では、Google Calendar Push Notifications（Webhook）を使用して、Googleカレンダー上で削除されたイベントをリアルタイムで検知し、システム内の対応する訪問予約を自動的に削除する機能を実装します。Webhookが失敗した場合のバックアップとして、定期的な同期ジョブも実装します。

## Architecture

### High-Level Architecture

```
┌─────────────────┐
│ Google Calendar │
│   (User Action) │
└────────┬────────┘
         │ Event Deleted
         ▼
┌─────────────────┐
│  Google Push    │
│  Notification   │
│   (Webhook)     │
└────────┬────────┘
         │ POST /api/webhooks/calendar
         ▼
┌─────────────────┐
│  Webhook        │
│  Handler        │
│  - Verify       │
│  - Process      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐      ┌─────────────────┐
│  Calendar Sync  │─────▶│   Supabase      │
│  Service        │      │   Database      │
│  - Find Appt    │      │  - appointments │
│  - Delete Appt  │      │  - activity_logs│
└─────────────────┘      └─────────────────┘
         │
         ▼
┌─────────────────┐
│  Activity Log   │
│  Service        │
└─────────────────┘

┌─────────────────┐
│  Periodic Sync  │
│  Job (Backup)   │
│  - Every 15 min │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Incremental    │
│  Sync Service   │
│  - Use Sync     │
│    Token        │
└─────────────────┘
```

### Component Interaction Flow

1. **Webhook Registration Flow**:
   - システム起動時またはカレンダー接続時にWebhook登録
   - Google Calendar APIに通知チャンネルを作成
   - チャンネルIDとリソースIDをデータベースに保存
   - 有効期限（最大7日）を記録

2. **Real-time Deletion Flow**:
   - ユーザーがGoogleカレンダーでイベント削除
   - GoogleがWebhookエンドポイントにPOSTリクエスト送信
   - システムが通知を検証（X-Goog-Channel-IDヘッダー確認）
   - 変更内容を取得（sync tokenを使用）
   - 削除されたイベントを特定
   - 対応する予約を削除
   - アクティビティログに記録

3. **Periodic Sync Flow (Backup)**:
   - 15分ごとにcronジョブ実行
   - 前回のsync tokenを使用して変更を取得
   - 削除されたイベントを検出
   - 対応する予約を削除
   - 新しいsync tokenを保存

## Components and Interfaces

### 1. CalendarWebhookService

Webhook通知の登録と処理を管理

```typescript
interface CalendarWebhookService {
  // Webhookチャンネルを登録
  registerWebhook(employeeId: string): Promise<WebhookChannel>;
  
  // Webhookチャンネルを更新（期限切れ前に再登録）
  renewWebhook(channelId: string): Promise<WebhookChannel>;
  
  // Webhookチャンネルを削除
  unregisterWebhook(channelId: string): Promise<void>;
  
  // Webhook通知を処理
  handleWebhookNotification(headers: WebhookHeaders, body: any): Promise<void>;
  
  // 通知の署名を検証
  verifyWebhookSignature(headers: WebhookHeaders): boolean;
}

interface WebhookChannel {
  id: string;
  resourceId: string;
  expiration: Date;
  employeeId: string;
}

interface WebhookHeaders {
  'x-goog-channel-id': string;
  'x-goog-channel-token': string;
  'x-goog-resource-id': string;
  'x-goog-resource-state': string; // 'sync' | 'exists' | 'not_exists'
  'x-goog-message-number': string;
}
```

### 2. CalendarSyncService

カレンダーの変更を同期

```typescript
interface CalendarSyncService {
  // 増分同期を実行（sync tokenを使用）
  syncCalendarChanges(employeeId: string): Promise<SyncResult>;
  
  // 削除されたイベントを処理
  processDeletedEvents(deletedEventIds: string[]): Promise<void>;
  
  // sync tokenを取得
  getSyncToken(employeeId: string): Promise<string | null>;
  
  // sync tokenを保存
  saveSyncToken(employeeId: string, syncToken: string): Promise<void>;
}

interface SyncResult {
  deletedEvents: string[];
  modifiedEvents: string[];
  newEvents: string[];
  nextSyncToken: string;
}
```

### 3. Enhanced CalendarService

予約削除機能を拡張

```typescript
interface CalendarService {
  // 既存メソッド
  createAppointment(...): Promise<Appointment>;
  updateAppointment(...): Promise<Appointment>;
  cancelAppointment(appointmentId: string): Promise<void>;
  
  // 新規メソッド
  deleteAppointmentByCalendarEventId(eventId: string, source: 'user' | 'calendar_sync'): Promise<void>;
  findAppointmentByCalendarEventId(eventId: string): Promise<Appointment | null>;
}
```

### 4. API Routes

```typescript
// Webhook エンドポイント
POST /api/webhooks/calendar  // Google Calendar通知を受信

// 管理エンドポイント（既存のauth routeに追加）
POST /api/auth/google/calendar/webhook/register   // Webhook登録
POST /api/auth/google/calendar/webhook/unregister // Webhook解除
GET  /api/auth/google/calendar/webhook/status     // Webhook状態確認
```

## Data Models

### Calendar Webhook Channels Table

```sql
CREATE TABLE calendar_webhook_channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id TEXT NOT NULL UNIQUE,
  resource_id TEXT NOT NULL,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  expiration TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_webhook_channels_employee ON calendar_webhook_channels(employee_id);
CREATE INDEX idx_webhook_channels_expiration ON calendar_webhook_channels(expiration);
CREATE INDEX idx_webhook_channels_channel_id ON calendar_webhook_channels(channel_id);
```

### Calendar Sync Tokens Table

```sql
CREATE TABLE calendar_sync_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  sync_token TEXT NOT NULL,
  last_sync_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(employee_id)
);

CREATE INDEX idx_sync_tokens_employee ON calendar_sync_tokens(employee_id);
CREATE INDEX idx_sync_tokens_last_sync ON calendar_sync_tokens(last_sync_at);
```

### Appointments Table (既存テーブルに変更なし)

```sql
-- calendar_event_id カラムは既に存在
-- 削除時のソースを記録するため、activity_logsを使用
```



## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property Reflection

After analyzing all acceptance criteria, several properties can be consolidated:
- Properties 1.3 and 4.3 are identical (both delete appointments for deleted calendar events)
- Properties 1.5 and 5.1 are identical (both create activity logs for deletions)
- Property 5.2 can be merged with 1.5/5.1 to create a comprehensive "activity log with correct source" property
- Properties 1.1 and 3.3 can be combined into "webhook notification processing"

### Core Properties

**Property 1: Webhook notification processing**
*For any* valid webhook notification from Google Calendar, the system should detect and process the calendar changes
**Validates: Requirements 1.1, 3.3**

**Property 2: Appointment lookup by calendar event ID**
*For any* calendar event ID, if a corresponding appointment exists in the database, the system should successfully find it
**Validates: Requirements 1.2**

**Property 3: Appointment deletion for deleted calendar events**
*For any* calendar event that is deleted, if a corresponding appointment exists, the system should delete that appointment
**Validates: Requirements 1.3, 4.3**

**Property 4: Activity log creation with source tracking**
*For any* appointment deleted due to calendar sync, the system should create an activity log entry with the source marked as "Google Calendar Sync"
**Validates: Requirements 1.5, 5.1, 5.2**

**Property 5: Seller record preservation**
*For any* appointment deletion, the associated seller record should remain unchanged in the database
**Validates: Requirements 5.3**

**Property 6: Valid callback URL generation**
*For any* webhook registration request, the system should generate a callback URL that is valid and publicly accessible
**Validates: Requirements 2.2**

**Property 7: Webhook renewal before expiration**
*For any* webhook subscription that is approaching expiration, the system should automatically renew it before it expires
**Validates: Requirements 2.3**

**Property 8: Webhook creation on calendar connection**
*For any* employee connecting their Google Calendar, the system should create a webhook subscription for that employee's calendar
**Validates: Requirements 2.4**

**Property 9: Webhook cancellation on calendar disconnection**
*For any* employee disconnecting their Google Calendar, the system should cancel their webhook subscription
**Validates: Requirements 2.5**

**Property 10: Webhook signature verification**
*For any* incoming webhook notification, the system should verify the notification signature before processing
**Validates: Requirements 3.1**

**Property 11: Invalid signature rejection**
*For any* webhook notification with an invalid signature, the system should reject it and log the attempt without processing the changes
**Validates: Requirements 3.2**

**Property 12: Idempotent notification processing**
*For any* webhook notification, processing it multiple times should have the same effect as processing it once (idempotency)
**Validates: Requirements 3.4**

**Property 13: Sync token usage in periodic sync**
*For any* periodic sync job execution, the system should query Google Calendar using the stored sync token from the last sync
**Validates: Requirements 4.1**

**Property 14: Deleted event identification**
*For any* set of calendar changes returned by Google Calendar API, the system should correctly identify which events were deleted
**Validates: Requirements 4.2**

**Property 15: Sync token update after sync**
*For any* completed sync operation, the system should update the stored sync token with the new token from the API response
**Validates: Requirements 4.4**

**Property 16: Exponential backoff on sync failure**
*For any* failed sync job, the system should retry with exponentially increasing delays between attempts
**Validates: Requirements 4.5**

## Error Handling

### Webhook Errors

1. **Invalid Signature**: Return 401 Unauthorized, log the attempt with IP address
2. **Unknown Channel ID**: Return 404 Not Found, log the unknown channel
3. **Expired Channel**: Return 410 Gone, trigger automatic renewal
4. **Malformed Payload**: Return 400 Bad Request, log the payload for debugging

### Sync Errors

1. **Network Errors**: Log error, retry with exponential backoff (1s, 2s, 4s, 8s, 16s)
2. **API Rate Limiting**: Respect Retry-After header, implement exponential backoff
3. **Invalid Sync Token**: Perform full sync to get new sync token
4. **Authentication Errors**: Mark webhook as requiring re-authentication, notify user

### Database Errors

1. **Appointment Not Found**: Log the event ID, continue processing other deletions
2. **Concurrent Deletion**: Handle gracefully with idempotent operations
3. **Activity Log Failure**: Log error but don't fail the deletion operation

### Graceful Degradation

- If webhook registration fails, rely on periodic sync as backup
- If periodic sync fails, continue with exponential backoff retries
- System should continue to function even if calendar sync is temporarily unavailable
- Manual appointment deletions should always work regardless of sync status

## Testing Strategy

### Unit Testing

We will use Jest for unit testing with the following focus areas:

1. **CalendarWebhookService Tests**:
   - Test webhook registration with mocked Google API
   - Test webhook renewal logic
   - Test signature verification with valid and invalid signatures
   - Test notification processing with various event states

2. **CalendarSyncService Tests**:
   - Test incremental sync with mocked API responses
   - Test deleted event identification
   - Test sync token management
   - Test error handling and retry logic

3. **CalendarService Tests**:
   - Test appointment lookup by calendar event ID
   - Test appointment deletion with activity logging
   - Test seller record preservation after deletion

4. **Integration Tests**:
   - Test end-to-end webhook flow from notification to deletion
   - Test periodic sync job execution
   - Test webhook renewal process

### Property-Based Testing

We will use **fast-check** library for property-based testing. Each property-based test will run a minimum of 100 iterations.

Each property-based test MUST be tagged with a comment explicitly referencing the correctness property:
- Format: `// Feature: calendar-event-deletion-sync, Property {number}: {property_text}`

Property-based tests will focus on:

1. **Webhook Processing Properties** (Properties 1, 10, 11, 12):
   - Generate random webhook notifications
   - Verify signature verification works correctly
   - Verify idempotent processing

2. **Appointment Deletion Properties** (Properties 2, 3, 4, 5):
   - Generate random appointments with calendar event IDs
   - Verify lookup and deletion work correctly
   - Verify activity logs are created with correct source
   - Verify seller records remain unchanged

3. **Webhook Lifecycle Properties** (Properties 6, 7, 8, 9):
   - Generate random employee calendar connections
   - Verify webhook creation and cancellation
   - Verify URL generation and renewal logic

4. **Sync Properties** (Properties 13, 14, 15, 16):
   - Generate random sync scenarios
   - Verify sync token management
   - Verify deleted event identification
   - Verify retry logic with exponential backoff

### Testing Configuration

- Minimum 100 iterations per property-based test
- Use mocked Google Calendar API responses for deterministic testing
- Test both success and failure scenarios
- Verify error codes and messages match specifications
- Test idempotency by running operations multiple times

## Implementation Notes

### Google Calendar Push Notifications

Google Calendar Push Notifications use the following flow:

1. **Watch Request**: POST to `https://www.googleapis.com/calendar/v3/calendars/{calendarId}/events/watch`
   ```json
   {
     "id": "unique-channel-id",
     "type": "web_hook",
     "address": "https://your-domain.com/api/webhooks/calendar",
     "token": "optional-verification-token",
     "expiration": 1234567890000
   }
   ```

2. **Notification Headers**:
   - `X-Goog-Channel-ID`: Channel identifier
   - `X-Goog-Channel-Token`: Verification token
   - `X-Goog-Resource-ID`: Resource identifier
   - `X-Goog-Resource-State`: State of the resource (sync, exists, not_exists)
   - `X-Goog-Message-Number`: Message sequence number

3. **Sync Token Flow**:
   - Initial sync: GET `/calendars/{calendarId}/events?maxResults=1`
   - Response includes `nextSyncToken`
   - Incremental sync: GET `/calendars/{calendarId}/events?syncToken={token}`
   - Deleted events have `status: 'cancelled'`

### Security Considerations

1. **Webhook Verification**: Verify channel ID and token match stored values
2. **HTTPS Only**: Webhook endpoint must use HTTPS in production
3. **Rate Limiting**: Implement rate limiting on webhook endpoint to prevent abuse
4. **Token Storage**: Store channel tokens securely in database
5. **IP Whitelisting**: Consider whitelisting Google's IP ranges (optional)

### Performance Considerations

1. **Async Processing**: Process webhook notifications asynchronously to respond quickly
2. **Batch Deletions**: Delete multiple appointments in a single database transaction
3. **Connection Pooling**: Reuse database connections for sync operations
4. **Caching**: Cache sync tokens in memory to reduce database queries
5. **Webhook Renewal**: Renew webhooks 1 day before expiration to avoid gaps

### Environment Variables

Required environment variables:
```
GOOGLE_CALENDAR_CLIENT_ID=your_client_id
GOOGLE_CALENDAR_CLIENT_SECRET=your_client_secret
GOOGLE_CALENDAR_REDIRECT_URI=http://localhost:3000/api/auth/google/calendar/callback
WEBHOOK_BASE_URL=https://your-domain.com  # Public URL for webhook callbacks
WEBHOOK_VERIFICATION_TOKEN=random-secret-token  # For additional security
```

### Webhook Lifecycle Management

1. **Registration**: When employee connects calendar or system starts
2. **Renewal**: Automated job runs daily to renew expiring webhooks (< 24 hours remaining)
3. **Cleanup**: When employee disconnects calendar or is deleted
4. **Monitoring**: Log webhook status and failures for debugging

### Periodic Sync Configuration

- **Frequency**: Every 15 minutes
- **Batch Size**: Process up to 100 events per sync
- **Timeout**: 30 seconds per sync operation
- **Retry**: Up to 5 retries with exponential backoff
- **Fallback**: If sync token is invalid, perform full sync

### Migration Strategy

1. Create `calendar_webhook_channels` table
2. Create `calendar_sync_tokens` table
3. Add webhook registration logic to `GoogleAuthService`
4. Implement `CalendarWebhookService`
5. Implement `CalendarSyncService`
6. Add webhook endpoint to API routes
7. Implement periodic sync cron job
8. Add webhook renewal cron job
9. Update frontend to show sync status (optional)
10. Test with development Google Calendar account
