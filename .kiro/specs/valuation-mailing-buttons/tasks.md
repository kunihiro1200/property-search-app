# Implementation Plan

- [x] 1. Add mailing status state and handlers to CallModePage

  - [x] 1.1 Add state variables for mailing status management
    - Add `editedMailingStatus` state initialized from seller data
    - Add `editedMailSentDate` state initialized from seller data
    - Add `savingMailingStatus` loading state
    - _Requirements: 4.1_

  - [x] 1.2 Implement mailing status update handler
    - Create `handleMailingStatusChange` function that accepts status ('未' | '済' | '不要')
    - When status is "済", set mailSentDate to current date
    - Call API to persist changes
    - Update local state on success
    - Handle errors with user feedback
    - _Requirements: 1.1, 1.2, 2.1, 2.2, 2.3, 3.1, 3.2_

  - [x]* 1.3 Write property test for mailing status update logic
    - **Property 1: Mailing status button click updates status correctly**
    - **Property 2: Mail sent date is set when status becomes "済"**
    - **Validates: Requirements 1.1, 2.1, 2.2, 3.1**

- [x] 2. Implement mailing status UI in valuation section

  - [x] 2.1 Add mailing status buttons to valuation section (view mode)
    - Add "郵送" button (sets status to "未") with appropriate styling
    - Add "済" button (sets status to "済") with appropriate styling
    - Add "不要" button (sets status to "不要") with appropriate styling
    - Display mail sent date when status is "済"
    - Position buttons below valuation amount display
    - _Requirements: 1.3, 2.4, 3.3, 4.1, 4.2, 5.1, 5.2_

  - [x] 2.2 Add mailing status buttons to valuation section (edit mode)
    - Ensure buttons remain visible in edit mode
    - Maintain consistent styling with view mode
    - _Requirements: 5.3_

  - [x]* 2.3 Write property test for visual state based on mailing status
    - **Property 3: Visual state reflects mailing status**
    - **Property 4: Mail sent date display when status is "済"**
    - **Validates: Requirements 1.3, 2.4, 3.3, 4.1, 4.2**

- [x] 3. Implement button interaction and state transitions
  - [x] 3.1 Implement button click handlers
    - Wire "郵送" button to call handleMailingStatusChange with "未"
    - Wire "済" button to call handleMailingStatusChange with "済"
    - Wire "不要" button to call handleMailingStatusChange with "不要"
    - Add loading state to disable buttons during API call
    - _Requirements: 1.1, 2.1, 3.1, 4.4_

  - [x] 3.2 Add success feedback
    - Show success message after status update
    - Clear success message after timeout
    - _Requirements: 1.1, 2.1, 3.1_

  - [x]* 3.3 Write property test for button availability
    - **Property 5: Button availability based on status**
    - **Property 6: Buttons visible regardless of edit mode**
    - **Validates: Requirements 4.3, 4.4, 5.2, 5.3**

- [x] 4. Checkpoint - All implementation complete

- [x] 5. Initialize mailing status from seller data
  - [x] 5.1 Update loadAllData to initialize mailing status state
    - Extract mailingStatus from seller response
    - Extract mailSentDate from seller response
    - Format mailSentDate for display
    - _Requirements: 4.1, 4.2_

- [x] 6. Backend support added
  - [x] 6.1 Added mailingStatus and mailSentDate handling to updateSeller function
  - [x] 6.2 Added mailingStatus and mailSentDate to decryptSeller function

## Implementation Complete ✅

All tasks have been implemented. The mailing status buttons feature is ready for testing.
