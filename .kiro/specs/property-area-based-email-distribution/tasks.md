# Implementation Plan

- [x] 1. Database schema changes and migration


  - Add distribution_areas column to property_listings table
  - Create index for performance
  - Write migration script
  - _Requirements: 1.7, 1.8_



- [x] 2. Implement PropertyDistributionAreaCalculator service
- [x] 2.1 Create core calculation service
  - Implement calculateDistributionAreas method
  - Implement radius-based area matching (3KM)
  - Implement city-wide area matching (㊵, ㊶)
  - Integrate with EnhancedGeolocationService and AreaMapConfigService
  - _Requirements: 1.2, 1.3, 1.4, 1.5_

- [ ]* 2.2 Write property test for radius calculation accuracy
  - **Property 1: Radius-based area calculation accuracy**
  - **Validates: Requirements 1.2**

- [ ]* 2.3 Write property test for city area inclusion
  - **Property 2: Oita City area inclusion**

  - **Property 3: Beppu City area inclusion**
  - **Validates: Requirements 1.3, 1.4**

- [x] 2.4 Implement area number parsing and validation
  - Implement parseAreaNumbers method
  - Implement validateAreaNumbers method
  - Implement formatAreaNumbers method
  - Support multiple input formats (comma, space, continuous)
  - _Requirements: 2.3_

- [ ]* 2.5 Write property test for parsing consistency
  - **Property 5: Area number parsing consistency**
  - **Validates: Requirements 2.3**

- [ ]* 2.6 Write unit tests for calculator service
  - Test with known coordinates and expected areas
  - Test with invalid Google Map URLs
  - Test with missing coordinates
  - Test city detection logic


  - _Requirements: 1.2, 1.3, 1.4, 2.3_


- [ ] 3. Create API endpoints for distribution area management
- [x] 3.1 Implement POST /api/properties/:propertyNumber/calculate-distribution-areas


  - Extract coordinates from Google Map URL
  - Calculate distribution areas
  - Return formatted result
  - Handle errors gracefully

  - _Requirements: 1.2, 1.3, 1.4, 1.5_

- [x] 3.2 Update PUT /api/propertyListings/:propertyNumber endpoint
  - Accept distribution_areas field in request body
  - Validate area number format
  - Save to database
  - _Requirements: 1.6, 1.7_

- [x] 3.3 Update GET /api/propertyListings/:propertyNumber endpoint
  - Include distribution_areas in response
  - _Requirements: 1.8_

- [ ]* 3.4 Write property test for distribution area persistence
  - **Property 4: Distribution area persistence**


  - **Validates: Requirements 1.7, 1.8**

- [ ]* 3.5 Write unit tests for API endpoints
  - Test calculation endpoint with valid/invalid inputs
  - Test update endpoint with valid/invalid area numbers
  - Test retrieval endpoint
  - _Requirements: 1.2, 1.5, 1.6, 1.7, 1.8_




- [x] 4. Update buyer distribution service
- [x] 4.1 Modify EnhancedBuyerDistributionService
  - Read distribution_areas from property instead of calculating
  - Implement area matching logic using pre-calculated areas
  - Remove real-time coordinate calculation from distribution flow
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [ ]* 4.2 Write property test for geographic matching
  - **Property 6: Geographic matching correctness**
  - **Validates: Requirements 2.4, 2.5**

- [x] 4.3 Implement filter validation
  - Check if distribution_areas is empty
  - Display warning if empty
  - Prevent filtering if no areas set
  - _Requirements: 2.2_

- [ ]* 4.4 Write unit tests for distribution service updates
  - Test area matching logic
  - Test empty distribution_areas handling
  - Test with various buyer/property combinations
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_


- [ ] 5. Implement filter logic verification
- [ ] 5.1 Verify distribution flag filtering
  - Ensure buyers with "要" are included
  - Ensure buyers without "要" are excluded
  - _Requirements: 3.1, 3.2, 3.3_

- [ ]* 5.2 Write property test for distribution flag filtering
  - **Property 7: Distribution flag filtering**
  - **Validates: Requirements 3.2, 3.3**

- [ ] 5.3 Verify status filtering
  - Ensure buyers with "買付" or "D" are excluded
  - Ensure buyers without these statuses are included
  - _Requirements: 3.4, 3.5, 3.6_

- [ ]* 5.4 Write property test for status filtering
  - **Property 8: Status filtering**
  - **Validates: Requirements 3.5, 3.6**

- [ ] 5.5 Verify price range filtering
  - Handle "指定なし" (not specified) correctly
  - Handle empty price range correctly
  - Match property price with buyer's range for correct property type
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_

- [ ]* 5.6 Write property test for price range filtering
  - **Property 9: Price range filtering**
  - **Validates: Requirements 4.3, 4.4, 4.5, 4.6**

- [ ] 5.7 Verify combined eligibility logic
  - Ensure all four criteria are checked (geography, distribution, status, price)
  - Ensure buyers pass only if all criteria are met
  - _Requirements: 5.1, 5.2, 5.3_

- [ ]* 5.8 Write property test for combined eligibility
  - **Property 10: Combined eligibility logic**
  - **Validates: Requirements 5.1, 5.2, 5.3**

- [ ] 6. Implement email list generation
- [ ] 6.1 Implement BCC field population
  - Extract email addresses from qualifying buyers
  - Format according to email protocols
  - Remove duplicates
  - _Requirements: 5.4, 5.5_

