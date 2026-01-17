# Implementation Plan - Seller List Phase 1

- [x] 1. Database schema migration

- [x] 1.1 Create migration file for Phase 1 schema changes



  - Add new columns to sellers table
  - Create seller_number_sequence table
  - Create seller_history table
  - Add indexes for performance






  - _Requirements: 1.1, 1.2, 7.1, 8.1, 11.1, 11.4_

- [ ] 1.2 Implement data migration for existing sellers
  - Generate seller numbers for existing records
  - Set default values for new fields

  - Verify data integrity after migration
  - _Requirements: 11.2, 11.3_

- [ ]* 1.3 Write migration tests
  - Test migration on empty database
  - Test migration with existing data


  - Test rollback procedures
  - _Requirements: 11.1, 11.2_

- [ ] 2. Backend: Seller Number Service
- [ ] 2.1 Implement SellerNumberService
  - Create service class with generateSellerNumber method
  - Implement atomic sequence increment using database transaction
  - Add seller number format validation
  - Handle concurrent generation scenarios
  - _Requirements: 1.1, 1.2, 1.5_

- [ ]* 2.2 Write property test for seller number uniqueness
  - **Property 1: Seller Number Uniqueness**

  - **Validates: Requirements 1.1, 1.2**

- [ ]* 2.3 Write property test for sequential generation
  - **Property 2: Seller Number Sequential Generation**
  - **Validates: Requirements 1.1, 1.5**

- [x]* 2.4 Write unit tests for SellerNumberService



  - Test format validation
  - Test error handling
  - Test sequence retrieval
  - _Requirements: 1.1, 1.2_

- [ ] 3. Backend: Duplicate Detection Service
- [ ] 3.1 Implement DuplicateDetectionService
  - Create checkDuplicateByPhone method
  - Create checkDuplicateByEmail method
  - Create checkDuplicates method (combined)
  - Implement recordDuplicateHistory method
  - Implement getDuplicateHistory method
  - _Requirements: 7.1, 7.3, 7.4, 8.1, 8.3, 8.4_

- [ ]* 3.2 Write property test for phone duplicate detection
  - **Property 17: Phone Number Duplicate Detection**
  - **Validates: Requirements 7.1, 7.3, 7.4**

- [ ]* 3.3 Write property test for email duplicate detection
  - **Property 18: Email Duplicate Detection**
  - **Validates: Requirements 8.1, 8.3, 8.4**



- [ ]* 3.4 Write unit tests for DuplicateDetectionService
  - Test with encrypted phone numbers
  - Test with encrypted emails
  - Test history recording
  - Test edge cases (null emails, etc.)



  - _Requirements: 7.1, 8.1_

- [x] 4. Backend: Enhanced Seller Service

- [ ] 4.1 Update SellerService for Phase 1 fields
  - Add Phase 1 fields to createSeller method


  - Integrate seller number generation
  - Integrate duplicate detection
  - Add updateSeller support for Phase 1 fields
  - Implement first caller immutability check
  - _Requirements: 1.1, 2.1, 3.1, 3.2, 5.5, 12.1, 12.2_


- [ ] 4.2 Implement unreachable status management
  - Add markAsUnreachable method
  - Add clearUnreachable method
  - Record timestamps appropriately
  - _Requirements: 4.1, 4.3, 4.4_

- [ ] 4.3 Implement duplicate confirmation
  - Add confirmDuplicate method

  - Record confirming employee and timestamp
  - _Requirements: 9.2, 9.3, 9.4_

- [ ]* 4.4 Write property test for first caller immutability
  - **Property 14: First Caller Immutability**
  - **Validates: Requirements 5.5**



- [ ]* 4.5 Write property test for unreachable timestamp
  - **Property 10: Unreachable Timestamp Recording**
  - **Validates: Requirements 4.3**



- [ ]* 4.6 Write property test for duplicate confirmation timestamp
  - **Property 19: Duplicate Confirmation Timestamp**
  - **Validates: Requirements 9.3, 9.4**

- [x] 5. Backend: TypeScript type definitions


- [ ] 5.1 Update type definitions for Phase 1
  - Add InquirySource enum
  - Add ConfidenceLevel enum
  - Extend Seller interface with Phase 1 fields
  - Create DuplicateMatch interface
  - Create DuplicateWarning interface
  - Update request/response types
  - _Requirements: 12.1, 12.2, 12.3_


- [ ] 6. Backend: API routes for Phase 1
- [ ] 6.1 Update POST /sellers endpoint
  - Accept Phase 1 fields in request body

  - Validate required fields (inquirySource, inquiryYear, inquiryDate)
  - Call duplicate detection before creation
  - Return duplicate warnings in response
  - Auto-generate seller number
  - _Requirements: 2.1, 3.1, 3.2, 7.1, 8.1, 12.1_




- [ ] 6.2 Update GET /sellers endpoint


  - Add Phase 1 filter parameters
  - Support inquirySource filter
  - Support inquiryYear range filter
  - Support isUnreachable filter
  - Support confidenceLevel filter
  - Support firstCaller filter
  - Support duplicateConfirmed filter
  - _Requirements: 2.4, 4.5, 6.4, 12.4_

- [ ] 6.3 Update GET /sellers/:id endpoint
  - Include all Phase 1 fields in response
  - Include duplicate history if applicable
  - _Requirements: 12.3_

- [ ] 6.4 Update PATCH /sellers/:id endpoint
  - Allow updating Phase 1 fields
  - Enforce first caller immutability

  - Validate field values
  - _Requirements: 5.5, 12.2_

