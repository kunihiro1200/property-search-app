# Design Document

## Overview

本設計では、既存のCalendarServiceにGoogle Calendar API連携機能を追加します。OAuth 2.0認証フローを実装し、ユーザーのGoogleカレンダーに訪問査定予約を自動的に同期します。認証トークンは暗号化してデータベースに保存し、セキュアに管理します。

## Architecture

### High-Level Architecture

```
┌─────────────┐      ┌──────────────────┐      ┌─────────────────┐
│   Frontend  │─────▶│   Backend API    │─────▶│  Google OAuth   │
│             │      │                  │      │   Consent       │
└─────────────┘      └──────────────────┘      └─────────────────┘
                              │                         │
                              │                         ▼
                              │                ┌─────────────────┐
                              │                │ Authorization   │
                              │◀───────────────│     Code        │
                              │                └─────────────────┘
                              ▼
                     ┌──────────────────┐
                     │  Exchange Code   │
                     │  for Tokens      │
                     └──────────────────┘
                              │
                              ▼
                     ┌──────────────────┐      ┌─────────────────┐
                     │  Store Encrypted │─────▶│    Supabase     │
                     │  Refresh Token   │      │    Database     │
                     └──────────────────┘      └─────────────────┘
                              │
                              ▼
                     ┌──────────────────┐      ┌─────────────────┐
                     │  Calendar API    │─────▶│ Google Calendar │
                     │  Operations      │      │      API        │
                     └──────────────────┘      └─────────────────┘
```

### Component Interaction Flow

1. **Authentication Flow**:
   - User clicks "Connect Google Calendar"
   - Backend redirects to Google OAuth consent screen
   - User grants permissions
   - Google redirects back with authorization code
   - Backend exchanges code for access token and refresh token
   - Backend encrypts and stores refresh token in database

2. **Calendar Event Creation Flow**:
   - User creates appointment
   - Backend retrieves and decrypts refresh token
   - Backend obtains fresh access token
   - Backend creates calendar event via Google Calendar API
   - Backend stores calendar event ID with appointment

## Components and Interfaces

### 1. GoogleAuthService

OAuth 2.0認証を管理するサービス

```typescript
interface GoogleAuthService {
  // OAuth認証URLを生成
  getAuthUrl(): string;
  
  // 認証コードをトークンに交換
  exchangeCodeForTokens(code: string, employeeId: string): Promise<void>;
  
  // アクセストークンを取得（必要に応じて更新）
  getAccessToken(employeeId: string): Promise<string>;
  
  // リフレッシュトークンを削除（連携解除）
  revokeAccess(employeeId: string): Promise<void>;
}
```

### 2. Enhanced CalendarService

Google Calendar API操作を実装

```typescript
interface CalendarService {
  // 既存メソッド
  createAppointment(request: AppointmentRequest, ...): Promise<Appointment>;
  updateAppointment(id: string, updates: Partial<AppointmentRequest>): Promise<Appointment>;
  cancelAppointment(id: string): Promise<void>;
  
  // 新規メソッド
  createGoogleCalendarEvent(employeeId: string, eventData: CalendarEventData): Promise<string>;
  updateGoogleCalendarEvent(employeeId: string, eventId: string, updates: Partial<CalendarEventData>): Promise<void>;
  deleteGoogleCalendarEvent(employeeId: string, eventId: string): Promise<void>;
}
```

### 3. API Routes

```typescript
// OAuth認証エンドポイント
GET  /api/auth/google/calendar          // 認証URL取得
GET  /api/auth/google/calendar/callback // OAuth callback
POST /api/auth/google/calendar/revoke   // 連携解除

// 既存の予約エンドポイント（変更なし）
POST   /api/appointments
PUT    /api/appointments/:id
DELETE /api/appointments/:id
GET    /api/appointments/seller/:sellerId
```

## Data Models

### Google Calendar Tokens Table

```sql
CREATE TABLE google_calendar_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  encrypted_refresh_token TEXT NOT NULL,
  token_expiry TIMESTAMP,
  scope TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(employee_id)
);

CREATE INDEX idx_google_calendar_tokens_employee ON google_calendar_tokens(employee_id);
```

### Appointments Table (既存)

