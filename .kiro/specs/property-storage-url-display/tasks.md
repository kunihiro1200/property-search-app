# Implementation Plan

- [x] 1. Add backend API endpoint for fetching work task by property number


  - Create GET endpoint `/api/work-tasks/property/:propertyNumber` in `backend/src/routes/workTasks.ts`
  - Use existing `WorkTaskService.getByPropertyNumber()` method
  - Return work task data or 404 if not found
  - Add error handling for database errors
  - _Requirements: 2.1, 2.2, 2.3_

- [ ]* 1.1 Write unit tests for work task API endpoint
  - Test successful retrieval with valid property number
  - Test 404 response for non-existent property number
  - Test error handling for database failures
  - _Requirements: 2.1, 2.2, 2.3_



- [ ] 2. Update PropertyDetailsSection component to display storage URL
  - Add `storageUrl` prop to component interface
  - Add storage URL field in the Grid layout
  - Display URL as clickable link with external icon when URL exists
  - Display placeholder "-" when URL is null/undefined
  - Ensure field is read-only in both view and edit modes
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 3.1, 3.2, 3.3, 3.4_

- [ ]* 2.1 Write unit tests for PropertyDetailsSection storage URL display
  - Test component renders with storage URL prop
  - Test link rendering when URL exists
  - Test placeholder rendering when URL is null


  - Test read-only behavior in edit mode
  - _Requirements: 1.1, 1.2, 1.3, 1.5_

- [ ] 3. Update PropertyListingDetailPage to fetch and pass work task data
  - Add state for work task data
  - Add useEffect to fetch work task data on page load
  - Handle fetch errors gracefully without breaking page
  - Pass storage URL to PropertyDetailsSection component
  - _Requirements: 2.1, 2.2, 2.3, 2.4_

- [x]* 3.1 Write integration tests for property detail page with storage URL



  - Test full flow: page load → fetch work task → display URL
  - Test error scenario: work task fetch failure
  - Test scenario: no work task data exists
  - _Requirements: 2.1, 2.2, 2.3, 2.4_

- [ ] 4. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.
