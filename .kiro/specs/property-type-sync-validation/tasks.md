# Implementation Plan: Property Type Sync Validation

## ⚠️ CRITICAL DISCOVERY

**Date**: 2025-12-09  
**Issue**: The spreadsheet does NOT have a "物件種別" (property_type) column

**Investigation Results**:
- Ran validation on 1000 sellers: Found 716 mismatches (71.6%)
- All 716 mismatches show: Database has values, Spreadsheet returns null
- Root cause: The spreadsheet column "物件種別" does not exist
- Available column: "種別" (type) exists, but not "物件種別" (property_type)

**Impact**:
- The validation system is working correctly
- The auto-fix functionality cannot work because there's no source data in spreadsheet
- The sync direction needs to be reversed: Database → Spreadsheet (not Spreadsheet → Database)

**Recommended Actions**:
1. **Option A - Add Column to Spreadsheet**: Add "物件種別" column to spreadsheet and populate from database
2. **Option B - Use Existing Column**: Map "種別" column to property_type field

3. **Option C - Reverse Sync Direction**: Change auto-fix to sync FROM database TO spreadsheet

**User Decision Required**: Which option should we proceed with?

---

- [x] 1. Create PropertyTypeValidationService core implementation
  - Implement main service class with validation and auto-fix logic


  - Add methods for comparing database and spreadsheet values
  - Implement batch processing for efficient validation
  - _Requirements: 1.1, 1.2, 1.3, 2.1, 2.2_
  - **COMPLETED**: Service implemented in `backend/src/services/PropertyTypeValidationService.ts`
  - **TESTED**: Validation script successfully detected 716 mismatches out of 1000 sellers

- [ ]* 1.1 Write property test for validation completeness
  - **Property 1: Validation Completeness**
  - **Validates: Requirements 1.1**

- [ ]* 1.2 Write property test for mismatch detection accuracy
  - **Property 2: Mismatch Detection Accuracy**
  - **Validates: Requirements 1.2**



- [ ] 2. Implement validation report generation
  - Create ValidationReport interface and generation logic
  - Add severity classification for mismatches
  - Implement skipped sellers tracking with reasons


  - Format reports for console and file output
  - _Requirements: 1.3, 1.4_

- [x] 3. Implement auto-fix functionality

  - Create auto-fix logic that updates database from spreadsheet
  - Add dry-run mode support
  - Implement change logging for all fixes
  - Add error handling for individual seller failures
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [ ]* 3.1 Write property test for auto-fix correctness
  - **Property 3: Auto-Fix Correctness**
  - **Validates: Requirements 2.1**

- [ ]* 3.2 Write property test for auto-fix idempotence
  - **Property 4: Auto-Fix Idempotence**
  - **Validates: Requirements 2.1**



- [ ]* 3.3 Write property test for dry-run safety
  - **Property 5: Dry-Run Safety**
  - **Validates: Requirements 4.3**





- [x] 4. Create validation standalone script
  - Implement validate-property-types.ts script
  - Add command-line argument parsing (--seller flag)
  - Add console output formatting
  - Add file output for validation reports
  - _Requirements: 4.1, 4.4_
  - **COMPLETED**: Script implemented in `backend/validate-property-types.ts`
  - **TESTED**: Successfully validated 1000 sellers in 6.055 seconds

- [x] 5. Create auto-fix standalone script
  - Implement fix-property-types.ts script
  - Add command-line argument parsing (--dry-run, --seller flags)
  - Add confirmation prompts for non-dry-run mode
  - Add progress indicators for batch operations
  - _Requirements: 4.2, 4.3, 4.4_
  - **COMPLETED**: Script implemented in `backend/fix-property-types.ts`
  - **NOT TESTED**: Awaiting resolution of spreadsheet column issue

- [ ] 6. Integrate validation with sync process
  - Add post-sync validation hook to MigrationService
  - Implement non-blocking validation execution
  - Add validation queue management for concurrent syncs
  - Add error logging for post-sync validation failures
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [ ]* 6.1 Write property test for post-sync validation trigger
  - **Property 7: Post-Sync Validation Trigger**
  - **Validates: Requirements 3.1, 3.4**

- [ ] 7. Implement activity log integration
  - Create activity log entries for validation events
  - Create activity log entries for auto-fix operations
  - Add severity levels and detailed information
  - Implement threshold-based high-priority alerts
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [ ]* 7.1 Write property test for logging consistency
  - **Property 6: Logging Consistency**
  - **Validates: Requirements 2.2, 5.3**

- [ ] 8. Add comprehensive error handling
  - Implement error categorization (config, data, network, validation)
  - Add retry logic for network errors
  - Add graceful degradation for individual seller failures
  - Ensure batch operations continue despite individual errors
  - _Requirements: 4.5, 6.1, 6.2, 6.3, 6.4, 6.5_

- [ ]* 8.1 Write property test for error handling resilience
  - **Property 8: Error Handling Resilience**
  - **Validates: Requirements 4.5**

- [ ]* 9. Write unit tests for core functionality
  - Test validateSeller() method
  - Test autoFixSeller() method
  - Test value comparison logic
  - Test report generation
  - Test error scenarios

- [ ]* 10. Write integration tests
  - Test full validation run with mixed data
  - Test auto-fix with dry-run vs actual execution
  - Test post-sync validation trigger
  - Test script execution with various arguments

- [ ] 11. Add performance optimizations
  - Implement batch database queries
  - Add in-memory caching for spreadsheet data
  - Implement parallel processing with concurrency limits

  - Add progress tracking for long-running operations
  - _Requirements: 4.4_

- [ ] 12. Create documentation
  - Add JSDoc comments to all public methods
  - Create README for scripts with usage examples
  - Document error codes and troubleshooting steps
  - Add examples of validation reports



- [ ] 13. Test with real data
  - Run validation script on current database
  - Verify AA4801 and other known mismatches are detected
  - Run auto-fix with dry-run mode
  - Verify fixes are correct before applying
  - _Requirements: 1.1, 1.2, 2.1_

- [ ] 14. Deploy and monitor
  - Deploy PropertyTypeValidationService
  - Deploy standalone scripts
  - Integrate with sync process
  - Monitor validation metrics and alerts
  - _Requirements: 5.1, 5.2_

- [ ] 15. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.
