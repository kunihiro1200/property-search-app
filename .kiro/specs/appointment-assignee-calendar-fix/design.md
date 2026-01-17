# Design Document

## Overview

This design addresses a critical bug in the appointment creation flow where calendar events are created in the wrong employee's Google Calendar. The root cause is that the system correctly identifies the assigned employee but may be using incorrect data when creating the calendar event. This design ensures proper employee lookup, validation, and calendar event creation with comprehensive logging for debugging.

## Architecture

The fix involves three main components:

1. **Employee Lookup Layer** (`EmployeeUtils`): Validates and retrieves employee information
2. **Calendar Service Layer** (`CalendarService.supabase.ts`): Creates calendar events in the correct employee's calendar
3. **API Route Layer** (`appointments.ts`): Orchestrates the appointment creation flow

The data flow is:
```
User Input (initials) → EmployeeUtils (lookup) → CalendarService (create event) → Database (save appointment)
```

## Components and Interfaces

### EmployeeUtils Enhancement

**Current Issues:**
- Limited logging makes debugging difficult
- No validation that employee has required email
- No check for duplicate initials

**Enhanced Interface:**
```typescript
interface EmployeeLookupResult {
  id: string;
  name: string;
  email: string;
  initials: string;
}

class EmployeeUtils {
  // Enhanced method with validation and logging
  async getEmployeeByInitials(initials: string): Promise<EmployeeLookupResult | null>;
  
  // Validate employee has required fields for calendar operations
  async validateEmployeeForCalendar(employeeId: string): Promise<boolean>;
  
  // Get detailed employee info with validation
  async getEmployeeWithValidation(employeeId: string): Promise<EmployeeLookupResult | null>;
}
```

### CalendarService Enhancement

**Current Issues:**
- Insufficient logging of which calendar is being used
- No verification that the correct employee's calendar is targeted
- Error messages don't indicate which employee's calendar failed

**Enhanced Logging Points:**
```typescript
class CalendarService {
  async createAppointment(
    request: AppointmentRequest,
    assignedEmployeeId: string,
    sellerName: string,
    sellerPhone: string,
    propertyAddress: string
  ): Promise<Appointment> {
    // Log 1: Entry point with assigned employee
    console.log('Creating appointment for assigned employee:', assignedEmployeeId);
    
    // Log 2: Employee email lookup
    console.log('Retrieved employee email:', employeeEmail, 'for ID:', assignedEmployeeId);
    
    // Log 3: Calendar event creation
    console.log('Creating calendar event in calendar:', employeeEmail);
    
    // Log 4: Success confirmation
    console.log('Calendar event created:', eventId, 'in calendar:', employeeEmail);
  }
}
```

### Appointments Route Enhancement

**Current Issues:**
- Logs don't show the full flow from initials to employee ID to email
- No validation that assigned employee matches the calendar target

**Enhanced Flow:**
```typescript
router.post('/', async (req, res) => {
  // Log 1: Request received
  console.log('Appointment request:', { assignedTo: req.body.assignedTo });
  
  // Log 2: Employee lookup
  const assignedEmployee = await employeeUtils.getEmployeeByInitials(assignedTo);
  console.log('Resolved employee:', { 
    initials: assignedTo, 
    employeeId: assignedEmployee.id,
    email: assignedEmployee.email 
  });
  
  // Log 3: Validation
  const isValid = await employeeUtils.validateEmployeeForCalendar(assignedEmployee.id);
  console.log('Employee calendar validation:', isValid);
  
  // Log 4: Calendar service call
  console.log('Calling calendar service with assignedEmployeeId:', assignedEmployee.id);
  
  // Create appointment...
});
```

## Data Models

### Appointment Model (existing)
```typescript
interface Appointment {
  id: string;
  seller_id: string;
  employee_id: string;           // Creator of the appointment
  assigned_employee_id: string;  // Employee assigned to handle it (営担)
  start_time: string;
  end_time: string;
  location: string;
  calendar_event_id: string | null;
  assigned_to: string;           // Initials of assigned employee
  notes: string | null;
  created_by_name: string;
  created_at: string;
}
```

