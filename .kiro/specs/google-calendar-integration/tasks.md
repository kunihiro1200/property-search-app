# Implementation Plan

- [x] 1. Set up Google Calendar API infrastructure


  - Create database migration for `google_calendar_tokens` table
  - Add Google OAuth configuration to environment variables
  - Install and configure googleapis package (already installed)
  - _Requirements: 5.1, 5.2, 5.3_



- [ ] 2. Implement GoogleAuthService for OAuth 2.0 authentication
  - Create `GoogleAuthService` class with OAuth client initialization
  - Implement `getAuthUrl()` method to generate OAuth consent URL
  - Implement `exchangeCodeForTokens()` method to exchange authorization code for tokens
  - Implement `getAccessToken()` method with automatic token refresh
  - Implement `revokeAccess()` method to disconnect Google Calendar
  - _Requirements: 1.1, 1.2, 1.4_

- [ ]* 2.1 Write property test for token encryption
  - **Property 1: Token encryption**
  - **Validates: Requirements 1.3**

- [ ]* 2.2 Write property test for token exchange
  - **Property 2: Token exchange success**
  - **Validates: Requirements 1.2**

- [x]* 2.3 Write property test for expired token handling


  - **Property 3: Expired token handling**
  - **Validates: Requirements 1.4**

- [ ] 3. Add OAuth authentication routes
  - Create `/api/auth/google/calendar` endpoint to initiate OAuth flow
  - Create `/api/auth/google/calendar/callback` endpoint to handle OAuth callback
  - Create `/api/auth/google/calendar/revoke` endpoint to disconnect calendar
  - Add error handling for OAuth failures
  - _Requirements: 1.1, 1.2, 1.4_

- [x]* 3.1 Write unit tests for OAuth routes


  - Test OAuth URL generation
  - Test callback handling with valid/invalid codes
  - Test revoke endpoint
  - _Requirements: 1.1, 1.2, 1.4_

- [ ] 4. Enhance CalendarService with Google Calendar API integration
  - Implement `createGoogleCalendarEvent()` method
  - Implement `updateGoogleCalendarEvent()` method
  - Implement `deleteGoogleCalendarEvent()` method
  - Add helper method to format event description with seller details
  - Add helper method to configure event reminders
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [ ]* 4.1 Write property test for calendar event creation
  - **Property 4: Appointment creates calendar event**
  - **Validates: Requirements 2.1, 2.5**

- [ ]* 4.2 Write property test for event content completeness
  - **Property 5: Calendar event content completeness**
  - **Validates: Requirements 2.2**

- [x]* 4.3 Write property test for event location

  - **Property 6: Calendar event location matches property**
  - **Validates: Requirements 2.3**

- [ ]* 4.4 Write property test for event reminders
  - **Property 7: Calendar event has required reminders**
  - **Validates: Requirements 2.4**

- [ ] 5. Update CalendarService appointment methods to use Google Calendar API
  - Update `createAppointment()` to call `createGoogleCalendarEvent()`
  - Update `updateAppointment()` to call `updateGoogleCalendarEvent()`
  - Update `cancelAppointment()` to call `deleteGoogleCalendarEvent()`
  - Add error handling with graceful degradation
  - Ensure local database operations succeed even if Google API fails
  - _Requirements: 2.1, 3.1, 3.2, 3.3, 3.4, 4.1, 4.2_

- [ ]* 5.1 Write property test for update synchronization
  - **Property 8: Appointment updates sync to calendar**
  - **Validates: Requirements 3.1, 3.2, 3.3**

- [ ]* 5.2 Write property test for update failure resilience
  - **Property 9: Update failure preserves local data**
  - **Validates: Requirements 3.4**



- [ ]* 5.3 Write property test for cancellation
  - **Property 10: Appointment cancellation deletes calendar event**
  - **Validates: Requirements 4.1**

- [ ]* 5.4 Write property test for cancellation resilience
  - **Property 11: Cancellation succeeds despite calendar API failure**
  - **Validates: Requirements 4.2**

- [ ] 6. Add frontend Google Calendar connection UI
  - Add "Connect Google Calendar" button to settings or profile page
  - Implement OAuth flow initiation on button click
  - Handle OAuth callback and display success/error messages

  - Add "Disconnect Google Calendar" button for connected users
  - Show connection status indicator
  - _Requirements: 1.1, 1.2_

- [ ]* 6.1 Write unit tests for frontend OAuth flow
  - Test button click initiates OAuth



  - Test callback handling
  - Test disconnect functionality
  - _Requirements: 1.1, 1.2_

- [ ] 7. Add error handling and user feedback
  - Display user-friendly error messages for OAuth failures
  - Show notification when calendar sync fails
  - Add retry mechanism for transient failures
  - Log all Google API errors for debugging
  - _Requirements: 3.4, 4.2_

- [ ] 8. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.
