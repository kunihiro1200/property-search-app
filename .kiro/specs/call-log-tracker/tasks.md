# Implementation Plan

- [x] 1. Create CallLogDisplay component with basic structure



  - Create new component file `frontend/src/components/CallLogDisplay.tsx`
  - Define TypeScript interfaces for CallLog and component props
  - Implement basic component structure with Material-UI components
  - Add loading and error states
  - _Requirements: 2.1, 2.2, 2.3_

- [ ]* 1.1 Write property test for call log creation completeness
  - **Property 1: Call log creation completeness**
  - **Validates: Requirements 1.1, 1.2**

- [ ]* 1.2 Write property test for call log persistence
  - **Property 2: Call log persistence**

  - **Validates: Requirements 1.3**

- [ ] 2. Implement data fetching and filtering logic
  - Add API call to fetch activities for a seller
  - Filter activities to show only `phone_call` type
  - Transform Activity data to CallLog view model
  - Handle empty state when no call logs exist
  - _Requirements: 2.1, 2.5_

- [ ]* 2.1 Write property test for multiple calls creating distinct records
  - **Property 3: Multiple calls create distinct records**
  - **Validates: Requirements 1.4**

- [x]* 2.2 Write property test for call log display completeness

  - **Property 4: Call log display completeness**
  - **Validates: Requirements 2.1**

- [ ] 3. Implement sorting and display formatting
  - Sort call logs by created_at in descending order (newest first)
  - Format date and time for display (Japanese locale)
  - Extract and display employee name from activity data
  - Ensure content/memo fields are NOT displayed
  - _Requirements: 2.2, 2.3, 2.4, 3.1, 3.3_

- [ ]* 3.1 Write property test for call log display format
  - **Property 5: Call log display format**
  - **Validates: Requirements 2.2, 2.3**

- [ ]* 3.2 Write property test for call log sorting
  - **Property 6: Call log sorting**
  - **Validates: Requirements 2.4**

- [ ]* 3.3 Write property test for user distinction in logs
  - **Property 7: User distinction in logs**
  - **Validates: Requirements 3.1, 3.2**


- [ ]* 3.4 Write property test for user name format consistency
  - **Property 8: User name format consistency**
  - **Validates: Requirements 3.3**

- [ ] 4. Add call count display feature
  - Calculate total count of call logs for the seller
  - Display count in a prominent location (e.g., section header)
  - Update count when new call logs are added
  - _Requirements: 5.1, 5.2_



- [ ]* 4.1 Write property test for call count accuracy
  - **Property 10: Call count accuracy**
  - **Validates: Requirements 5.1, 5.2**



- [ ] 5. Integrate CallLogDisplay into SellerDetailPage
  - Import CallLogDisplay component in SellerDetailPage
  - Add CallLogDisplay to the page layout (appropriate section)
  - Pass seller ID as prop to the component
  - Test the integration visually
  - _Requirements: 2.1_

- [x] 6. Verify automatic logging from CallModePage


  - Review existing CallModePage save logic
  - Confirm that phone_call activities are created correctly
  - Test end-to-end flow: save call memo → view call log
  - _Requirements: 4.1_

- [ ]* 6.1 Write property test for call mode integration
  - **Property 9: Call mode integration**
  - **Validates: Requirements 4.1**

- [ ] 7. Add error handling and edge cases
  - Handle API errors gracefully with error messages


  - Display appropriate message when no call logs exist
  - Add retry functionality for failed API calls
  - Handle missing employee information gracefully
  - _Requirements: 2.5, 4.3_




- [ ]* 7.1 Write unit tests for error handling
  - Test API error scenarios
  - Test empty state display
  - Test missing employee data handling
  - _Requirements: 2.5, 4.3_

- [ ] 8. Style and polish the UI
  - Apply consistent styling with existing design system
  - Ensure responsive layout
  - Add appropriate spacing and visual hierarchy
  - Match the design shown in the reference image
  - _Requirements: 2.2, 5.3_

- [ ] 9. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.
