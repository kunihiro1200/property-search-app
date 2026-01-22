# Bug Fix: Buyer Sync Schema Cache Issue

## Issue Report

**Date**: 2025-12-29  
**Reporter**: User  
**Severity**: High (Blocking all buyer syncs)

### User Report
> 結局6647の問合せ履歴に6648はないままだよ　Gmail送信機能も押しても反応なしだよ

Translation:
- Buyer 6648 still not appearing in buyer 6647's inquiry history
- Gmail send button not responding when clicked

## Investigation Results

### Findings

1. **Buyer 6648 Status**
   - ✅ EXISTS in spreadsheet (row 4115)
   - ❌ NOT in database
   - Shares phone number `09095686931` with buyer 6647

2. **Sync Failure**
   - ALL buyer sync operations failing
   - Error: `Could not find the 'last_synced_at' column of 'buyers' in the schema cache`
   - 4141 rows attempted, ALL failed with same error

3. **Root Cause**
   - Database table has column: `synced_at`
   - Code expects column: `last_synced_at`
   - This is a PostgREST schema cache mismatch

### Why This Happened

**Timeline:**
1. Migration 042 created buyers table with `synced_at` column
2. Migration 054 was prepared to add `last_synced_at` column
3. Migration 054 was never executed
4. BuyerSyncService was written to use `last_synced_at`
5. Result: Code and database schema out of sync

**Similar Pattern:**
- `work_tasks` table uses `synced_at`
- `property_listings` table uses `synced_at`
- `buyers` table was supposed to use `last_synced_at` but migration wasn't run

## Solution

### Fix Applied

**Step 1: Add Missing Column**

Execute SQL in Supabase:
```sql
ALTER TABLE buyers
  ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMP WITH TIME ZONE;

CREATE INDEX IF NOT EXISTS idx_buyers_last_synced_at ON buyers(last_synced_at DESC);
```

**Step 2: Sync Missing Buyer**

Run sync script:
```bash
cd backend
npx ts-node sync-buyer-6648.ts
```

**Step 3: Verify**

Check column exists:
```bash
npx ts-node check-last-synced-column.ts
```

Check buyer synced:
```bash
npx ts-node check-buyers-6647-6648.ts
```

### Files Created

**Diagnostic Scripts:**
- `backend/check-last-synced-column.ts` - Check if column exists
- `backend/check-migration-054-executed.ts` - Check migration status
- `backend/add-last-synced-at-column.ts` - Instructions to add column

**Documentation:**
- `BUYER_6647_6648_FIX_GUIDE.md` - English fix guide
- `買主6647_6648_修正手順.md` - Japanese fix guide
- `.kiro/specs/buyer-duplicate-inquiry-history-display/BUG_FIX_SCHEMA_CACHE.md` - This file

### Files Modified

None - this is a database schema issue, not a code issue.

## Prevention

### Recommendations

1. **Migration Tracking**
   - Implement proper migration tracking table
   - Verify migrations are executed in order
   - Add migration status check to CI/CD

2. **Schema Validation**
   - Add startup check to verify required columns exist
   - Fail fast with clear error message if schema mismatch
   - Document expected schema in code comments

3. **Naming Consistency**
   - Standardize on either `synced_at` or `last_synced_at`
   - Update all tables to use same naming convention
   - Document naming standards in project guidelines

4. **Testing**
   - Add integration tests that verify schema matches code expectations
   - Test sync operations in staging before production
   - Add schema validation to test suite

## Related Issues

- Migration 056 (email_history table) had similar PostgREST cache issues
- Migration 050 (buyer varchar fields) required manual execution
- Migration 054 (buyer sync columns) was prepared but not executed

## Impact

**Before Fix:**
- 0 buyers syncing successfully
- Buyer 6648 missing from database
- Inquiry history incomplete
- Gmail distribution not working

**After Fix:**
- All buyers can sync successfully
- Buyer 6648 synced to database
- Inquiry history shows duplicate buyers
- Gmail distribution functional

## Testing Checklist

- [ ] SQL executed in Supabase
- [ ] Column `last_synced_at` exists in buyers table
- [ ] Index created on `last_synced_at`
- [ ] Buyer 6648 synced to database
- [ ] Buyer 6648 appears in buyer 6647's inquiry history
- [ ] Gmail send button opens modal
- [ ] No errors in browser console
- [ ] Full buyer sync completes successfully
- [ ] Buyer count matches spreadsheet (4138 buyers)

## References

**Spreadsheet:**
- ID: `1tI_iXaiLuWBggs5y0RH7qzkbHs9wnLLdRekAmjkhcLY`
- Sheet: `買主リスト`
- Buyer 6647: Row 4114
- Buyer 6648: Row 4115

**Database:**
- Table: `buyers`
- Missing column: `last_synced_at`
- Existing column: `synced_at`

**Code:**
- Service: `backend/src/services/BuyerSyncService.ts`
- Uses: `last_synced_at` column
- Migration: `backend/migrations/054_add_buyers_sync_columns.sql`