- [ ] 6.5 Create new Phase 1 specific endpoints
  - POST /sellers/:id/mark-unreachable
  - POST /sellers/:id/clear-unreachable
  - POST /sellers/:id/confirm-duplicate
  - GET /sellers/:id/duplicate-history

  - GET /sellers/check-duplicate

  - _Requirements: 4.1, 4.4, 9.2_


- [ ]* 6.6 Write property test for inquiry source validation
  - **Property 4: Inquiry Source Validation**
  - **Validates: Requirements 2.1**

- [ ]* 6.7 Write property test for inquiry date requirement
  - **Property 7: Inquiry Date Requirement**
  - **Validates: Requirements 3.1, 3.2**





- [ ]* 6.8 Write property test for API response completeness
  - **Property 21: API Response Completeness**
  - **Validates: Requirements 12.3**


- [ ]* 6.9 Write property test for API filter parameters
  - **Property 22: API Filter Parameter Support**
  - **Validates: Requirements 12.4**


- [ ]* 6.10 Write property test for API validation errors
  - **Property 23: API Validation Error Messages**

  - **Validates: Requirements 12.5**

- [ ]* 6.11 Write integration tests for API endpoints
  - Test POST /sellers with duplicate detection
  - Test GET /sellers with Phase 1 filters
  - Test PATCH /sellers with first caller immutability
  - Test unreachable status endpoints
  - Test duplicate confirmation endpoint

  - _Requirements: 12.1, 12.2, 12.4_

- [ ] 7. Frontend: Update type definitions
- [ ] 7.1 Update frontend TypeScript types
  - Add Phase 1 fields to Seller interface
  - Create InquirySource enum
  - Create ConfidenceLevel enum

  - Create DuplicateWarning interface
  - Update API request/response types
  - _Requirements: 12.1, 12.3_



- [ ] 8. Frontend: Enhanced Seller List View
- [ ] 8.1 Add Phase 1 columns to DataGrid
  - Add seller number column
  - Add inquiry source column
  - Add inquiry date column

  - Add unreachable status indicator column
  - Add confidence level column with visual indicators
  - Add first caller column
  - Implement column show/hide functionality
  - Persist column preferences to localStorage
  - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7, 10.8_


- [ ] 8.2 Add Phase 1 filters to Seller List
  - Add inquiry source filter dropdown
  - Add inquiry year range filter
  - Add unreachable status filter checkbox
  - Add confidence level filter dropdown

  - Add first caller filter
  - Add duplicate confirmed filter
  - _Requirements: 2.4, 4.5, 6.4_






- [ ] 8.3 Add Phase 1 sorting options
  - Enable sorting by inquiry date
  - Enable sorting by confidence level
  - Enable sorting by seller number


  - _Requirements: 3.5, 6.5_



- [ ] 9. Frontend: New Seller Form Enhancement
- [ ] 9.1 Add Phase 1 fields to New Seller Form
  - Add inquiry source dropdown (required)
  - Add inquiry year input (required)


  - Add inquiry date picker (required)
  - Add inquiry datetime picker (optional)
  - Add confidence level dropdown (optional)
  - Add first caller initials input (optional)
  - Add form validation for required fields


  - _Requirements: 2.1, 3.1, 3.2_

- [ ] 9.2 Implement duplicate detection in form
  - Check for duplicates on phone number blur
  - Check for duplicates on email blur
  - Display duplicate warning dialog
  - Show past owner and property information
  - Allow user to proceed or cancel
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 8.1, 8.2, 8.3, 8.4, 8.5_

- [ ] 9.3 Add duplicate confirmation UI
  - Show duplicate confirmation checkbox for detected duplicates
  - Display "duplicate confirmation required" badge
  - Implement confirm duplicate button
  - _Requirements: 9.1, 9.2, 9.5_

- [ ] 10. Frontend: Seller Detail Page Enhancement
- [ ] 10.1 Add Phase 1 fields to Seller Detail View
  - Display seller number prominently
  - Display inquiry source and date
  - Display unreachable status with timestamp
  - Display first caller information
  - Display confidence level with visual indicator
  - Display duplicate confirmation status
  - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6_

- [ ] 10.2 Add unreachable status management UI
  - Add "Mark as Unreachable" button
  - Add "Clear Unreachable" button
  - Show unreachable timestamp
  - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [ ] 10.3 Add duplicate history display
  - Show duplicate matches section
  - Display past owner information
  - Display past property information
  - Show match type (phone/email/both)
  - _Requirements: 7.3, 7.4, 8.3, 8.4_

- [ ] 11. Frontend: API service updates
- [ ] 11.1 Update API service for Phase 1
  - Update createSeller to include Phase 1 fields
  - Update updateSeller to include Phase 1 fields
  - Add markAsUnreachable API call
  - Add clearUnreachable API call
  - Add confirmDuplicate API call
  - Add checkDuplicate API call
  - Add getDuplicateHistory API call
  - Handle duplicate warnings in responses
  - _Requirements: 12.1, 12.2_

- [ ] 12. Documentation and deployment
- [ ] 12.1 Update API documentation
  - Document new Phase 1 fields
  - Document new endpoints
  - Document error responses
  - Add examples for duplicate detection
  - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5_

- [ ] 12.2 Update user documentation
  - Document seller number system
  - Document inquiry source codes
  - Document duplicate detection workflow
  - Document unreachable status management
  - Document confidence level usage

- [ ] 12.3 Create deployment checklist
  - Database migration steps
  - Backend deployment steps
  - Frontend deployment steps
  - Rollback procedures
  - Monitoring and verification steps

- [ ] 13. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.
