# Implementation Plan

- [x] 1. Create FiscalYearUtils utility class


  - Create utility class for fiscal year calculations
  - Implement methods for fiscal year period, month range, and previous year calculations
  - Handle edge cases for fiscal year transitions
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 6.1, 6.2, 6.3, 6.4, 6.5_

- [ ]* 1.1 Write property test for fiscal year period calculation
  - **Property 1: Fiscal year period calculation consistency**
  - **Validates: Requirements 1.1**

- [ ]* 1.2 Write property test for months elapsed calculation
  - **Property 2: Months elapsed calculation correctness**
  - **Validates: Requirements 1.2, 1.3, 1.4**

- [ ]* 1.3 Write property test for previous year range
  - **Property 3: Previous year range correspondence**
  - **Validates: Requirements 4.4, 5.4**

- [ ]* 1.4 Write property test for fiscal year transition
  - **Property 5: Fiscal year transition handling**
  - **Validates: Requirements 1.5, 6.5**

- [ ]* 1.5 Write unit tests for FiscalYearUtils
  - Test fiscal year period calculation for each month
  - Test months elapsed calculation
  - Test previous year range calculation
  - Test edge cases (fiscal year boundary months)
  - Test error handling for invalid inputs
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_




- [ ] 2. Enhance PerformanceMetricsService with monthly average calculations
  - Add method to calculate fiscal year monthly average
  - Add method to calculate previous year monthly average
  - Integrate FiscalYearUtils for date calculations
  - _Requirements: 2.4, 3.3, 4.2, 4.4, 5.3, 5.4, 6.4_

- [ ]* 2.1 Write property test for monthly average bounds
  - **Property 4: Monthly average calculation bounds**
  - **Validates: Requirements 2.4, 3.3, 4.2, 5.3**

- [ ]* 2.2 Write property test for rate calculation non-negativity
  - **Property 8: Rate calculation non-negativity**
  - **Validates: Requirements 2.1, 2.2, 3.3, 4.1, 4.2, 5.3**

- [ ]* 2.3 Write unit tests for monthly average calculations
  - Test fiscal year monthly average calculation
  - Test previous year monthly average calculation

  - Test with missing data scenarios
  - Test with partial year data
  - _Requirements: 2.4, 3.3, 4.2, 4.4, 5.3, 5.4_

- [ ] 3. Implement enhanced metrics calculation for visit appraisal rate
  - Calculate current month visit appraisal rate
  - Calculate fiscal year monthly average for visit appraisal rate
  - Include fixed target value (28%)
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [ ]* 3.1 Write property test for target value immutability
  - **Property 6: Target value immutability**
  - **Validates: Requirements 2.3, 3.4**

- [ ]* 3.2 Write unit tests for visit appraisal rate with averages
  - Test current rate calculation

  - Test fiscal year monthly average calculation
  - Test target value inclusion
  - Test display format
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [ ] 4. Implement enhanced metrics calculation for exclusive contracts
  - Calculate current month exclusive contract counts and rates by representative
  - Calculate fiscal year monthly average for each representative
  - Calculate total exclusive contract rate with monthly average
  - Include fixed target value (48%)
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [ ]* 4.1 Write property test for representative aggregation
  - **Property 7: Representative aggregation consistency**
  - **Validates: Requirements 3.1, 3.2, 5.1, 5.2**

- [x]* 4.2 Write unit tests for exclusive contracts with averages

  - Test by-representative calculation with monthly averages
  - Test total calculation with monthly average
  - Test target value inclusion
  - Test display format
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [ ] 5. Implement enhanced metrics calculation for competitor loss (unvisited)
  - Calculate current month competitor loss rate for unvisited properties
  - Calculate fiscal year monthly average
  - Calculate previous fiscal year monthly average
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_


- [ ]* 5.1 Write unit tests for competitor loss unvisited with averages
  - Test current rate calculation
  - Test fiscal year monthly average calculation
  - Test previous year monthly average calculation
  - Test display format
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [ ] 6. Implement enhanced metrics calculation for competitor loss (visited)
  - Calculate current month competitor loss counts and rates by representative
  - Calculate fiscal year monthly average for each representative
  - Calculate total competitor loss rate with monthly average
  - Calculate previous fiscal year monthly average for total
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_


- [ ]* 6.1 Write unit tests for competitor loss visited with averages
  - Test by-representative calculation with monthly averages
  - Test total calculation with monthly average
  - Test previous year monthly average calculation


  - Test display format
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [ ] 7. Create enhanced API endpoint
  - Update or create new endpoint to return enhanced metrics with monthly averages
  - Ensure backward compatibility with existing endpoint
  - Add proper error handling and logging
  - _Requirements: 1.5, 2.5, 3.5, 4.5, 5.5_

- [ ]* 7.1 Write integration tests for enhanced API endpoint
  - Test API response format




  - Test with various months (including fiscal year boundaries)
  - Test with missing previous year data
  - Test error scenarios
  - _Requirements: 1.5, 2.5, 3.5, 4.5, 5.5_









- [ ] 8. Update frontend component to display monthly averages
  - Update PerformanceMetricsSection component to fetch enhanced metrics
  - Implement display format for visit appraisal rate with monthly average and target
  - Implement display format for exclusive contracts with monthly averages and target
  - Implement display format for competitor loss (unvisited) with monthly and previous year averages
  - Implement display format for competitor loss (visited) with monthly and previous year averages
  - _Requirements: 2.5, 3.5, 4.5, 5.5_

- [ ]* 8.1 Write unit tests for frontend display formatting
  - Test formatWithAverage function
  - Test formatRepresentativeWithAverage function
  - Test target value display
  - Test previous year average display
  - _Requirements: 2.5, 3.5, 4.5, 5.5_

- [ ] 9. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 10. Manual testing and validation
  - Test with real data for current fiscal year
  - Test fiscal year transition (September to October)
  - Verify calculations match expected values
  - Verify display formats match requirements
  - Test with various months throughout the fiscal year
  - _Requirements: All_