```sql
-- calendar_event_id カラムは既に存在
ALTER TABLE appointments 
  ADD COLUMN IF NOT EXISTS calendar_event_id TEXT;
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property Reflection

After analyzing all acceptance criteria, several properties can be consolidated:
- Properties 3.1, 3.2, 3.3 can be combined into a single "appointment updates sync to calendar" property
- Properties 2.2, 2.3, 2.4 relate to calendar event content and can be verified together
- Error handling properties (3.4, 4.2) are important for resilience

### Core Properties

**Property 1: Token encryption**
*For any* authentication token being stored, the stored value should be encrypted and not equal to the plaintext token
**Validates: Requirements 1.3**

**Property 2: Token exchange success**
*For any* valid Google authorization code, exchanging it for tokens should successfully store an encrypted refresh token in the database
**Validates: Requirements 1.2**

**Property 3: Expired token handling**
*For any* API call with an expired or invalid refresh token, the system should return an authentication error prompting re-authentication
**Validates: Requirements 1.4**

**Property 4: Appointment creates calendar event**
*For any* valid appointment creation request, a corresponding Google Calendar event should be created and its ID stored with the appointment
**Validates: Requirements 2.1, 2.5**

**Property 5: Calendar event content completeness**
*For any* created calendar event, the event description should contain the seller name, phone number, property address, and notes (if provided)
**Validates: Requirements 2.2**

**Property 6: Calendar event location matches property**
*For any* created calendar event, the event location field should equal the property address
**Validates: Requirements 2.3**

**Property 7: Calendar event has required reminders**
*For any* created calendar event, it should have exactly two reminders: one at 1440 minutes (1 day) before and one at 30 minutes before
**Validates: Requirements 2.4**

**Property 8: Appointment updates sync to calendar**
*For any* appointment update (time, location, or notes), the corresponding calendar event should be updated with the new values
**Validates: Requirements 3.1, 3.2, 3.3**

**Property 9: Update failure preserves local data**
*For any* calendar event update that fails, the appointment data in the database should remain unchanged from before the update attempt
**Validates: Requirements 3.4**

**Property 10: Appointment cancellation deletes calendar event**
*For any* appointment cancellation, the corresponding Google Calendar event should be deleted
**Validates: Requirements 4.1**

**Property 11: Cancellation succeeds despite calendar API failure**
*For any* appointment cancellation where the calendar API fails, the appointment should still be marked as cancelled in the database
**Validates: Requirements 4.2**



## Error Handling

### OAuth Errors

1. **Invalid Authorization Code**: Return 400 with clear error message
2. **Token Exchange Failure**: Log error, return 500, prompt user to retry
3. **Expired Refresh Token**: Return 401 with `GOOGLE_AUTH_REQUIRED` error code
4. **Revoked Access**: Return 401 with `GOOGLE_AUTH_REVOKED` error code

### Calendar API Errors

1. **Rate Limiting**: Implement exponential backoff, retry up to 3 times
2. **Network Errors**: Log error, return 503, maintain local appointment data
3. **Event Not Found (404)**: Handle gracefully for delete operations (idempotent)
4. **Permission Errors**: Return 403, prompt user to re-authenticate with correct scopes

### Graceful Degradation

- If Google Calendar API is unavailable, appointments should still be created in the database
- Calendar sync failures should not prevent appointment operations
- System should continue to function without Google Calendar integration if credentials are not configured

## Testing Strategy

### Unit Testing

We will use Jest for unit testing with the following focus areas:

1. **GoogleAuthService Tests**:
   - Test OAuth URL generation with correct parameters
   - Test token exchange with mocked Google API responses
   - Test token encryption/decryption
   - Test error handling for invalid codes

2. **CalendarService Tests**:
   - Test calendar event creation with mocked Google API
   - Test event update operations
   - Test event deletion operations
   - Test error handling and graceful degradation

3. **Integration Tests**:
   - Test end-to-end appointment creation with calendar sync
   - Test appointment update flow
   - Test appointment cancellation flow

### Property-Based Testing

We will use **fast-check** library for property-based testing. Each property-based test will run a minimum of 100 iterations.

Each property-based test MUST be tagged with a comment explicitly referencing the correctness property:
- Format: `// Feature: google-calendar-integration, Property {number}: {property_text}`

Property-based tests will focus on:

1. **Token Encryption Properties** (Properties 1, 2):
   - Generate random tokens and verify encryption
   - Verify round-trip encryption/decryption

2. **Calendar Event Content Properties** (Properties 5, 6, 7):
   - Generate random appointment data
   - Verify calendar event contains all required fields
   - Verify reminders are correctly set

3. **Update Synchronization Properties** (Property 8):
   - Generate random appointment updates
   - Verify calendar events are updated accordingly

4. **Error Resilience Properties** (Properties 9, 11):
   - Simulate API failures
   - Verify local data integrity is maintained

### Testing Configuration

- Minimum 100 iterations per property-based test
- Use mocked Google API responses for deterministic testing
- Test both success and failure scenarios
- Verify error codes and messages match specifications

## Implementation Notes

### Security Considerations

1. **Token Storage**: Refresh tokens must be encrypted using AES-256-GCM
2. **Token Transmission**: Never log or expose refresh tokens in responses
3. **Scope Limitation**: Request only `https://www.googleapis.com/auth/calendar.events` scope
4. **Token Rotation**: Support token refresh and re-authentication flows

### Performance Considerations

1. **Token Caching**: Cache access tokens in memory (valid for 1 hour)
2. **Batch Operations**: Consider batch API calls for multiple appointments
3. **Async Operations**: Calendar API calls should not block appointment creation
4. **Connection Pooling**: Reuse HTTP connections to Google APIs

### Google Calendar API Configuration

Required environment variables:
```
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret
GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/google/calendar/callback
```

Required OAuth 2.0 scopes:
- `https://www.googleapis.com/auth/calendar.events` (Create, read, update, delete events)

### Migration Strategy

1. Add `google_calendar_tokens` table
2. Update existing `CalendarService` to use Google Calendar API
3. Add OAuth routes for authentication
4. Update frontend to include "Connect Google Calendar" button
5. Migrate existing appointments to create calendar events (optional)
