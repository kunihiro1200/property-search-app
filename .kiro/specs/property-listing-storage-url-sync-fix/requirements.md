# Property Listing Storage URL Sync Fix

## Overview

Fix the storage URL sync discrepancy affecting approximately 50 properties (including AA11165, AA13129, and AA13154) where `storage_location` is missing or incorrect. The root cause is that the correct data source is the 業務依頼シート (Gyomu Irai Sheet) CO column, not the sellers table.

**Update (2026-01-06):** Batch processing scripts have been implemented to handle all ~50 affected properties at once.

## Problem Statement

### Current Issue
- Approximately 50 properties have missing or incorrect `storage_location` values
- Example properties: AA11165, AA13129, AA13154
- Root cause: Data should be sourced from 業務依頼シート CO column (column 93), not from sellers table
- Sellers table contains incorrect or incomplete data for storage locations

### Database Schema Reality
**sellers table:**
- ✅ `site_url` (TEXT) - exists but often NULL or incorrect
- ✅ `site` (TEXT) - exists but often contains abbreviated values
- ❌ `storage_url` - **does not exist**
- ⚠️ **Not the authoritative source for storage locations**

**property_listings table:**
- ✅ `storage_location` (TEXT) - correct column name
- ❌ Many properties have NULL or incorrect values

**Authoritative Data Source:**
- ✅ **業務依頼シート (Gyomu Irai Sheet)**
- Spreadsheet ID: `1MO2vs0mDUFCgM-rjXXPRIy3pKKdfIFvUDwacM-2174g`
- Sheet name: `業務依頼`
- Column A: Property number (物件番号)
- Column CO (93): Storage location URL (保存場所)

### Column Mapping Mismatch
1. **Spreadsheet sync** (`property-listing-column-mapping.json`): ✅ Correct
   ```json
   "保存場所": "storage_location"
   ```

2. **PropertyListingSyncService.ts**: ❌ Incorrect
   ```typescript
   storage_url: seller.storage_url  // References non-existent column
   ```

## User Stories

### US-1: Fix Column Reference
**As a** system administrator  
**I want** PropertyListingSyncService to reference the correct database columns  
**So that** storage location data syncs correctly for all properties

**Acceptance Criteria:**
- PropertyListingSyncService uses `storage_location` instead of `storage_url`
- Service references existing seller columns (`site_url` or `site`)
- No references to non-existent `storage_url` column remain

### US-2: Batch Fix All Affected Properties
**As a** system administrator  
**I want** to fix all ~50 properties with missing storage_location in one operation  
**So that** all properties have correct storage location data from the authoritative source

**Acceptance Criteria:**
- Batch script identifies all properties with missing or mismatched storage_location
- Script reads correct values from 業務依頼シート CO column
- All ~50 properties are updated in a single batch operation
- Detailed report shows success/failure for each property
- Process completes in under 5 minutes

### US-3: Prevent Future Issues
**As a** developer  
**I want** column naming to be consistent across the codebase  
**So that** similar sync issues don't occur in the future

**Acceptance Criteria:**
- All references to storage location use `storage_location`
- Column mapping documentation is updated
- Diagnostic scripts verify column consistency

## Technical Requirements

### TR-1: Implement Batch Diagnostic Script ✅
- Read all property numbers from 業務依頼シート column A
- Read all storage URLs from 業務依頼シート column CO
- Compare with database property_listings.storage_location
- Generate detailed mismatch report
- **Status:** Implemented in `find-and-fix-all-storage-location-mismatches.ts`

### TR-2: Implement Batch Fix Script ✅
- Accept FIX=true environment variable to enable modifications
- Update all mismatched properties in batch
- Provide progress feedback during execution
- Generate success/failure summary
- **Status:** Implemented in `find-and-fix-all-storage-location-mismatches.ts`

### TR-3: Implement Single Property Fix Script ✅
- Accept property number(s) as command-line arguments
- Search 業務依頼シート for property row
- Extract CO column value
- Update database
- Support multiple properties in one execution
- **Status:** Implemented in `fix-storage-location-for-any-property.ts`

### TR-4: Update PropertyListingSyncService (Future)
- Consider updating sync service to read from 業務依頼シート directly
- Add proper error handling for missing data
- Ensure future syncs use correct data source
- **Status:** Deferred (manual scripts sufficient for now)

## Out of Scope

- Adding new `storage_url` column (use existing `storage_location`)
- Migrating data between columns
- Changing spreadsheet column names
- Modifying database schema

## Success Metrics

- All ~50 affected properties have `storage_location` populated ✅
- Values match 業務依頼シート CO column exactly ✅
- Batch processing completes successfully ✅
- No errors in execution logs ✅
- Future properties can be fixed using the same scripts ✅

## Dependencies

- Access to Supabase database
- PropertyListingSyncService.ts
- property-listing-column-mapping.json
- Diagnostic scripts for verification

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Wrong seller column chosen | Data mismatch | Verify spreadsheet mapping first |
| Existing data affected | Data loss | Test on AA13154 only first |
| Other services reference storage_url | Breaking changes | Search codebase for all references |

## Testing Strategy

### Unit Tests
- Test `mapSellerToPropertyListing` with various seller data
- Verify correct column mapping
- Test null handling

### Integration Tests
- Sync AA13154 and verify result
- Compare AA13129 and AA13154 storage_location values
- Run diagnostic script to confirm fix

### Manual Testing
1. Run diagnostic script before fix
2. Apply fix to PropertyListingSyncService
3. Re-sync AA13154
4. Run diagnostic script after fix
5. Verify both properties have storage_location populated

## Documentation

- Update PropertyListingSyncService code comments
- Document correct column names in README
- Add troubleshooting guide for sync issues
- Update column mapping documentation

## Timeline

- Investigation: ✅ Complete
- Spec creation: In progress
- Implementation: 1 hour
- Testing: 30 minutes
- Documentation: 30 minutes

**Total estimated time:** 2 hours
