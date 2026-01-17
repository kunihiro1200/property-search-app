# Implementation Plan

- [x] 1. Enhance ColumnMapper for additional fields


  - Update `backend/src/config/column-mapping.json` to include property fields, visit fields, and comments
  - Add mappings for: 物件住所, 物件種別, 土地面積, 建物面積, 築年, 構造, 状況（売主）, 間取り, 土地権利, 現況
  - Add mappings for: 訪問日, 訪問時間, 訪問担当, 訪問場所, 訪問メモ
  - Add mapping for: コメント
  - _Requirements: 1.2, 2.4, 4.1, 5.1_



- [ ] 2. Create PropertySyncHandler service
  - Create `backend/src/services/PropertySyncHandler.ts`
  - Implement `syncProperty()` method to handle property upsert logic
  - Implement `findOrCreateProperty()` method to get or create property record
  - Implement `updatePropertyFields()` method to update property data
  - Handle numeric field parsing (remove commas, convert to numbers)
  - Handle empty fields (set to null)
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [ ]* 2.1 Write property test for PropertySyncHandler
  - **Property 4: Property record linkage**
  - **Validates: Requirements 2.1, 2.2, 2.3**

- [ ]* 2.2 Write property test for numeric field conversion
  - **Property 5: Numeric field conversion**
  - **Validates: Requirements 2.4, 3.1**

- [x]* 2.3 Write property test for empty field handling


  - **Property 6: Empty field handling**
  - **Validates: Requirements 2.5, 3.2, 4.3, 5.4**

- [ ] 3. Create enhanced sync script
  - Create `backend/sync-all-sellers-complete.ts` based on existing `sync-all-sellers.ts`
  - Add progress tracking (SyncProgress interface)

  - Add batch processing (process 100 sellers at a time)
  - Add detailed error logging with ErrorLog interface
  - Add support for sync options (dryRun, skipProperties, sellerNumbers filter)
  - _Requirements: 1.1, 6.1, 6.2_

- [ ] 4. Implement seller data sync logic
  - In sync script, fetch all rows from spreadsheet using GoogleSheetsClient
  - For each row, use ColumnMapper to transform to database format
  - Check if seller exists by seller_number
  - If exists, update seller record with all fields
  - If not exists, create new seller record
  - Encrypt sensitive fields (name, address, phone_number, email)
  - Do not encrypt comments field
  - Handle valuation amount conversion (万円 to 円, multiply by 10,000)
  - Handle date parsing for inquiry_date, next_call_date, visit_date
  - Handle time parsing for visit_time
  - Update synced_to_sheet_at timestamp after successful sync
  - _Requirements: 1.2, 1.3, 1.4, 1.5, 3.1, 4.2, 5.2, 5.3_

- [ ]* 4.1 Write property test for column mapping
  - **Property 1: Column mapping consistency**
  - **Validates: Requirements 1.2**

- [ ]* 4.2 Write property test for encryption
  - **Property 2: Sensitive field encryption**
  - **Validates: Requirements 1.3, 4.2**

- [ ]* 4.3 Write property test for update vs create logic
  - **Property 3: Update vs Create logic**

  - **Validates: Requirements 1.4, 1.5**

- [ ]* 4.4 Write property test for date and time parsing
  - **Property 8: Date and time parsing**
  - **Validates: Requirements 5.2, 5.3**

- [ ] 5. Implement property data sync logic
  - After syncing seller, use PropertySyncHandler to sync property
  - Extract property fields from spreadsheet row

  - Check if property exists for seller_id
  - If exists, update property record
  - If not exists, create new property record linked to seller
  - Handle numeric conversions for land_area, building_area
  - Handle empty fields (set to null)
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [ ] 6. Implement error handling
  - Wrap each seller sync in try-catch block
  - Log errors with seller_number, error message, and timestamp
  - Continue processing next seller after error
  - Track error count and error details

  - Implement retry logic for transient errors (max 3 attempts with exponential backoff)
  - Handle specific error types: spreadsheet access, validation, database, encryption
  - _Requirements: 6.1, 6.3, 6.4, 6.5_

- [ ]* 6.1 Write property test for error isolation
  - **Property 9: Error isolation**
  - **Validates: Requirements 6.1**

- [ ] 7. Implement sync summary reporting
  - Track counts: total, processed, updated, created, skipped, errors
  - Display progress every 100 records


  - At end of sync, display summary with all counts
  - Display list of errors with seller_number and error message
  - Display total execution time
  - _Requirements: 6.2_

- [ ]* 7.1 Write property test for sync completeness
  - **Property 10: Sync completeness**
  - **Validates: Requirements 1.1**



- [ ] 8. Create verification script
  - Create `backend/verify-all-sellers-sync.ts`
  - Accept optional parameters: sampleSize (default 10), sellerNumbers (specific sellers to check)
  - For each seller, fetch from database and spreadsheet
  - Compare key fields: name, address, phone_number, email, status, valuations, visit fields, comments
  - Decrypt encrypted fields for comparison
  - Report discrepancies with field name, expected value, actual value


  - Display verification summary: total checked, passed, failed
  - _Requirements: 7.1, 7.2, 7.3, 7.4_

- [ ] 9. Test sync with AA12903
  - Run sync script with sellerNumbers filter for AA12903 only
  - Verify seller data matches spreadsheet

  - Verify property data matches spreadsheet
  - Verify visit fields are populated
  - Verify comments are populated
  - Verify valuations are converted correctly (万円 to 円)
  - Check call mode page UI displays all sections correctly
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7_



- [ ] 10. Run full sync for all sellers
  - Backup database before running (optional but recommended)
  - Run `sync-all-sellers-complete.ts` without filters
  - Monitor progress and error logs
  - Review sync summary report
  - Check for any errors and investigate
  - _Requirements: 1.1, 6.2_

- [ ] 11. Run verification on sample sellers
  - Run `verify-all-sellers-sync.ts` with sampleSize=20
  - Review verification report
  - Investigate any discrepancies
  - If issues found, fix and re-sync affected sellers
  - _Requirements: 7.1, 7.2, 7.3, 7.4_

- [ ] 12. Checkpoint - Ensure all tests pass, ask the user if questions arise