- [ ]* 6.2 Write property test for email formatting
  - **Property 11: Email list count consistency**
  - **Validates: Requirements 6.1**

- [ ] 6.3 Implement buyer details display
  - Show count of qualifying buyers
  - Show each buyer's name and email
  - Show which criteria each buyer met/failed
  - _Requirements: 6.1, 6.2, 6.3_

- [ ] 6.4 Implement manual modification support
  - Allow manual addition/removal of email addresses
  - Preserve modifications until email is sent
  - _Requirements: 6.4, 6.5_

- [ ]* 6.5 Write unit tests for email list generation
  - Test BCC field population
  - Test email formatting
  - Test count accuracy
  - Test manual modifications
  - _Requirements: 5.4, 5.5, 6.1, 6.2, 6.3, 6.4, 6.5_


- [x] 7. Frontend implementation - Distribution area field
- [x] 7.1 Add distribution area input field to PropertyDetailPage
  - Create DistributionAreaField component
  - Display field in property details section
  - Style according to design system
  - _Requirements: 1.1_

- [x] 7.2 Implement auto-calculation on page load
  - Trigger calculation when property has Google Map URL
  - Populate field with calculated areas
  - Show loading state during calculation
  - Handle calculation errors
  - _Requirements: 1.2, 1.3, 1.4, 1.5_

- [x] 7.3 Implement manual editing functionality
  - Allow user to edit field value
  - Mark field as manually edited
  - Validate input format
  - Show validation errors
  - _Requirements: 1.6_

- [x] 7.4 Implement save functionality
  - Save distribution_areas when property is saved
  - Show success/error messages
  - Update UI state
  - _Requirements: 1.7_

- [x] 7.5 Implement display of saved areas
  - Load distribution_areas when property is loaded
  - Display in field
  - _Requirements: 1.8_

- [ ]* 7.6 Write unit tests for frontend components
  - Test field rendering
  - Test auto-calculation trigger
  - Test manual editing
  - Test save functionality
  - _Requirements: 1.1, 1.2, 1.5, 1.6, 1.7, 1.8_

- [x] 8. Frontend implementation - Recalculation flow
- [x] 8.1 Implement Google Map URL change detection
  - Detect when URL field is updated
  - Trigger recalculation
  - _Requirements: 7.1_

- [x] 8.2 Implement recalculation confirmation dialog
  - Show dialog if field was manually edited
  - Allow user to confirm or cancel
  - _Requirements: 7.3_

- [x] 8.3 Implement recalculation logic
  - On confirm: Replace with new calculated values
  - On cancel: Preserve existing values
  - Update field state
  - _Requirements: 7.2, 7.4, 7.5_

- [ ]* 8.4 Write property test for recalculation trigger
  - **Property 12: Recalculation trigger**
  - **Validates: Requirements 7.1, 7.2, 7.4, 7.5**

- [ ]* 8.5 Write unit tests for recalculation flow
  - Test URL change detection
  - Test confirmation dialog display
  - Test confirm/cancel behavior
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_


- [x] 9. Frontend implementation - Gmail distribution integration
- [x] 9.1 Update GmailDistributionButton component
  - Check if distribution_areas is set
  - Show warning if empty
  - Trigger distribution with pre-calculated areas
  - _Requirements: 2.1, 2.2_

- [x] 9.2 Update buyer filter display
  - Show which areas matched
  - Show filter results for each buyer
  - Display count of qualifying buyers
  - _Requirements: 6.1, 6.2, 6.3_

- [x] 9.3 Implement manual email modification UI
  - Allow adding/removing email addresses
  - Preserve modifications
  - Update BCC field
  - _Requirements: 6.4, 6.5_

- [ ]* 9.4 Write unit tests for Gmail distribution integration
  - Test empty distribution_areas handling
  - Test buyer filter display
  - Test manual modifications
  - _Requirements: 2.1, 2.2, 6.1, 6.2, 6.3, 6.4, 6.5_

- [x] 10. Data migration and backfill
- [x] 10.1 Create backfill script
  - Query all properties with google_map_url
  - Calculate distribution_areas for each
  - Update database
  - Log results and errors
  - _Requirements: 1.2, 1.3, 1.4, 1.7_

- [ ] 10.2 Run backfill on staging environment
  - Test with subset of data
  - Verify calculation accuracy
  - Check performance
  - _Requirements: 1.2, 1.3, 1.4, 1.7_

- [ ] 10.3 Run backfill on production environment
  - Execute during low-traffic period
  - Monitor progress
  - Verify results
  - _Requirements: 1.2, 1.3, 1.4, 1.7_

- [ ] 11. Integration testing and validation
- [ ]* 11.1 Write integration tests for complete distribution flow
  - Create property with Google Map URL
  - Verify auto-calculation
  - Manually edit areas
  - Save property
  - Trigger distribution
  - Verify buyer list
  - _Requirements: All_

- [ ]* 11.2 Write integration tests for recalculation flow
  - Create property with areas
  - Update Google Map URL
  - Verify recalculation prompt
  - Test confirm/cancel
  - Verify result
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

- [ ]* 11.3 Write integration tests for error handling
  - Test with invalid URLs
  - Test with missing data
  - Test with no matching buyers
  - Verify error messages
  - _Requirements: All_

- [ ] 12. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

