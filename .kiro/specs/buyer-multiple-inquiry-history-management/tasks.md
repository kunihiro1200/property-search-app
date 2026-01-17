# Implementation Plan: Buyer Multiple Inquiry History Management

## Overview

買主の複数問い合わせ履歴を効果的に管理・表示するための実装。既存のデータ構造を維持しつつ、UIレイヤーでの表示と操作性を改善し、複数物件情報を含むメール配信機能を追加する。

## Tasks

- [x] 1. Database schema updates and backend utilities
  - Add `buyer_number` column to `viewing_results` table
  - Create utility function to parse `past_buyer_list` column
  - Add index on `viewing_results.buyer_number`
  - _Requirements: 2.1, 2.2_

- [ ]* 1.1 Write property test for past buyer list parser
  - **Property 1: Past Buyer Numbers Completeness**
  - **Validates: Requirements 1.1, 1.2**

- [ ] 2. Backend API: Past buyer numbers retrieval
  - [x] 2.1 Implement `BuyerService.getPastBuyerNumbers(buyerId)`
    - Parse `past_buyer_list` column
    - Return array of past buyer numbers with metadata
    - _Requirements: 1.1_

  - [x] 2.2 Implement `BuyerService.getInquiryHistoryByBuyerNumber(buyerNumber)`
    - Retrieve inquiry details for specific buyer number
    - Include property number, inquiry date, source, status
    - _Requirements: 1.3, 1.4_

  - [x] 2.3 Add API endpoint `GET /api/buyers/:id/past-buyer-numbers`
    - Return structured past buyer numbers data
    - _Requirements: 1.1, 1.2_

  - [x] 2.4 Add API endpoint `GET /api/buyers/:id/inquiry-history`
    - Return complete inquiry history across all buyer numbers
    - _Requirements: 3.1, 3.2_

- [ ]* 2.5 Write unit tests for past buyer number retrieval
  - Test parsing various formats
  - Test empty and null values
  - Test error handling
  - _Requirements: 1.1_

- [ ] 3. Backend API: Viewing results with buyer number
  - [x] 3.1 Update `ViewingResult` model to include `buyer_number` field
    - Add TypeScript interface update
    - _Requirements: 2.1_

  - [x] 3.2 Enhance `POST /api/viewing-results` endpoint
    - Accept `buyer_number` in request body
    - Validate buyer number against current and past numbers
    - _Requirements: 2.1, 2.2_

  - [x] 3.3 Enhance `GET /api/buyers/:id/viewing-results` endpoint
    - Group viewing results by buyer number
    - Include buyer number in response
    - _Requirements: 2.3, 2.4_

- [ ]* 3.4 Write property test for viewing result linkage
  - **Property 2: Viewing Result Linkage**
  - **Validates: Requirements 2.1, 2.2, 2.3**

- [-] 4. Backend API: Multi-property email generation
  - [ ] 4.1 Implement `PropertyService.getTransmissionNotesByPropertyNumber(propertyNumber)`
    - Retrieve transmission notes from property listings
    - Return empty string if notes don't exist
    - _Requirements: 5.1, 5.2_

  - [ ] 4.2 Implement `EmailGenerationService.formatPropertyTransmissionNotes(properties)`
    - Format multiple properties into email sections
    - Add property number headers and separators
    - _Requirements: 4.3, 4.4, 5.3, 5.4_

  - [ ] 4.3 Implement `EmailGenerationService.generateMultiPropertyEmail(request)`
    - Accept array of property numbers
    - Retrieve transmission notes for each property
    - Generate formatted email body
    - _Requirements: 4.1, 4.2, 5.5_

  - [ ] 4.4 Add API endpoint `POST /api/emails/multi-property`
    - Accept buyer ID and property numbers array
    - Return formatted email subject and body
    - _Requirements: 4.1, 4.2_

- [ ]* 4.5 Write property test for multi-property email completeness
  - **Property 4: Multi-Property Email Completeness**
  - **Validates: Requirements 4.2, 4.3, 4.4**

- [ ]* 4.6 Write property test for transmission notes retrieval
  - **Property 5: Transmission Notes Retrieval**
  - **Validates: Requirements 5.1, 5.2**

- [ ] 5. Checkpoint - Backend APIs complete
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 6. Frontend: PastBuyerNumbersList component
  - [ ] 6.1 Create `PastBuyerNumbersList.tsx` component
    - Display collapsible section with badge count
    - Render each past buyer number as expandable card
    - Show property number, inquiry date, source
    - _Requirements: 1.1, 1.2, 1.3_

  - [ ] 6.2 Implement click handler to expand inquiry details
    - Fetch inquiry details on click
    - Display full inquiry information
    - _Requirements: 1.3, 1.4_

  - [ ] 6.3 Add visual styling and animations
    - Badge with count
    - Smooth expand/collapse transitions
    - _Requirements: 1.1_

- [ ]* 6.4 Write unit tests for PastBuyerNumbersList component
  - Test rendering with various data
  - Test expand/collapse behavior
  - Test click handlers
  - _Requirements: 1.1, 1.2_

- [ ] 7. Frontend: InquiryHistoryTimeline component
  - [ ] 7.1 Create `InquiryHistoryTimeline.tsx` component
    - Vertical timeline layout
    - Date markers for each inquiry
    - _Requirements: 3.1, 3.2_

  - [ ] 7.2 Implement timeline nodes for each inquiry
    - Show buyer number, property number, status
    - Color coding for different statuses
    - _Requirements: 3.2, 3.3_

  - [ ] 7.3 Add visual connections between related buyer numbers
    - Lines connecting inquiries from same person
    - _Requirements: 3.4_

