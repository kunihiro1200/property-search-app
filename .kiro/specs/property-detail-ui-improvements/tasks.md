# Implementation Plan

- [x] 1. Add Gmail distribution button to property detail page header


  - Import GmailDistributionButton component in PropertyListingDetailPage.tsx
  - Add button to header section next to save button
  - Pass propertyNumber and propertyAddress props from current property data
  - Use size="medium" and variant="contained" for consistent styling
  - Add appropriate spacing between Gmail button and save button
  - _Requirements: 1.1, 1.2, 1.4, 1.5_



- [x] 2. Move storage URL to Maps and Site URLs section
  - Locate the "地図、サイトURL等" section in PropertyListingDetailPage.tsx
  - Add storage URL display using workTaskData?.storage_url
  - Format as clickable link with OpenInNewIcon (consistent with other URLs)
  - Add label "格納先URL" with proper styling
  - Update empty state condition to include storage URL check
  - _Requirements: 2.1, 2.3, 2.5_

- [x] 3. Remove storage URL from Property Details section


  - Remove storageUrl prop from PropertyDetailsSectionProps interface
  - Remove storage URL display code from PropertyDetailsSection component
  - Remove storageUrl prop when calling PropertyDetailsSection in PropertyListingDetailPage
  - _Requirements: 2.2_




- [x] 4. Remove Gmail button from property list table
  - Locate the Gmail button TableCell in PropertyListingsPage.tsx
  - Remove the entire TableCell containing GmailDistributionButton
  - Remove GmailDistributionButton import if no longer used
  - Verify table layout adjusts correctly
  - _Requirements: 1.3_

- [x] 5. Test and verify all changes
  - Test Gmail button functionality from property detail page header
  - Verify storage URL displays correctly in Maps section
  - Verify storage URL removed from Details section
  - Verify Gmail button removed from property list table
  - Test with properties that have/don't have storage URLs
  - Check responsive layout on different screen sizes
  - Verify all links open correctly in new tabs
  - _Requirements: All_
