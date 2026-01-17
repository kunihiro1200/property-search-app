# Implementation Plan

## ✅ ROOT CAUSE FIX COMPLETED

**Issue Identified**: The system was incorrectly querying `property_listings` table instead of `sellers` table.

**Fix Applied**: 
- Updated `EnhancedBuyerDistributionService.fetchProperty()` to query `sellers` table first (using `seller_number`)
- Added fallback to `property_listings` table if needed
- Fixed `DataIntegrityDiagnosticService` to use correct column names

**Files Modified**:
- `backend/src/services/EnhancedBuyerDistributionService.ts`
- `backend/src/services/DataIntegrityDiagnosticService.ts`

**Documentation**: See `ROOT_CAUSE_FIX.md` for detailed explanation.

---

## Original Implementation Tasks

- [x] 1. Implement Data Integrity Diagnostic Service
  - Create DataIntegrityDiagnosticService class
  - Implement diagnoseProperty method to check both tables
  - Implement diagnoseBatch method for multiple properties
  - Implement findAllMissingPropertyListings method
  - **FIXED**: Updated to use `seller_number` instead of `property_number`
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_



- [ ] 2. Implement Property Listing Sync Service
  - Create PropertyListingSyncService class
  - Implement syncFromSeller method to create property_listing from seller data
  - Implement field mapping from sellers to property_listings
  - Implement syncBatch method for multiple properties


  - Implement syncAllMissing method
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [ ] 3. Enhance API Error Handling
  - Update distribution-buyers-enhanced endpoint error responses
  - Add diagnostic information to 404 errors

  - Implement proper HTTP status codes (400, 404, 503, 500)
  - Add detailed error messages with error codes
  - Add error logging with context
  - _Requirements: 1.3, 1.5, 4.1, 4.2, 4.3, 4.5, 5.1, 5.2, 5.3, 5.4, 5.5_

- [ ] 4. Create Diagnostic CLI Tool
  - Create command-line script for running diagnostics

  - Support single property diagnosis
  - Support batch diagnosis
  - Support finding all missing property_listings
  - Output results in readable format
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [ ] 5. Create Sync CLI Tool
  - Create command-line script for syncing property_listings


  - Support single property sync
  - Support batch sync
  - Support syncing all missing property_listings
  - Add confirmation prompts for safety
  - Output sync results


  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [ ] 6. Update Frontend Error Display
  - Update gmailDistributionService to handle new error format
  - Display user-friendly error messages



  - Show diagnostic information when available
  - Add retry mechanism for recoverable errors
  - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [ ] 7. Add Error Logging and Monitoring
  - Log all 404 errors with property number and diagnostics
  - Log all sync operations with results
  - Log all data integrity issues
  - Add error context (request parameters, stack trace)
  - _Requirements: 1.4, 4.5, 5.5_

- [ ] 8. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.
