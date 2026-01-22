# Implementation Plan

- [x] 1. Fix site field display in SellersPage




  - Update table cell to use `seller.site` instead of `seller.inquirySite`
  - Test that site values display correctly in the table
  - _Requirements: 1.1, 1.2, 1.3_

- [x] 2. Fix site field in NewSellerPage registration form


  - Replace text input with Select dropdown component
  - Add siteOptions array with all valid site values
  - Update form state to use `site` field name
  - Update form submission to send `site` field to backend
  - Test that site dropdown displays all options and saves correctly
  - _Requirements: 2.1, 2.2, 2.3, 2.4_

- [x] 3. Add site field display in CallModePage "Other" section


  - Locate the "Other" section in the CallModePage component
  - Add site field display with current value
  - Add edit functionality using existing site editing logic
  - Ensure site field is visible and properly formatted
  - Test that site displays and can be edited in call mode
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 4. Final verification



  - Ensure all tests pass, ask the user if questions arise
  - Verify all three issues are resolved
  - Test end-to-end flow: create seller with site → view in table → edit in call mode