- [ ]* 7.4 Write unit tests for InquiryHistoryTimeline component
  - Test timeline rendering
  - Test status color coding
  - Test date ordering
  - _Requirements: 3.1, 3.2_

- [ ] 8. Frontend: Enhanced ViewingResultsSection
  - [ ] 8.1 Add buyer number dropdown to viewing result form
    - Populate with current and past buyer numbers
    - _Requirements: 2.1_

  - [ ] 8.2 Implement auto-populate property number based on selected buyer number
    - Fetch property number associated with buyer number
    - _Requirements: 2.1_

  - [ ] 8.3 Update viewing results display to group by buyer number
    - Show buyer number for each viewing result
    - Group results under buyer number headers
    - _Requirements: 2.3, 2.4_

- [ ]* 8.4 Write unit tests for enhanced ViewingResultsSection
  - Test buyer number selection
  - Test property number auto-population
  - Test grouped display
  - _Requirements: 2.1, 2.3_

- [ ] 9. Frontend: MultiPropertySelector component
  - [ ] 9.1 Create `MultiPropertySelector.tsx` component
    - Checkbox list of available properties
    - Show property number, address, inquiry date
    - _Requirements: 4.1_

  - [ ] 9.2 Implement selection state management
    - Track selected property numbers
    - Select all / deselect all functionality
    - _Requirements: 4.1_

  - [ ] 9.3 Display buyer number association for each property
    - Show which buyer number each inquiry is under
    - _Requirements: 3.4_

- [ ]* 9.4 Write unit tests for MultiPropertySelector component
  - Test checkbox selection
  - Test select all functionality
  - Test buyer number display
  - _Requirements: 4.1_

- [ ] 10. Frontend: Enhanced EmailComposer
  - [ ] 10.1 Integrate MultiPropertySelector into email composer
    - Add property selection UI
    - _Requirements: 4.1_

  - [ ] 10.2 Implement multi-property email generation
    - Call backend API with selected properties
    - Display formatted email preview
    - _Requirements: 4.2, 4.3_

  - [ ] 10.3 Add email preview with property sections
    - Show formatted email body
    - Highlight property sections
    - _Requirements: 4.4, 5.3, 5.4_

  - [ ] 10.4 Handle empty transmission notes gracefully
    - Display placeholder when notes are missing
    - _Requirements: 5.5_

- [ ]* 10.5 Write integration tests for email composer
  - Test multi-property selection flow
  - Test email generation
  - Test preview display
  - _Requirements: 4.1, 4.2, 4.3_

- [ ] 11. Frontend: BuyerInquiryIndicator component
  - [ ] 11.1 Create `BuyerInquiryIndicator.tsx` component
    - Badge showing count of past buyer numbers
    - Visual indicator for buyers with history
    - _Requirements: 6.1, 6.2_

  - [ ] 11.2 Add to buyer list and detail pages
    - Display indicator next to buyer name
    - _Requirements: 6.3_

  - [ ] 11.3 Implement click navigation to inquiry history
    - Quick access to past buyer numbers section
    - _Requirements: 6.4_

- [ ]* 11.4 Write property test for buyer number relationship display
  - **Property 6: Buyer Number Relationship Display**
  - **Validates: Requirements 6.1, 6.2, 6.3**

- [ ] 12. Integration: Update BuyerDetailPage
  - [ ] 12.1 Add PastBuyerNumbersList component to buyer detail page
    - Place in prominent location
    - _Requirements: 1.1_

  - [ ] 12.2 Add InquiryHistoryTimeline component
    - Display below basic buyer information
    - _Requirements: 3.1_

  - [ ] 12.3 Update ViewingResultsSection with enhancements
    - Replace existing section with enhanced version
    - _Requirements: 2.1, 2.3_

  - [ ] 12.4 Add BuyerInquiryIndicator to page header
    - Display next to buyer name
    - _Requirements: 6.1_

- [ ] 13. Integration: Update BuyersPage list view
  - [ ] 13.1 Add BuyerInquiryIndicator to buyer list items
    - Show indicator for buyers with past numbers
    - _Requirements: 6.1, 6.2_

  - [ ] 13.2 Add tooltip showing past buyer number count
    - Hover to see count
    - _Requirements: 6.2_

- [ ] 14. Error handling and validation
  - [ ] 14.1 Add validation for buyer number selection
    - Validate against current and past numbers
    - Display error messages
    - _Requirements: 2.1_

  - [ ] 14.2 Handle missing transmission notes gracefully
    - Display placeholder text
    - Log warnings
    - _Requirements: 5.5_

  - [ ] 14.3 Add error handling for email generation
    - Handle invalid property numbers
    - Handle empty selections
    - Display user-friendly error messages
    - _Requirements: 4.1_

  - [ ] 14.4 Add loading states for async operations
    - Show spinners during data fetching
    - Disable buttons during processing
    - _Requirements: All_

- [ ] 15. Database migration
  - [ ] 15.1 Create migration script to add `buyer_number` column
    - Add column to `viewing_results` table
    - Set default to current buyer number for existing records
    - _Requirements: 2.1_

  - [ ] 15.2 Create migration script to add index
    - Add index on `viewing_results.buyer_number`
    - _Requirements: Performance_

  - [ ] 15.3 Run migration and verify
    - Execute migration on development database
    - Verify data integrity
    - _Requirements: 2.1_

- [ ] 16. Final checkpoint - Integration testing
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
- Implementation uses TypeScript for both frontend (React) and backend (Node.js/Express)
