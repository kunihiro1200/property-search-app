# Design Document

## Overview

This feature modifies the calendar event creation flow to use the assigned employee's Google Calendar instead of the logged-in user's calendar. The system will retrieve the assigned employee's OAuth tokens and use them to create calendar events in their Google Calendar.

## Architecture

The solution involves modifying the `CalendarService` to accept an employee ID parameter and use that employee's OAuth credentials when creating calendar events. The existing `GoogleAuthService` already provides the necessary token management functionality.

### Key Changes

1. **CalendarService**: Modify to accept and use assigned employee's credentials
2. **Appointment Creation Flow**: Pass assigned employee ID to calendar service
3. **Validation**: Check if assigned employee has connected their Google Calendar before creating appointments
4. **Error Handling**: Provide clear error messages when assigned employee's calendar is not connected

## Components and Interfaces

### Modified CalendarService

```typescript
export class CalendarService extends BaseRepository {
  private googleAuthService: GoogleAuthService;

  /**
   * 訪問査定予約を作成（営担のカレンダーに）
   * @param request 予約リクエスト
   * @param assignedEmployeeId 営担の社員ID
   * @param sellerName 売主名
   * @param sellerPhone 売主電話番号
   * @param propertyAddress 物件住所
   */
  async createAppointment(
    request: AppointmentRequest,
    assignedEmployeeId: string,
    sellerName: string,
    sellerPhone: string,
    propertyAddress: string
  ): Promise<Appointment>;

  /**
   * カレンダーイベントを作成（指定された社員のカレンダーに）
   * @param employeeId 社員ID
   * @param request 予約リクエスト
   * @param sellerName 売主名
   * @param sellerPhone 売主電話番号
   * @param propertyAddress 物件住所
   */
  private async createCalendarEvent(
    employeeId: string,
    request: AppointmentRequest,
    sellerName: string,
    sellerPhone: string,
    propertyAddress: string
  ): Promise<CalendarEvent>;
}
```

### AppointmentRequest Interface

```typescript
export interface AppointmentRequest {
  sellerId: string;
  employeeId: string; // 予約を作成した人
  startTime: Date;
  endTime: Date;
  location: string;
  assignedTo: string; // 営担イニシャル
  assignedEmployeeId?: string; // 営担の社員ID（新規追加）
  notes?: string;
  createdByName?: string;
}
```

## Data Models

### Existing Tables

The system already has the necessary tables:

- `google_calendar_tokens`: Stores encrypted OAuth tokens per employee
- `appointments`: Stores appointment information including `assigned_to`
- `employees`: Stores employee information

### Required Migration

Add `assigned_employee_id` column to `appointments` table to store the assigned employee's ID:

```sql
ALTER TABLE appointments 
ADD COLUMN IF NOT EXISTS assigned_employee_id UUID REFERENCES employees(id);
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Calendar event created in assigned employee's calendar

*For any* appointment creation request with an assigned employee ID, the calendar event should be created in the assigned employee's Google Calendar, not the logged-in user's calendar.

**Validates: Requirements 1.1**

### Property 2: Appointment creation fails when assigned employee not connected

*For any* appointment creation request where the assigned employee has not connected their Google Calendar, the system should reject the request with an appropriate error message.

**Validates: Requirements 1.2**

### Property 3: Token refresh on expiry

*For any* appointment creation request where the assigned employee's OAuth token is expired but refresh token is valid, the system should automatically refresh the token and successfully create the calendar event.

**Validates: Requirements 1.3**

### Property 4: Clear error on invalid token

*For any* appointment creation request where the assigned employee's OAuth token cannot be refreshed, the system should return a clear error message indicating that the employee needs to reconnect their Google Calendar.

**Validates: Requirements 1.4**

## Error Handling

### Error Codes

1. **GOOGLE_AUTH_REQUIRED**: Assigned employee has not connected their Google Calendar
2. **GOOGLE_AUTH_EXPIRED**: Assigned employee's OAuth token has expired and cannot be refreshed
3. **ASSIGNED_EMPLOYEE_NOT_FOUND**: The assigned employee ID does not exist in the system
4. **CALENDAR_EVENT_CREATION_FAILED**: Failed to create calendar event due to API error

### Error Messages (Japanese)

- `営担（{name}）がGoogleカレンダーを接続していません。接続してから再度お試しください。`
- `営担（{name}）のGoogleカレンダー認証が期限切れです。再接続が必要です。`
- `指定された営担が見つかりません。`
- `カレンダーイベントの作成に失敗しました。`

## Testing Strategy

### Unit Tests

1. Test calendar event creation with valid assigned employee credentials
2. Test error handling when assigned employee not connected
3. Test token refresh flow
4. Test error handling when token refresh fails
5. Test validation of assigned employee ID

### Property-Based Tests

Property-based tests will use the `fast-check` library for TypeScript to verify the correctness properties defined above.

Each property test should:
- Run a minimum of 100 iterations
- Generate random but valid test data
- Verify the property holds across all generated inputs
- Be tagged with the corresponding property number from this design document

### Integration Tests

1. End-to-end test: Create appointment with assigned employee who has connected calendar
2. End-to-end test: Attempt to create appointment with assigned employee who hasn't connected calendar
3. End-to-end test: Create appointment with expired token that can be refreshed

## Implementation Notes

### Employee ID Mapping

The frontend currently sends `assignedTo` as an initial (e.g., "TK"). The backend needs to:
1. Map the initial to an employee ID
2. Verify the employee exists
3. Check if the employee has connected their Google Calendar
4. Use the employee's credentials to create the calendar event

### Backward Compatibility

Existing appointments without `assigned_employee_id` should continue to work. The system should:
- Only use assigned employee's calendar if `assigned_employee_id` is provided
- Fall back to logged-in user's calendar for legacy appointments (optional)
- Encourage users to specify assigned employee for all new appointments

### Security Considerations

1. **Token Security**: OAuth tokens are already encrypted using the existing encryption utility
2. **Authorization**: Verify that the logged-in user has permission to create appointments for the assigned employee
3. **Token Scope**: Ensure tokens only have the minimum required scope (`calendar.events`)

## Deployment Considerations

1. **Database Migration**: Run the migration to add `assigned_employee_id` column
2. **Employee Setup**: Ensure all employees who will be assigned appointments have connected their Google Calendar
3. **User Communication**: Notify users about the new requirement for assigned employees to connect their calendars
4. **Monitoring**: Add logging to track calendar event creation success/failure rates per employee
