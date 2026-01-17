# Implementation Plan

- [x] 1. Add SUUMO URL display to PropertyListingDetailPage



  - Add SUUMO URL field to the "地図　サイトURL等" section
  - Follow the existing pattern used for Google Map URL and Storage Location URL
  - Insert between Google Map URL and Storage Location URL
  - Use conditional rendering to only show when `suumo_url` exists
  - Apply consistent styling: `wordBreak: 'break-all'`, `fontSize: '0.9rem'`
  - Set link attributes: `target="_blank"`, `rel="noopener noreferrer"`
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 3.1, 3.2, 3.3_

- [ ]* 1.1 Write unit tests for SUUMO URL display
  - Test that SUUMO URL is displayed when `suumo_url` field exists
  - Test that SUUMO URL is not displayed when `suumo_url` field is absent
  - Test that link has correct attributes (`target="_blank"`, `rel="noopener noreferrer"`)
  - Test that label displays "SUUMO URL"
  - Test that styling matches existing URL fields
  - Test display order: Google Map URL → SUUMO URL → Storage Location URL
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 3.1, 3.2_

- [ ]* 1.2 Write property test for SUUMO URL conditional display
  - **Property 1: SUUMO URL conditional display**
  - **Validates: Requirements 1.1, 1.4**
  - Generate random property listing data with and without `suumo_url`
  - Verify that SUUMO URL is displayed only when field is present and non-empty
  - Verify that label "SUUMO URL" is shown when displayed
  - _Requirements: 1.1, 1.4_

- [ ]* 1.3 Write property test for SUUMO URL absence handling
  - **Property 2: SUUMO URL absence handling**
  - **Validates: Requirements 1.3**
  - Generate random property listing data without `suumo_url` or with empty string
  - Verify that SUUMO URL field is not rendered
  - _Requirements: 1.3_

- [ ]* 1.4 Write property test for URL display consistency
  - **Property 3: URL display consistency**
  - **Validates: Requirements 3.1**
  - Generate random URL strings for all URL fields
  - Verify that all displayed URLs use consistent styling and layout
  - Check Typography label and Link component structure
  - _Requirements: 3.1_

- [ ] 2. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.
