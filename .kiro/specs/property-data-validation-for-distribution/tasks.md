# Implementation Plan

- [x] 1. Fix EnhancedGeolocationService radius inconsistency



  - Update DEFAULT_RADIUS_KM from 3.0 to 10.0 in EnhancedGeolocationService
  - Ensure consistency across all geolocation services



  - _Requirements: 9.1, 9.2, 10.3_

- [ ] 2. Implement CityNameExtractor service
  - Create CityNameExtractor class with extraction patterns
  - Implement extractCityFromAddress() method
  - Implement normalizeCityName() method
  - Implement batchExtractCities() method
  - _Requirements: 3.1, 3.2, 3.5_

- [ ]* 2.1 Write unit tests for CityNameExtractor
  - Test extraction from various address formats


  - Test normalization of city names
  - Test handling of invalid addresses
  - Test edge cases (empty strings, special characters)
  - _Requirements: 3.1, 3.2_

- [ ] 3. Implement PropertyDataValidator service
  - Create PropertyDataValidator class
  - Implement validateProperty() method
  - Implement validateGoogleMapUrl() method
  - Implement validateCityField() method
  - Implement validatePropertyListing() method
  - Implement generateReport() method
  - _Requirements: 1.1, 1.2, 2.1, 2.2, 4.1, 4.2, 4.3, 4.4, 4.5_



- [ ]* 3.1 Write unit tests for PropertyDataValidator
  - Test validation of Google Map URLs
  - Test validation of city fields
  - Test validation of property listings
  - Test report generation
  - _Requirements: 1.1, 2.1_

- [ ] 4. Enhance PropertyDistributionAreaCalculator with debug capabilities
  - Add calculateWithDebugInfo() method
  - Add verifyRadiusCalculation() method
  - Add testWithKnownLocation() method
  - Add detailed distance logging
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 10.1, 10.2, 10.3, 10.4, 10.5_



- [ ]* 4.1 Write unit tests for enhanced calculator
  - Test calculation with valid data
  - Test calculation with missing Google Map URL
  - Test calculation with missing city
  - Test 10km radius calculation
  - Test city-wide area inclusion
  - Test combined area display
  - _Requirements: 9.1, 9.2, 9.3, 9.4_

- [x] 5. Enhance DataIntegrityDiagnosticService


  - Add diagnoseDistributionAreas() method
  - Add validateAllDistributionAreas() method
  - Add generateDistributionAreaReport() method
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

- [x]* 5.1 Write unit tests for diagnostic service


  - Test property diagnosis
  - Test distribution area validation
  - Test report generation
  - _Requirements: 8.1, 8.2, 8.3_



- [ ] 6. Create diagnostic script for data validation
  - Create validate-property-data.ts script
  - Implement database connection and query logic
  - Implement validation checks for all properties


  - Implement detailed report generation
  - Implement actionable recommendations
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

- [x] 7. Create batch city extraction script


  - Create batch-extract-cities.ts script
  - Implement progress tracking
  - Implement error handling for individual properties
  - Implement success/failure reporting
  - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [ ] 8. Create distribution area recalculation script
  - Create recalculate-distribution-areas.ts script
  - Implement batch processing with progress updates
  - Implement automatic recalculation trigger
  - _Requirements: 5.5, 6.5_



- [ ] 9. Create test script for known locations
  - Create test-distribution-calculation.ts script
  - Implement test cases for known addresses
  - Implement distance calculation verification
  - Implement expected vs actual comparison


  - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

- [ ] 10. Implement UI warning components
  - Create MissingGoogleMapUrlWarning component
  - Create MissingCityFieldWarning component

  - Create IncompleteDistributionAreasWarning component
  - Integrate warnings into PropertyDetailPage
  - _Requirements: 6.1, 6.2, 6.3, 6.4_

- [ ]* 10.1 Write unit tests for warning components
  - Test MissingGoogleMapUrlWarning rendering



  - Test MissingCityFieldWarning rendering
  - Test IncompleteDistributionAreasWarning rendering
  - Test warning display logic
  - _Requirements: 6.1, 6.2, 6.3_

- [ ] 11. Add auto-extract city button to property detail page
  - Add "自動抽出" button to city field
  - Implement onClick handler to call CityNameExtractor
  - Update city field with extracted value
  - Trigger distribution area recalculation
  - _Requirements: 3.1, 3.2, 6.4, 6.5_

- [ ] 12. Implement area config health check
  - Add healthCheck() method to AreaMapConfigService
  - Verify all area configs have valid coordinates
  - Verify area center points are correctly positioned
  - Log health check results
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

- [ ] 13. Add validation to distribution area calculation
  - Add pre-calculation validation checks
  - Skip calculation when required data is missing
  - Log warnings for missing data
  - Set distribution_areas to empty array when data is missing
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

- [ ] 14. Create comprehensive validation report endpoint
  - Create GET /api/validation/property-data endpoint
  - Return summary statistics
  - Return list of properties with issues
  - Return actionable recommendations
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [ ] 15. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 16. Test with real data
  - Run diagnostic script on production database
  - Verify AA13129 (大分市田尻北3-14) shows "㊵⑦"
  - Verify all properties within 10km of area centers are detected
  - Verify city-wide areas are correctly assigned
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 10.1, 10.2, 10.3, 10.4, 10.5_

- [ ] 17. Run batch city extraction on properties with missing city
  - Identify all properties with missing city field
  - Run batch extraction script
  - Verify cities are extracted correctly
  - Verify original addresses unchanged
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 5.1, 5.2, 5.3, 5.4_

- [ ] 18. Run distribution area recalculation on all properties
  - Run recalculation script on all properties
  - Verify all areas within 10km are included
  - Verify city-wide areas are included
  - Generate before/after comparison report
  - _Requirements: 5.5, 9.1, 9.2, 9.3, 9.4, 9.5_

- [ ] 19. Final checkpoint - Verify all requirements
  - Ensure all tests pass, ask the user if questions arise.
