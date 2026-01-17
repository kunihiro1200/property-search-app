# Implementation Plan

- [x] 1. Database migration to add site column





  - Create migration file to add `site` column to sellers table
  - Add index on site column for analytics queries
  - Test migration on development database
  - _Requirements: 3.1, 3.4, 3.5_

- [x] 2. Update backend types and interfaces



  - Add `site` field to Seller interface in `backend/src/types/index.ts`
  - Add `site` field to UpdateSellerRequest interface


  - _Requirements: 3.1, 3.2_

- [ ] 3. Update SellerService to handle site field
  - Modify `updateSeller` method to include site field in updates
  - Ensure site field is included in seller data retrieval
  - _Requirements: 3.1, 3.2_



- [ ]* 3.1 Write property test for site value round-trip
  - **Property 1: Site value round-trip**
  - **Validates: Requirements 1.3, 1.4, 2.3, 3.1, 3.2**

- [ ] 4. Add site field validation to sellers route
  - Define VALID_SITE_OPTIONS constant with predefined options
  - Add validation logic in PUT /sellers/:id route
  - Return appropriate error response for invalid site values


  - _Requirements: 3.3_



- [ ]* 4.1 Write property test for input validation
  - **Property 3: Input validation rejects invalid values**
  - **Validates: Requirements 3.3**



- [ ] 5. Update frontend types
  - Add `site` field to Seller interface in `frontend/src/types/index.ts`
  - _Requirements: 1.2, 1.3_


- [ ] 6. Add "Other" section to Call Mode Page
  - Add state management for site field (editingSite, editedSite, savingSite)
  - Define siteOptions array with predefined values
  - Initialize editedSite when seller data loads
  - _Requirements: 1.1, 1.2_



- [ ] 7. Implement site field display mode
  - Add "Other" section UI component after Appointment section
  - Display current site value or "未設定" if null
  - Add edit button to enable editing mode

  - _Requirements: 1.1, 1.2, 1.4_

- [ ] 8. Implement site field edit mode
  - Add dropdown with predefined site options
  - Add "未選択" option for clearing the value
  - Add save and cancel buttons
  - _Requirements: 2.1, 2.2_




- [ ] 9. Implement save functionality
  - Create handleSaveSite function to call API
  - Update seller data after successful save
  - Display success message
  - Handle errors and display error messages
  - _Requirements: 1.3, 2.3, 2.5_

- [ ] 10. Implement cancel functionality
  - Revert editedSite to original seller.site value
  - Exit editing mode without saving
  - _Requirements: 2.4_

- [ ]* 10.1 Write property test for cancel preserves original value
  - **Property 2: Cancel preserves original value**
  - **Validates: Requirements 2.4**

- [ ] 11. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.
