# Property Listing Update Sync

## Overview

Implement UPDATE functionality in PropertyListingSyncService to enable automatic synchronization of property listing changes from the spreadsheet to the database. Currently, the service only supports INSERT operations, causing properties like AA9313 to have stale data when their ATBB status or other fields are updated in the spreadsheet.

## Problem Statement

### Current Issue
- PropertyListingSyncService only implements INSERT, not UPDATE
- Properties with changed data in spreadsheet don't get updated in database
- Example: AA9313's `atbb成約済み/非公開` status changed in spreadsheet but not reflected in database
- Manual fix scripts are required for each property update
- No automatic detection of spreadsheet changes

### Root Cause Analysis
**PropertyListingSyncService.ts** (lines 50-100):
```typescript
// Only INSERT logic exists
async syncPropertyListings() {
  const newPropertyListings = await this.detectNewPropertyListings();
  // ... INSERT logic only
}
```

**Missing Functionality:**
- ❌ No `detectUpdatedPropertyListings()` method
- ❌ No `updatePropertyListing()` method  
- ❌ No `syncUpdatedPropertyListings()` method
- ❌ Not integrated with EnhancedAutoSyncService

### Spreadsheet Architecture
**Property Listings Spreadsheet:**
- **Spreadsheet ID:** `1tI_iXaiLuWBggs5y0RH7qzkbHs9wnLLdRekAmjkhcLY`
- **Sheet Name:** `物件`
- **Syncs to:** `property_listings` table
- **Current Service:** `PropertyListingSyncService` (INSERT only)

**Sellers Spreadsheet:**
- **Spreadsheet ID:** `1wKBRLWbT6pSKa9IlTDabjhjTnfs_GxX6Rn6M6kbio1I`
- **Sheet Name:** `売主リスト`
- **Syncs to:** `sellers` table
- **Service:** `EnhancedAutoSyncService` (INSERT + UPDATE)

## User Stories

### US-1: Detect Property Listing Updates
**As a** system administrator  
**I want** the system to automatically detect when property listings are updated in the spreadsheet  
**So that** I don't need to manually track changes

**Acceptance Criteria:**
- System compares spreadsheet data with database data
- Identifies properties with changed fields
- Detects changes in all mapped columns (status, ATBB status, etc.)
- Logs detected changes for audit trail
- Handles edge cases (null values, empty strings)

### US-2: Update Property Listings in Database
**As a** system administrator  
**I want** detected property listing updates to be automatically applied to the database  
**So that** the database always reflects the current spreadsheet state

**Acceptance Criteria:**
- Updates are applied atomically (all or nothing)
- Only changed fields are updated (not full row replacement)
- `updated_at` timestamp is set correctly
- Update failures are logged with details
- Rollback occurs on error

### US-3: Integrate with Auto-Sync
**As a** system administrator  
**I want** property listing updates to run automatically on schedule  
**So that** data stays synchronized without manual intervention

**Acceptance Criteria:**
- Property listing update sync runs as part of auto-sync cycle
- Runs after seller sync (Phase 3) and before other phases
- Respects rate limiting and error handling
- Reports sync status to monitoring dashboard
- Can be manually triggered via API

### US-4: Monitor Sync Status
**As a** system administrator  
**I want** to see sync status and history for property listings  
**So that** I can verify updates are working correctly

**Acceptance Criteria:**
- Sync logs show number of properties updated
- Individual property update history is tracked
- Failed updates are highlighted
- Sync duration is recorded
- Alerts trigger on repeated failures

## Technical Requirements

### TR-1: Implement Update Detection
**File:** `backend/src/services/PropertyListingSyncService.ts`

**New Method:**
```typescript
async detectUpdatedPropertyListings(): Promise<PropertyListingUpdate[]> {
  // 1. Read all property listings from spreadsheet
  // 2. Read all property listings from database
  // 3. Compare field by field
  // 4. Return list of properties with changes
}
```

**Change Detection Logic:**
- Compare all mapped columns from `property-listing-column-mapping.json`
- Normalize values (trim whitespace, handle null/empty)
- Track which specific fields changed
- Include old and new values in result

### TR-2: Implement Update Execution
**File:** `backend/src/services/PropertyListingSyncService.ts`

**New Method:**
```typescript
async updatePropertyListing(
  propertyNumber: string,
  updates: Partial<PropertyListing>
): Promise<void> {
  // 1. Validate property exists
  // 2. Apply updates to database
  // 3. Set updated_at timestamp
  // 4. Log update to sync_logs
}
```

**Update Logic:**
- Use Supabase `.update()` with `.eq('property_number', ...)`
- Only update changed fields (not full row)
- Handle errors gracefully
- Return success/failure status

### TR-3: Implement Batch Update Sync
**File:** `backend/src/services/PropertyListingSyncService.ts`

**New Method:**
```typescript
async syncUpdatedPropertyListings(): Promise<SyncResult> {
  // 1. Detect updated properties
  // 2. Update each property in database
  // 3. Log results
  // 4. Return summary
}
```

