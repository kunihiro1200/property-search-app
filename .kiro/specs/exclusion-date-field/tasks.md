# Implementation Plan

- [x] 1. Create ExclusionDateCalculator service




  - Create new service file with calculation logic
  - Implement site-specific calculation rules (Y, ウ, L, す, a)
  - Handle edge cases (null inputs, future dates, out-of-range dates)
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_

- [ ]* 1.1 Write property test for site Y calculation
  - **Property 1: Exclusion date calculation for site Y**
  - **Validates: Requirements 2.1**

- [ ]* 1.2 Write property test for site ウ calculation
  - **Property 2: Exclusion date calculation for site ウ**
  - **Validates: Requirements 2.2**

- [ ]* 1.3 Write property test for site L calculation
  - **Property 3: Exclusion date calculation for site L**
  - **Validates: Requirements 2.3**

- [ ]* 1.4 Write property test for site す calculation
  - **Property 4: Exclusion date calculation for site す**
  - **Validates: Requirements 2.4**

- [ ]* 1.5 Write property test for site a calculation
  - **Property 5: Exclusion date calculation for site a**
  - **Validates: Requirements 2.5**

- [ ]* 1.6 Write property test for null exclusion date
  - **Property 6: Null exclusion date for invalid conditions**
  - **Validates: Requirements 2.6**

- [ ]* 1.7 Write property test for future inquiry dates
  - **Property 8: Future inquiry dates excluded**
  - **Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5**

- [ ]* 1.8 Write unit tests for ExclusionDateCalculator
  - Test each site type with valid inputs
  - Test boundary conditions (exactly at max days)
  - Test invalid inputs (null, undefined)
  - Test future dates
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_

- [x] 2. Integrate ExclusionDateCalculator into SellerService


  - Import ExclusionDateCalculator in SellerService
  - Add calculation to getById() method
  - Add calculation to update() method
  - Add calculation to create() method (if applicable)
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 4.1, 4.2, 4.3, 4.4_

- [ ]* 2.1 Write integration tests for SellerService
  - Test that getById() returns calculated exclusion date
  - Test that update() recalculates exclusion date
  - Test that exclusion date is stored in database
  - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [x] 3. Add exclusion date field to CallModePage


  - Add exclusionDate state variable
  - Add TextField component for exclusion date display
  - Position field above next call date field
  - Make field read-only
  - Add helper text explaining auto-calculation
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [x] 4. Update CallModePage data loading


  - Update loadSellerData() to set exclusionDate state
  - Handle null exclusion date (display as "-")
  - Format date for display (YYYY-MM-DD)
  - _Requirements: 3.1, 3.2_

- [ ]* 4.1 Write property test for exclusion date recalculation
  - **Property 7: Exclusion date recalculation on data load**
  - **Validates: Requirements 3.1, 3.2**

- [x] 5. Checkpoint - Ensure all tests pass



  - Ensure all tests pass, ask the user if questions arise.
