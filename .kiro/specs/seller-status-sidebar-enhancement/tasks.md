# Implementation Plan

- [x] 1. Create status filter utility functions

  - [x] 1.1 Create sellerStatusFilters.ts utility file with filter functions
    - Create `isTodayCall` function with date comparison and status/assignee checks
    - Create `isUnvaluated` function with valuation amount and inquiry date checks
    - Create `isMailingPending` function with mailing status check
    - Export all functions and types
    - _Requirements: 1.2, 2.2, 3.2_

  - [ ]* 1.2 Write property test for isTodayCall filter
    - **Property 1: 当日TEL Filter Correctness**
    - **Validates: Requirements 1.2**

  - [ ]* 1.3 Write property test for isUnvaluated filter
    - **Property 2: 未査定 Filter Correctness**
    - **Validates: Requirements 2.2**

  - [ ]* 1.4 Write property test for isMailingPending filter
    - **Property 3: 査定（郵送） Filter Correctness**
    - **Validates: Requirements 3.2**


- [x] 2. Update SellersPage sidebar with new status categories
  - [x] 2.1 Add new status category state and types
    - Update `StatusCategory` type to include 'unvaluated' and 'mailingPending'
    - Import filter functions from utility file
    - _Requirements: 1.1, 2.1, 3.1_

  - [x] 2.2 Implement category count calculation
    - Update `getCategoryCounts` function to calculate counts for all categories
    - Use imported filter functions for consistent logic
    - _Requirements: 4.1, 4.2, 4.3_

  - [x] 2.3 Update sidebar UI with new buttons
    - Add "未査定" button with count chip
    - Add "査定（郵送）" button with count chip
    - Apply distinct colors for each category
    - 件数が0の場合はボタンを非表示（Allは常に表示）
    - 査定不要の場合は未査定として表示しない
    - _Requirements: 1.1, 1.4, 2.1, 2.4, 3.1, 3.4, 5.1, 5.3_

  - [x] 2.4 Implement filter selection logic
    - Update `getFilteredSellers` function to handle all categories
    - Ensure "All" button clears filters
    - _Requirements: 1.3, 2.3, 3.3, 5.2_

- [x] 3. Checkpoint - Implementation complete
  - All core functionality implemented
  - 査定不要の場合は未査定から除外
  - 件数が0の場合はボタンを非表示

- [ ]* 4. Write unit tests for filter functions (Optional)
  - [ ]* 4.1 Write unit tests for isTodayCall function
    - Test with seller matching all conditions
    - Test with seller having wrong date
    - Test with seller having wrong status
    - Test with seller having assignee set
    - _Requirements: 1.2_



  - [ ]* 4.2 Write unit tests for isUnvaluated function
    - Test with seller matching all conditions
    - Test with seller having valuation amounts
    - Test with seller having old inquiry date
    - _Requirements: 2.2_

  - [ ]* 4.3 Write unit tests for isMailingPending function
    - Test with mailingStatus "未"
    - Test with mailingStatus "済"
    - Test with mailingStatus null
    - _Requirements: 3.2_

- [ ] 5. Final Checkpoint - Make sure all tests are passing
  - Ensure all tests pass, ask the user if questions arise.