**Batch Processing:**
- Process updates in batches of 10
- Continue on individual failures
- Collect all errors for reporting
- Return detailed summary

### TR-4: Integrate with EnhancedAutoSyncService
**File:** `backend/src/services/EnhancedAutoSyncService.ts`

**Add Phase 4:**
```typescript
// Phase 4: Property Listings Update Sync
const propertyListingUpdateResult = 
  await this.propertyListingSyncService.syncUpdatedPropertyListings();
```

**Integration Points:**
- Run after Phase 3 (seller sync)
- Use same error handling pattern
- Report to sync monitoring
- Respect rate limits

### TR-5: Add Sync Monitoring
**Database:** Add to `sync_logs` table

**Log Fields:**
- `sync_type`: 'property_listing_update'
- `properties_updated`: count
- `properties_failed`: count
- `duration_ms`: execution time
- `error_details`: JSON of failures

### TR-6: Create Manual Sync Script
**File:** `backend/sync-property-listings-updates.ts`

**Purpose:**
- Manually trigger property listing update sync
- Useful for testing and one-off syncs
- Provides detailed output

**Usage:**
```bash
npx ts-node sync-property-listings-updates.ts
```

## Implementation Plan

### Phase 1: Core Update Logic (2 hours)
1. Implement `detectUpdatedPropertyListings()`
2. Implement `updatePropertyListing()`
3. Implement `syncUpdatedPropertyListings()`
4. Add unit tests

### Phase 2: Integration (1 hour)
1. Integrate with `EnhancedAutoSyncService`
2. Add sync monitoring logs
3. Test end-to-end sync

### Phase 3: Manual Scripts (1 hour)
1. Create `sync-property-listings-updates.ts`
2. Update existing fix scripts to use new service
3. Add documentation

### Phase 4: Testing & Validation (1 hour)
1. Test with AA9313 (known issue)
2. Test with multiple properties
3. Verify auto-sync integration
4. Load testing

## Success Metrics

- ✅ AA9313 ATBB status updates automatically
- ✅ All property listing fields sync correctly
- ✅ Update sync runs as part of auto-sync
- ✅ Sync logs show update activity
- ✅ No manual fix scripts needed for updates
- ✅ Sync completes in under 2 minutes for 100 properties

## Dependencies

- `PropertyListingSyncService.ts` - needs UPDATE methods
- `EnhancedAutoSyncService.ts` - needs Phase 4 integration
- `property-listing-column-mapping.json` - column mappings
- `sync_logs` table - monitoring
- Property listings spreadsheet access

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Overwriting manual edits | Data loss | Add `last_manual_edit` timestamp check |
| Sync conflicts | Data inconsistency | Use optimistic locking with `updated_at` |
| Performance issues | Slow sync | Batch processing, rate limiting |
| Spreadsheet API limits | Sync failures | Implement exponential backoff |
| Missing data in spreadsheet | Null values | Preserve existing DB values if spreadsheet empty |

## Testing Strategy

### Unit Tests
- Test `detectUpdatedPropertyListings()` with various scenarios
- Test `updatePropertyListing()` with different field changes
- Test error handling and edge cases
- Mock Supabase and GoogleSheetsClient

### Integration Tests
- Test full sync cycle with test data
- Verify auto-sync integration
- Test with AA9313 (real data)
- Verify sync logs are created

### Manual Testing
1. Update AA9313 in spreadsheet
2. Run manual sync script
3. Verify database updated
4. Check sync logs
5. Test auto-sync integration

## Documentation

### Code Documentation
- Add JSDoc comments to new methods
- Document change detection algorithm
- Explain update logic

### User Documentation
- Update `PROPERTY_LISTING_UPDATE_IMPLEMENTATION_PLAN.md`
- Create quick start guide for manual sync
- Document troubleshooting steps

### Developer Documentation
- Add architecture diagram
- Document sync flow
- Explain integration points

## Out of Scope

- Bidirectional sync (database → spreadsheet)
- Conflict resolution UI
- Real-time sync (webhook-based)
- Historical change tracking
- Undo functionality

## Timeline

- **Phase 1:** 2 hours (Core update logic)
- **Phase 2:** 1 hour (Integration)
- **Phase 3:** 1 hour (Manual scripts)
- **Phase 4:** 1 hour (Testing)

**Total estimated time:** 5 hours

## Related Issues

- AA9313 ATBB status not updating (immediate trigger)
- ~50 properties with stale storage_location data
- General property listing data staleness

## References

- `backend/fix-aa9313-atbb-status.ts` - Manual fix script (temporary solution)
- `backend/PROPERTY_LISTING_UPDATE_IMPLEMENTATION_PLAN.md` - Implementation plan
- `backend/src/services/PropertyListingSyncService.ts` - Service to update
- `backend/src/services/EnhancedAutoSyncService.ts` - Integration point
- `.kiro/specs/property-listing-storage-url-sync-fix/` - Related spec for storage URL issue
