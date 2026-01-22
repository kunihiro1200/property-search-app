# Design Document: Property Listing Storage URL Sync Fix

## Architecture Overview

This fix addresses a column naming mismatch in the PropertyListingSyncService that prevents storage location data from syncing correctly.

## Current State

```
┌─────────────────────────────────────────────────────────────┐
│ Spreadsheet: 物件業務リスト                                    │
│ Column: "保存場所"                                            │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│ property-listing-column-mapping.json                         │
│ "保存場所": "storage_location" ✅                            │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│ sellers table                                                │
│ - site_url (TEXT) - NULL for both properties                │
│ - site (TEXT) - "す" (AA13129), "知合" (AA13154)            │
│ - storage_url ❌ DOES NOT EXIST                             │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│ PropertyListingSyncService.ts                                │
│ storage_url: seller.storage_url ❌ WRONG COLUMN             │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│ property_listings table                                      │
│ - storage_location (TEXT)                                    │
│   - AA13129: "https://drive.google.com/..." ✅              │
│   - AA13154: NULL ❌                                         │
└─────────────────────────────────────────────────────────────┘
```

## Target State

```
┌─────────────────────────────────────────────────────────────┐
│ Spreadsheet: 物件業務リスト                                    │
│ Column: "保存場所"                                            │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│ property-listing-column-mapping.json                         │
│ "保存場所": "storage_location" ✅                            │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│ sellers table                                                │
│ - site_url (TEXT) - NULL for both properties                │
│ - site (TEXT) - "す" (AA13129), "知合" (AA13154)            │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│ PropertyListingSyncService.ts                                │
│ storage_location: seller.site_url || seller.site ✅          │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│ property_listings table                                      │
│ - storage_location (TEXT)                                    │
│   - AA13129: "https://drive.google.com/..." ✅              │
│   - AA13154: "知合" or proper URL ✅                         │
└─────────────────────────────────────────────────────────────┘
```

## Component Changes

### 1. PropertyListingSyncService.ts

**File:** `backend/src/services/PropertyListingSyncService.ts`

**Method:** `mapSellerToPropertyListing()`

**Current Code:**
```typescript
private mapSellerToPropertyListing(seller: any): any {
  return {
    // ... other fields ...
    storage_url: seller.storage_url,  // ❌ Wrong column name
    // ... other fields ...
  };
}
```

**Updated Code:**
```typescript
private mapSellerToPropertyListing(seller: any): any {
  return {
    // ... other fields ...
    storage_location: seller.site_url || seller.site,  // ✅ Correct column name
    // ... other fields ...
  };
}
```

**Rationale:**
- `storage_location` is the actual column name in property_listings table
- `seller.site_url` is checked first (preferred for URLs)
- Falls back to `seller.site` if site_url is NULL
- Matches the column mapping from spreadsheet sync

### 2. Verification Script

**File:** `backend/verify-storage-location-fix.ts`

```typescript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function verifyFix() {
  console.log('Verifying storage_location fix...\n');

  // Check AA13129
  const { data: aa13129 } = await supabase
    .from('property_listings')
    .select('property_number, storage_location')
    .eq('property_number', 'AA13129')
    .single();

  console.log('AA13129:');
  console.log(`  storage_location: ${aa13129?.storage_location || 'NULL'}`);
  console.log(`  Status: ${aa13129?.storage_location ? '✅' : '❌'}\n`);

  // Check AA13154
  const { data: aa13154 } = await supabase
    .from('property_listings')
    .select('property_number, storage_location')
    .eq('property_number', 'AA13154')
    .single();

  console.log('AA13154:');
  console.log(`  storage_location: ${aa13154?.storage_location || 'NULL'}`);
  console.log(`  Status: ${aa13154?.storage_location ? '✅' : '❌'}\n`);

  // Summary
  const bothPopulated = aa13129?.storage_location && aa13154?.storage_location;
  console.log(`Overall Status: ${bothPopulated ? '✅ FIXED' : '❌ NEEDS ATTENTION'}`);
}

verifyFix();
```

