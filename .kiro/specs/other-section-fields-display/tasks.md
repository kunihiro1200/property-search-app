# Implementation Plan

- [ ] 1. Add site fields to frontend seller detail page
  - Add state variables for `editedSite` and `editedExclusionSite` in SellerDetailPage component
  - Initialize these state variables in the `loadSellerData()` function
  - Add UI section with "他" (Other) label using Divider and Chip components
  - Add TextField component for "サイト等" (site) field
  - Add TextField component for "除外サイト" (exclusion_site) field
  - Position fields side-by-side on desktop (md={6}), stacked on mobile
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 3.1, 3.2, 3.3, 3.4_

- [ ] 2. Implement save functionality for site fields
  - Update `handleSave()` function to include `site` and `exclusionSite` in the update payload
  - Ensure field values are sent to the backend API when user clicks save button
  - Update the cancel/reset logic to reset these fields when user cancels editing
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [ ] 3. Verify backend API includes site fields
  - Confirm `SellerService.getSellerById()` returns `site` and `exclusion_site` fields
  - Confirm `SellerService.updateSeller()` accepts and persists `site` and `exclusion_site` fields
  - Verify field mapping between camelCase (frontend) and snake_case (database) is correct
  - Test with AA12903 seller record to ensure fields are properly retrieved and updated
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [ ] 4. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.