### Employee Model (existing)
```typescript
interface Employee {
  id: string;
  google_id: string;
  email: string;
  name: string;
  role: 'admin' | 'agent' | 'viewer';
  is_active: boolean;
  created_at: string;
  last_login_at: string | null;
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Employee lookup consistency
*For any* valid employee initials, looking up the employee should return the same employee ID on repeated calls
**Validates: Requirements 1.1**

### Property 2: Calendar target correctness
*For any* appointment creation with assigned employee ID, the calendar event should be created using the email address associated with that employee ID
**Validates: Requirements 1.2**

### Property 3: Database consistency
*For any* successfully created appointment, the assigned_employee_id in the database should match the employee whose calendar contains the event
**Validates: Requirements 1.4**

### Property 4: Employee validation completeness
*For any* employee used for calendar operations, the employee must have a non-null, non-empty email address
**Validates: Requirements 3.2**

### Property 5: Initials uniqueness
*For any* set of active employees, no two employees should have identical initials
**Validates: Requirements 3.4**

## Error Handling

### Employee Lookup Errors

1. **Employee Not Found**
   - Error Code: `ASSIGNED_EMPLOYEE_NOT_FOUND`
   - Message: `営担（{initials}）が見つかりません`
   - HTTP Status: 404
   - Retryable: No

2. **Missing Email**
   - Error Code: `EMPLOYEE_EMAIL_MISSING`
   - Message: `営担（{initials}）のメールアドレスが設定されていません`
   - HTTP Status: 400
   - Retryable: No

3. **Ambiguous Initials**
   - Error Code: `AMBIGUOUS_INITIALS`
   - Message: `イニシャル（{initials}）が複数の社員に一致します`
   - HTTP Status: 400
   - Retryable: No

### Calendar Creation Errors

1. **Google Auth Required**
   - Error Code: `GOOGLE_AUTH_REQUIRED`
   - Message: `営担（{initials}）がGoogleカレンダーを接続していません`
   - HTTP Status: 400
   - Retryable: No

2. **Calendar API Error**
   - Error Code: `CALENDAR_API_ERROR`
   - Message: `カレンダーイベントの作成に失敗しました: {details}`
   - HTTP Status: 500
   - Retryable: Yes

### Logging Strategy

All errors should log:
- The initials provided
- The employee ID resolved (if any)
- The email address used (if any)
- The calendar ID targeted (if any)
- The full error stack trace

## Testing Strategy

### Unit Tests

1. **EmployeeUtils Tests**
   - Test initials extraction from various name formats
   - Test employee lookup with valid/invalid initials
   - Test validation of employee data
   - Test handling of missing email addresses
   - Test detection of duplicate initials

2. **CalendarService Tests**
   - Test that correct employee email is retrieved
   - Test that calendar event uses correct calendar ID
   - Test error handling when employee email is missing
   - Test logging output contains expected information

3. **Integration Tests**
   - Test full flow from initials to calendar event creation
   - Test that database stores correct assigned_employee_id
   - Test that calendar event is in correct employee's calendar
   - Test error scenarios with detailed logging

### Property-Based Tests

Property-based testing will use **fast-check** library for TypeScript. Each test should run a minimum of 100 iterations.

1. **Property Test: Employee Lookup Consistency**
   - Generate random valid employee data
   - Verify repeated lookups return same result
   - Tag: **Feature: appointment-assignee-calendar-fix, Property 1: Employee lookup consistency**

2. **Property Test: Calendar Target Correctness**
   - Generate random appointment requests with employee assignments
   - Mock calendar service to capture calendar ID used
   - Verify calendar ID matches assigned employee's email
   - Tag: **Feature: appointment-assignee-calendar-fix, Property 2: Calendar target correctness**

3. **Property Test: Database Consistency**
   - Generate random appointments
   - Verify assigned_employee_id in database matches calendar owner
   - Tag: **Feature: appointment-assignee-calendar-fix, Property 3: Database consistency**

### Manual Testing Checklist

1. Create appointment assigned to Ikuno (生野)
   - Verify event appears in Ikuno's calendar
   - Verify event does NOT appear in Kunihiro's calendar
   - Check logs show correct employee email

2. Create appointment assigned to Kunihiro (国)
   - Verify event appears in Kunihiro's calendar
   - Check logs show correct employee email

3. Create appointment with invalid initials
   - Verify appropriate error message
   - Verify no calendar event created

4. Create appointment for employee without email
   - Verify appropriate error message
   - Verify no database record created

## Implementation Notes

### Root Cause Analysis

The bug likely occurs because:
1. The `assignedEmployeeId` is correctly passed to `createAppointment`
2. However, when retrieving the employee email, the code may be using the wrong employee ID (possibly `request.employeeId` instead of `assignedEmployeeId`)
3. Or the employee lookup is returning the wrong employee due to initials collision

### Key Fix Points

1. **In CalendarService.createAppointment**: Ensure the employee email lookup uses `assignedEmployeeId` parameter, NOT `request.employeeId`

2. **In EmployeeUtils**: Add validation to detect and prevent duplicate initials

3. **Add comprehensive logging**: Every step should log which employee ID and email is being used

### Backward Compatibility

This fix maintains backward compatibility:
- No database schema changes required
- No API contract changes
- Existing appointments remain unchanged
- Only the calendar event creation logic is fixed

## Deployment Considerations

1. **Pre-deployment Validation**
   - Verify all active employees have unique initials
   - Verify all active employees have valid email addresses
   - Run script to check for potential initials collisions

2. **Post-deployment Monitoring**
   - Monitor logs for calendar creation events
   - Verify calendar events are created in correct calendars
   - Check for any ASSIGNED_EMPLOYEE_NOT_FOUND errors

3. **Rollback Plan**
   - No database migrations required, so rollback is simple code revert
   - Existing appointments are not affected
