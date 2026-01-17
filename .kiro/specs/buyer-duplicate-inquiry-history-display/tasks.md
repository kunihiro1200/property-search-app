# Implementation Plan: Buyer Duplicate Inquiry History Display

## Overview

This implementation focuses on improving error handling and resilience in the buyer detail page for displaying duplicate buyer inquiry history and Gmail distribution functionality. The backend already correctly handles duplicate buyer history aggregation, so changes are primarily frontend-focused.

## Tasks

- [x] 1. Enhance inquiry history fetch error handling
  - Improve error handling in `fetchInquiryHistoryTable` function
  - Add validation for response structure
  - Set empty array on error to prevent crashes
  - Display user-friendly error messages
  - _Requirements: 1.1, 1.2, 3.1, 3.2_

- [x] 2. Improve Gmail send button error handling
  - [x] 2.1 Add empty selection validation
    - Check if any properties are selected before proceeding
    - Display warning message if no properties selected
    - _Requirements: 2.4_

  - [x] 2.2 Implement resilient property details fetching
    - Wrap individual property fetches in try-catch
    - Continue fetching even if some properties fail
    - Filter out null values from failed fetches
    - _Requirements: 2.1, 2.2, 2.3_

  - [x] 2.3 Add partial success handling
    - Display warning if some properties failed to fetch
    - Proceed with successfully fetched properties
    - Display error if all properties failed to fetch
    - _Requirements: 2.3, 3.3_

  - [x] 2.4 Improve error messages
    - Log specific property IDs that failed
    - Display count of failed properties
    - Provide clear user-friendly messages
    - _Requirements: 3.2, 3.3, 3.4_

- [x] 3. Update InquiryHistoryTable component
  - [x] 3.1 Add loading state display
    - Show loading indicator while fetching history
    - Disable interactions during loading
    - _Requirements: 1.1_

  - [x] 3.2 Add empty state handling
    - Display appropriate message when no history exists
    - Handle case where buyer has no duplicates
    - _Requirements: 1.4_

  - [x] 3.3 Enhance buyer number display
    - Clearly show which buyer number each inquiry came from
    - Add visual distinction for current vs past buyer records
    - _Requirements: 1.3, 1.5_

- [ ]* 4. Add unit tests for error handling
  - [ ]* 4.1 Test fetchInquiryHistoryTable error scenarios
    - Test successful fetch with valid data
    - Test fetch with empty response
    - Test fetch with network error
    - Test fetch with invalid response format
    - _Requirements: 3.1, 3.2_

  - [ ]* 4.2 Test handleGmailSend error scenarios
    - Test with no properties selected
    - Test with valid properties
    - Test with some properties returning 404
    - Test with all properties returning 404
    - _Requirements: 2.3, 2.4, 3.2_

- [ ]* 5. Add integration tests
  - [ ]* 5.1 Test end-to-end inquiry history display
    - Create test buyer with duplicates
    - Verify all properties from all buyers are displayed
    - Verify buyer numbers are correctly annotated
    - Verify status markers are correct
    - _Requirements: 1.1, 1.2, 1.3, 1.5_

  - [ ]* 5.2 Test end-to-end Gmail send flow
    - Select properties from inquiry history
    - Click Gmail send button
    - Verify email modal opens with correct properties
    - Verify error handling for missing properties
    - _Requirements: 2.1, 2.2, 2.3_

- [x] 6. Checkpoint - Verify all functionality
  - Test with known duplicate buyers (e.g., 6647 and 6648)
  - Verify inquiry history displays correctly
  - Verify Gmail send handles errors gracefully
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Backend changes are not required - the API already handles duplicate buyers correctly
- Focus is on frontend error handling and resilience
- Test with real duplicate buyer data to ensure correctness
- Monitor error logs after deployment for any remaining issues