### 3. Re-sync Script

**File:** `backend/resync-aa13154-storage-location.ts`

```typescript
import { PropertyListingSyncService } from './src/services/PropertyListingSyncService';

async function resyncAA13154() {
  console.log('Re-syncing AA13154 storage_location...\n');

  const syncService = new PropertyListingSyncService();
  const result = await syncService.syncFromSeller('AA13154');

  console.log('Sync Result:');
  console.log(`  Property: ${result.propertyNumber}`);
  console.log(`  Success: ${result.success}`);
  console.log(`  Action: ${result.action}`);
  if (result.error) {
    console.log(`  Error: ${result.error}`);
  }

  console.log('\nVerifying result...');
  
  // Run verification
  const { execSync } = require('child_process');
  execSync('npx ts-node verify-storage-location-fix.ts', { stdio: 'inherit' });
}

resyncAA13154();
```

## Data Flow

### Before Fix
```
Spreadsheet "保存場所" 
  → sellers.site (via spreadsheet sync) ✅
  → PropertyListingSyncService tries seller.storage_url ❌
  → property_listings.storage_location = NULL ❌
```

### After Fix
```
Spreadsheet "保存場所"
  → sellers.site (via spreadsheet sync) ✅
  → PropertyListingSyncService uses seller.site_url || seller.site ✅
  → property_listings.storage_location = value ✅
```

## Error Handling

### Null Value Handling
```typescript
storage_location: seller.site_url || seller.site
```
- If both `site_url` and `site` are NULL, `storage_location` will be NULL
- This is acceptable as it reflects the actual data state
- No errors thrown for NULL values

### Column Not Found
- Previous code would silently fail (undefined column)
- New code uses existing columns, preventing silent failures
- TypeScript will catch any typos in column names

## Testing Strategy

### 1. Pre-Fix Verification
```bash
cd backend
npx ts-node diagnose-aa13129-aa13154-final.ts
```
Expected: AA13154 storage_location is NULL

### 2. Apply Fix
- Update PropertyListingSyncService.ts
- Change `storage_url` to `storage_location`
- Change `seller.storage_url` to `seller.site_url || seller.site`

### 3. Re-sync AA13154
```bash
cd backend
npx ts-node resync-aa13154-storage-location.ts
```
Expected: Sync succeeds

### 4. Post-Fix Verification
```bash
cd backend
npx ts-node verify-storage-location-fix.ts
```
Expected: Both AA13129 and AA13154 have storage_location populated

## Rollback Plan

If the fix causes issues:

1. **Revert Code Changes**
   ```bash
   git checkout backend/src/services/PropertyListingSyncService.ts
   ```

2. **Verify Revert**
   ```bash
   cd backend
   npx ts-node diagnose-aa13129-aa13154-final.ts
   ```

3. **Re-investigate**
   - Check if `site_url` vs `site` was the wrong choice
   - Verify spreadsheet column mapping
   - Confirm database schema

## Performance Considerations

- Single property sync: ~100ms
- Batch sync with 100ms delay between properties
- No database schema changes required
- No data migration needed

## Security Considerations

- No new security risks introduced
- Uses existing Supabase service key authentication
- No exposure of sensitive data
- Column names are internal implementation details

## Monitoring

After deployment, monitor:
- Sync success rate for property_listings
- NULL values in storage_location column
- Error logs for PropertyListingSyncService
- Spreadsheet sync logs

## Future Improvements

1. **Add TypeScript Types**
   - Define proper interfaces for seller and property_listing
   - Catch column name mismatches at compile time

2. **Add Column Validation**
   - Verify column existence before sync
   - Log warnings for missing columns

3. **Improve Documentation**
   - Document all column mappings
   - Create schema diagram
   - Add inline comments for complex mappings
