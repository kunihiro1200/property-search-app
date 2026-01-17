# Implementation Plan

- [x] 1. Database setup and configuration




- [ ] 1.1 Create area_map_config table migration
  - Write SQL migration file for area_map_config table
  - Include indexes for performance


  - _Requirements: 6.1, 6.2_

- [x] 1.2 Populate initial area map data


  - Insert area numbers ①-⑮ with Google Maps URLs
  - Insert city-wide areas ㊵ (大分市) and ㊶ (別府市)
  - _Requirements: 6.1_




- [ ] 1.3 Run and verify migration
  - Execute migration script
  - Verify data integrity




  - Test rollback script
  - _Requirements: 6.1_

- [ ] 2. Backend: AreaMapConfigService
- [ ] 2.1 Implement AreaMapConfigService
  - Create service class with configuration loading
  - Implement caching mechanism
  - Add coordinate extraction and caching
  - _Requirements: 6.1, 6.2, 6.3_



- [ ] 2.2 Implement configuration validation
  - Validate Google Maps URL format
  - Handle missing or invalid configurations

  - Log errors appropriately
  - _Requirements: 6.4, 6.5_

- [ ]* 2.3 Write unit tests for AreaMapConfigService
  - Test configuration loading
  - Test caching behavior
  - Test error handling
  - _Requirements: 6.1, 6.2, 6.5_

- [ ] 3. Backend: EnhancedGeolocationService
- [ ] 3.1 Extend GeolocationService with multi-area support
  - Implement getAreaMapCoordinates()


  - Implement isWithinRadiusOfAnyArea()
  - Implement isCityWideMatch()
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_


- [ ] 3.2 Implement area number extraction
  - Parse desired_area field for area numbers
  - Handle various formats (①②③, ①,②,③, etc.)
  - _Requirements: 1.1_


- [ ]* 3.3 Write unit tests for EnhancedGeolocationService
  - Test radius calculations for each area
  - Test city-wide matching
  - Test area number extraction

  - Test edge cases (exactly 3km, boundary conditions)
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [ ] 4. Backend: EnhancedBuyerDistributionService
- [x] 4.1 Implement geographic filtering


  - Integrate with EnhancedGeolocationService
  - Filter buyers by area proximity
  - Handle city-wide matching
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [ ] 4.2 Implement distribution flag filtering
  - Check distribution_type field for "要"
  - Exclude buyers with other values
  - _Requirements: 2.2, 2.3_

- [x] 4.3 Implement latest status filtering




  - Check latest_status field
  - Exclude buyers with "買付" or "D"



  - Include all other statuses
  - _Requirements: 2.4, 2.5, 2.6_

- [ ] 4.4 Implement price range filtering
  - Handle "指定なし" and empty values
  - Match property price against buyer range
  - Handle partial range specifications
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

- [ ] 4.5 Implement combined filtering logic
  - Apply all filters sequentially
  - Track filter results per buyer
  - Return comprehensive results
  - _Requirements: 4.1, 4.2, 4.3_

- [ ]* 4.6 Write unit tests for filtering logic
  - Test each filter independently
  - Test combined filtering
  - Test edge cases and null values
  - _Requirements: 1.1-1.5, 2.2-2.6, 3.1-3.6, 4.1-4.3_

- [x] 5. Backend: API endpoint
- [x] 5.1 Create new API endpoint
  - Add GET /api/property-listings/:propertyNumber/distribution-buyers-enhanced
  - Implement request validation
  - Integrate with EnhancedBuyerDistributionService
  - _Requirements: 4.4_

- [x] 5.2 Implement error handling
  - Handle property not found (404)
  - Handle invalid parameters (400)
  - Handle server errors (500)
  - Log errors appropriately
  - _Requirements: 4.4_

- [x] 5.3 Add response formatting
  - Format email list
  - Include filter statistics
  - Add optional detailed results
  - _Requirements: 4.4, 5.1, 5.2, 5.3_

- [ ]* 5.4 Write integration tests for API endpoint
  - Test successful requests
  - Test error scenarios
  - Test response format
  - _Requirements: 4.4, 5.1, 5.2, 5.3_


- [x] 6. Frontend: Service layer updates
- [x] 6.1 Update gmailDistributionService
  - Add fetchQualifiedBuyerEmailsEnhanced() method
  - Update to use new API endpoint
  - Handle new response format
  - _Requirements: 4.4, 5.1_

- [x] 6.2 Add error handling in service
  - Handle API errors gracefully
  - Provide user-friendly error messages
  - Implement retry logic
  - _Requirements: 5.1_

- [ ]* 6.3 Write unit tests for service updates
  - Test API integration
  - Test error handling
  - Test response parsing
  - _Requirements: 4.4, 5.1_

- [x] 7. Frontend: UI components
- [x] 7.1 Update GmailDistributionButton component
  - Add loading state during filtering
  - Display count of qualifying buyers
  - Update to use enhanced service
  - _Requirements: 5.1, 5.2_

- [x] 7.2 Implement buyer count display
  - Show number of qualifying buyers
  - Display loading indicator
  - Show error messages
  - _Requirements: 5.1_

- [x] 7.3 Add manual email adjustment capability
  - Allow viewing selected buyers
  - Enable manual addition/removal
  - Preserve manual changes
  - _Requirements: 5.4, 5.5_

- [x]* 7.4 Create BuyerFilterSummaryModal component (optional)
  - Display list of qualifying buyers
  - Show filter criteria results per buyer
  - Allow manual email editing
  - Add confirmation before opening Gmail
  - _Requirements: 5.2, 5.3, 5.4, 5.5_

- [ ]* 7.5 Write component tests
  - Test loading states
  - Test error display
  - Test buyer count display
  - Test manual adjustment
  - _Requirements: 5.1, 5.2, 5.4, 5.5_

- [ ] 8. Integration and testing
- [ ] 8.1 Test end-to-end buyer filtering
  - Create test property with known location
  - Create test buyers with various criteria
  - Verify correct buyers are selected
  - _Requirements: 1.1-1.5, 2.2-2.6, 3.1-3.6, 4.1-4.3_

- [ ] 8.2 Test Gmail URL generation
  - Test with various buyer counts
  - Test URL length limits
  - Test special characters in emails
  - _Requirements: 4.4, 4.5_

- [ ] 8.3 Manual testing checklist
  - Test geographic filtering for all areas
  - Test status filtering
  - Test price range filtering
  - Test UI/UX flows
  - _Requirements: All_

- [ ] 9. Documentation and deployment
- [ ] 9.1 Update API documentation
  - Document new endpoint
  - Add request/response examples
  - Document error codes
  - _Requirements: 4.4_

- [ ] 9.2 Create user guide
  - Document feature usage
  - Add screenshots
  - Explain filtering criteria
  - _Requirements: All_

- [ ] 9.3 Deploy to staging environment
  - Run database migrations
  - Deploy backend services
  - Deploy frontend updates
  - _Requirements: All_

- [ ] 9.4 Perform staging validation
  - Test with real data
  - Verify performance
  - Check error handling
  - _Requirements: All_

- [ ] 10. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.
