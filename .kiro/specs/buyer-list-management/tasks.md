# Implementation Plan

- [x] 1. Set up database schema and column mapping configuration



  - [x] 1.1 Create database migration for buyers table

    - Create `backend/migrations/042_add_buyers.sql` with 181 columns
    - Include all columns from spreadsheet (buyer_number, name, phone_number, email, property_number, latest_status, etc.)
    - Add indexes for buyer_number, property_number, name, latest_status, initial_assignee, follow_up_assignee, phone_number, next_call_date
    - _Requirements: 1.1, 1.2_

  - [x] 1.2 Create column mapping configuration file

    - Create `backend/src/config/buyer-column-mapping.json` based on sample in spec
    - Map all 181 spreadsheet columns to database columns
    - Define typeConversions for date fields (reception_date, latest_viewing_date, next_call_date, campaign_date) and number fields (phone_duplicate_count, price)
    - _Requirements: 6.1, 6.3_

  - [x] 1.3 Create migration runner script

    - Create `backend/migrations/run-042-migration.ts`
    - _Requirements: 1.1_

- [x] 2. Implement BuyerColumnMapper service



  - [x] 2.1 Create BuyerColumnMapper class

    - Create `backend/src/services/BuyerColumnMapper.ts`
    - Implement mapSpreadsheetToDatabase method
    - Implement mapDatabaseToSpreadsheet method
    - Implement type conversion logic
    - _Requirements: 1.2, 6.1, 6.3_
  - [ ]* 2.2 Write property test for column mapping round trip
    - **Property 1: Column Mapping Round Trip**
    - **Validates: Requirements 1.2, 6.3**
  - [ ]* 2.3 Write property test for type conversion correctness
    - **Property 11: Type Conversion Correctness**
    - **Validates: Requirements 6.3**

- [x] 3. Implement BuyerSyncService



  - [x] 3.1 Create BuyerSyncService class

    - Create `backend/src/services/BuyerSyncService.ts`
    - Implement syncAll method with batch processing
    - Implement upsert logic (create or update based on buyer_number)
    - Implement error handling and logging
    - Implement sync lock to prevent concurrent syncs
    - _Requirements: 1.1, 1.3, 1.4, 1.5, 5.1, 5.2, 5.3, 5.4_
  - [ ]* 3.2 Write property test for sync upsert consistency
    - **Property 2: Sync Upsert Consistency**
    - **Validates: Requirements 1.3, 1.4**
  - [ ]* 3.3 Write property test for sync result accuracy
    - **Property 3: Sync Result Accuracy**
    - **Validates: Requirements 1.5**
  - [ ]* 3.4 Write property test for batch processing integrity
    - **Property 8: Batch Processing Integrity**
    - **Validates: Requirements 5.1**
  - [ ]* 3.5 Write property test for error resilience
    - **Property 9: Error Resilience**
    - **Validates: Requirements 5.2**
  - [ ]* 3.6 Write property test for sync timestamp update
    - **Property 10: Sync Timestamp Update**
    - **Validates: Requirements 5.4**

- [x] 4. Checkpoint - Make sure all tests are passing

  - Ensure all tests pass, ask the user if questions arise.



- [x] 5. Implement BuyerService

  - [x] 5.1 Create BuyerService class

    - Create `backend/src/services/BuyerService.ts`
    - Implement getAll with pagination
    - Implement getById and getByBuyerNumber
    - Implement search method
    - Implement getLinkedProperties method
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 3.1, 3.2, 3.3, 4.1_

  - [x] 5.1.5 Add update method to BuyerService



    - Implement update method with partial data support
    - Add field validation
    - Update db_updated_at timestamp
    - Handle not found errors
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_
  - [ ]* 5.2 Write property test for search result relevance
    - **Property 4: Search Result Relevance**
    - **Validates: Requirements 2.2**
  - [ ]* 5.3 Write property test for filter result correctness
    - **Property 5: Filter Result Correctness**
    - **Validates: Requirements 2.3**
  - [ ]* 5.4 Write property test for property linkage completeness
    - **Property 6: Property Linkage Completeness**
    - **Validates: Requirements 2.4, 3.2, 3.3, 4.1**
  - [ ]* 5.5 Write property test for reverse linkage consistency
    - **Property 7: Reverse Linkage Consistency**
    - **Validates: Requirements 4.3**

- [x] 6. Implement API routes



  - [x] 6.1 Create buyers API routes

    - Create `backend/src/routes/buyers.ts`
    - Implement GET /api/buyers (list with pagination, search, filter)
    - Implement GET /api/buyers/:id (detail)
    - Implement GET /api/buyers/:id/properties (linked properties)
    - Implement POST /api/buyers/sync (trigger sync)
    - Implement GET /api/buyers/sync/status (sync status)
    - Implement GET /api/buyers/export (CSV export)
    - _Requirements: 2.1, 2.2, 2.3, 3.1, 4.1, 8.1, 8.2_



  - [x] 6.1.5 Add buyer update API route

    - Add PUT /api/buyers/:id endpoint to buyers.ts
    - Implement input validation
    - Call BuyerService.update method
    - Return updated buyer data
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

  - [x] 6.2 Register routes in main app

    - Update `backend/src/index.ts` to include buyers routes
    - _Requirements: 2.1_
  - [ ]* 6.3 Write property test for export completeness
    - **Property 12: Export Completeness**
    - **Validates: Requirements 7.1, 7.2**


- [x] 7. Checkpoint - Make sure all tests are passing


  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Implement Frontend - Buyer List Page



  - [x] 8.1 Create BuyersPage component

    - Create `frontend/src/pages/BuyersPage.tsx`
    - Implement paginated buyer list display
    - Implement search input
    - Implement filter controls (status, assignee, date range)
    - Display linked property count for each buyer
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

  - [x] 8.2 Add buyers page route

    - Update `frontend/src/App.tsx` to add /buyers route
    - _Requirements: 2.1_

- [x] 9. Implement Frontend - Buyer Detail Page


  - [x] 9.1 Create BuyerDetailPage component


    - Create `frontend/src/pages/BuyerDetailPage.tsx`
    - Display all buyer fields organized in sections
    - Display linked properties section with navigation
    - _Requirements: 3.1, 3.2, 3.3, 4.1, 4.2_


  - [x] 9.2 Add buyer detail route




    - Update `frontend/src/App.tsx` to add /buyers/:id route

    - _Requirements: 3.1_


- [x] 9.5 Add buyer edit functionality



  - [x] 9.5.1 Add edit mode to BuyerDetailPage

    - Add edit/save/cancel buttons
    - Implement editable form fields for all buyer data
    - Add field validation
    - Implement save functionality with API call
    - Display success/error messages
    - _Requirements: 7.1, 7.2, 7.3, 7.5_
  - [ ]* 9.5.2 Write property test for update preserves unmodified fields
    - **Property 12: Update Preserves Unmodified Fields**
    - **Validates: Requirements 7.3**
  - [ ]* 9.5.3 Write property test for update timestamp correctness
    - **Property 13: Update Timestamp Correctness**
    - **Validates: Requirements 7.4**

- [x] 10. Create sync script and integration



  - [x] 10.1 Create sync execution script

    - Create `backend/sync-buyers.ts` for manual sync execution
    - _Requirements: 1.1_
  - [x] 10.2 Update property listing to show linked buyer


    - Update PropertyListingDetailModal to show linked buyer info
    - _Requirements: 4.3_


- [x] 11. Final Checkpoint - Make sure all tests are passing

  - Ensure all tests pass, ask the user if questions arise.

