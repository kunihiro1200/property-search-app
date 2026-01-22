# Implementation Plan

- [x] 1. Add database migration for assigned_employee_id


  - Create migration file to add `assigned_employee_id` column to `appointments` table
  - Add foreign key constraint to `employees` table
  - _Requirements: 1.1_



- [ ] 2. Create employee lookup utility
  - [ ] 2.1 Implement function to map employee initials to employee ID
    - Write function that queries employees table by initials
    - Handle case-insensitive matching
    - Return employee ID or null if not found
    - _Requirements: 1.1_
  
  - [ ]* 2.2 Write unit tests for employee lookup
    - Test successful lookup with valid initials
    - Test case-insensitive matching
    - Test null return for non-existent initials



    - _Requirements: 1.1_


- [ ] 3. Modify CalendarService to use assigned employee's credentials
  - [ ] 3.1 Update createAppointment method signature
    - Add `assignedEmployeeId` parameter
    - Update method to use assigned employee's OAuth client

    - _Requirements: 1.1_
  
  - [ ] 3.2 Update createCalendarEvent to accept employeeId
    - Modify method to get authenticated client for specific employee
    - Use employee's calendar instead of 'primary'
    - _Requirements: 1.1_
  
  - [ ] 3.3 Add validation for assigned employee calendar connection
    - Check if assigned employee has connected Google Calendar before creating event
    - Throw appropriate error if not connected
    - _Requirements: 1.2_
  
  - [x]* 3.4 Write property test for calendar event creation


    - **Property 1: Calendar event created in assigned employee's calendar**
    - **Validates: Requirements 1.1**
  
  - [ ]* 3.5 Write property test for connection validation
    - **Property 2: Appointment creation fails when assigned employee not connected**


    - **Validates: Requirements 1.2**

- [ ] 4. Update appointment creation endpoint
  - [x] 4.1 Modify POST /appointments route

    - Extract `assignedTo` from request body
    - Look up employee ID from initials
    - Validate employee exists
    - Pass `assignedEmployeeId` to CalendarService
    - _Requirements: 1.1, 1.2_
  
  - [ ] 4.2 Add error handling for calendar connection issues
    - Handle GOOGLE_AUTH_REQUIRED error
    - Handle ASSIGNED_EMPLOYEE_NOT_FOUND error
    - Return user-friendly Japanese error messages


    - _Requirements: 1.2, 1.4_
  
  - [x] 4.3 Update database insert to include assigned_employee_id


    - Add `assigned_employee_id` field to appointment insert
    - _Requirements: 1.1_
  
  - [ ]* 4.4 Write integration test for appointment creation flow
    - Test successful appointment creation with connected employee
    - Test error when assigned employee not connected
    - Test error when assigned employee not found
    - _Requirements: 1.1, 1.2_

- [ ] 5. Add employee calendar connection status endpoint
  - [ ] 5.1 Create GET /employees/:id/calendar-status endpoint
    - Return connection status for specific employee


    - Include token expiry information
    - _Requirements: 2.4_
  


  - [ ] 5.2 Create GET /employees endpoint with calendar status
    - Return list of employees with calendar connection status
    - Support filtering by connection status


    - _Requirements: 3.1, 3.3_
  
  - [x]* 5.3 Write property test for connection status detection



    - **Property 3: Token refresh on expiry**
    - **Validates: Requirements 1.3**
  
  - [ ]* 5.4 Write property test for invalid token detection
    - **Property 4: Clear error on invalid token**
    - **Validates: Requirements 1.4**

- [ ] 6. Update frontend to display calendar connection requirements
  - [ ] 6.1 Add calendar connection status indicator to employee selection
    - Show icon or badge indicating if employee has connected calendar
    - Display warning if selected employee hasn't connected calendar
    - _Requirements: 1.2_
  
  - [ ] 6.2 Update appointment form validation
    - Prevent submission if assigned employee hasn't connected calendar
    - Show clear error message in Japanese
    - _Requirements: 1.2_
  
  - [ ] 6.3 Add employee calendar connection status page
    - Display list of employees with connection status
    - Provide link to connect calendar for each employee
    - _Requirements: 3.1_

- [ ] 7. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.
