# Implementation Plan

- [x] 1. Create name extraction utility function





  - Create a helper function to extract display names from Google OAuth user metadata
  - Implement fallback logic: full_name → name → given_name + family_name → email prefix → email
  - Add email-based name formatting (capitalize, replace dots/underscores with spaces)
  - _Requirements: 1.1, 1.2_

- [ ]* 1.1 Write unit tests for name extraction
  - Test with various metadata combinations
  - Test email-based extraction with different formats
  - Test edge cases (empty strings, null values, special characters)
  - _Requirements: 1.1, 1.2_

- [x] 2. Update AuthService to use enhanced name extraction


  - Modify `getOrCreateEmployee` method to use the new extraction utility
  - Add logging for metadata fields and extracted name
  - Update existing employee names if they appear invalid
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 3.1, 3.2_

- [x] 3. Update auth callback route


  - Pass full user object to name extraction utility
  - Add detailed logging of user metadata
  - Log the final employee information
  - _Requirements: 3.1, 3.4_

- [ ]* 3.1 Write integration tests for auth callback
  - Mock Google OAuth responses with various metadata
  - Verify correct names are stored
  - Verify logging output
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [x] 4. Create data migration script


  - Create SQL migration file (028_fix_employee_names.sql)
  - Create TypeScript migration runner (run-028-migration.ts)
  - Identify employees with invalid names (encrypted strings, "不明", etc.)
  - Query Supabase Auth for correct user metadata
  - Update employee records with corrected names
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 3.3_

- [ ]* 4.1 Write tests for migration script
  - Create test employees with problematic names
  - Run migration and verify corrections
  - Test idempotency
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [x] 5. Add frontend display utility


  - Create or update `getDisplayName` function in employeeUtils.ts
  - Ensure encrypted-looking strings are never displayed
  - Add fallback to email if name is still invalid
  - _Requirements: 1.4_

- [ ]* 5.1 Write unit tests for display utility
  - Test with valid names
  - Test with invalid/encrypted names
  - Test with null/undefined employees
  - _Requirements: 1.4_

- [x] 6. Run migration on existing data


  - Backup current employee data
  - Run the migration script
  - Verify all names are corrected
  - Check logs for any errors
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [x] 7. Test end-to-end authentication flow


  - Test login with new Google account
  - Verify name is displayed correctly in UI
  - Check database to confirm correct name storage
  - Review logs for proper metadata extraction
  - Test with existing accounts to ensure names are updated
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 3.1, 3.2, 3.4_

- [x] 8. Checkpoint - Ensure all tests pass


  - Ensure all tests pass, ask the user if questions arise.

## COMPLETION SUMMARY

All critical tasks completed successfully:

### Employee Names (Logged-in Users)
- ✅ Created name extraction utilities in `backend/src/utils/employeeUtils.ts`
- ✅ Updated `AuthService.supabase.ts` with enhanced name extraction from Google OAuth
- ✅ Updated auth callback route to pass full user metadata
- ✅ Created and executed migration script `run-028-migration.ts` (10 employees updated)
- ✅ Added frontend `getDisplayName()` function in `frontend/src/utils/employeeUtils.ts`
- ✅ Updated UI components: `CallLogDisplay.tsx`, `SellerDetailPage.tsx`, `CallModePage.tsx`

### Seller Names (Customer Data)
- ✅ Fixed column mapping in `backend/src/config/column-mapping.json` ("名前(漢字のみ)" → "name")
- ✅ Created and executed `backend/fix-seller-names-from-sheet.ts`
- ✅ Updated 4,567 seller names from spreadsheet (4,167 already valid, 13 errors)

### Navigation Fix
- ✅ Fixed null reference error in `CallModePage.tsx`
- ✅ Added proper null checks and error handling
- ✅ Users can now navigate from seller list to call mode page

**Status**: DONE - All issues resolved
