# Migration 009: Full Seller Fields Expansion

## Overview

This migration adds 100+ fields to the sellers and properties tables for comprehensive seller list management. It expands the database schema to support all features required by the seller-list-management specification.

## What This Migration Does

### Sellers Table (70+ new fields)
- **Inquiry Information**: Site tracking, inquiry dates, reasons, URLs
- **Valuation Information**: Multiple valuation amounts, methods, PDF URLs, tax info
- **Follow-up & Communication**: Email/mail dates, contact methods, preferred times
- **Visit Valuation**: Visit dates, times, assignees, notes, ratios
- **Status & Progress**: Assignees, contract dates, comments
- **Competitor Info**: Competitor names, decision factors, countermeasures
- **Pinrich**: Status tracking
- **Duplicate Management**: Past info, copy functions, purchase info
- **Exclusion Management**: Sites, criteria, dates, actions
- **Other**: Cancel notices, scripts, introductions

### Properties Table (4 new fields)
- Land/building area verification
- Floor plan
- Seller situation

### Status Enum Expansion
Adds new status values:
- `exclusive_contract` (専任媒介)
- `general_contract` (一般媒介)
- `other_decision` (他決)
- `follow_up_not_needed` (追客不要)

### Performance Indexes
20+ new indexes for optimized queries on:
- Inquiry tracking
- Valuation amounts
- Visit dates
- Status fields
- Exclusion dates
- And more...

## How to Run This Migration

### Option 1: Supabase Dashboard (Recommended)

1. **Open Supabase Dashboard**
   - Go to https://supabase.com/dashboard
   - Select your project

2. **Navigate to SQL Editor**
   - Click on "SQL Editor" in the left sidebar
   - Click "New Query"

3. **Copy Migration SQL**
   - Open `backend/migrations/009_full_seller_fields_expansion.sql`
   - Copy the entire contents (Ctrl+A, Ctrl+C)

4. **Paste and Execute**
   - Paste into the SQL Editor (Ctrl+V)
   - Click "Run" button or press Ctrl+Enter
   - Wait for execution (30-60 seconds)

5. **Verify Success**
   - You should see "Success. No rows returned" message
   - Check for any error messages

### Option 2: Supabase CLI

```bash
# From project root
cd backend/migrations

# Run migration using Supabase CLI
supabase db push
```

## Verification

After running the migration, verify it was successful:

### Automated Verification

```bash
# From backend directory
cd backend
npm run verify-migration-009

# Or using ts-node directly
npx ts-node migrations/verify-009-migration.ts
```

### Manual Verification

Run these SQL queries in Supabase SQL Editor:

```sql
-- Check sellers table columns
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'sellers' 
AND column_name IN (
    'inquiry_site', 'valuation_amount_1', 'valuation_amount_2', 
    'pinrich_status', 'exclusion_date'
)
ORDER BY column_name;
-- Expected: 5 rows

-- Check properties table columns
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'properties' 
AND column_name IN (
    'land_area_verified', 'building_area_verified', 
    'floor_plan', 'seller_situation'
);
-- Expected: 4 rows

-- Test data insertion
INSERT INTO sellers (
    name, address, phone_number, 
    inquiry_site, valuation_amount_1, pinrich_status
) VALUES (
    'Test Seller', 'Test Address', '1234567890',
    'ウ', 50000000, '配信中'
) RETURNING id, seller_number, inquiry_site, valuation_amount_1;
-- Should return a row with generated seller_number

-- Clean up test data
DELETE FROM sellers WHERE name = 'Test Seller';
```

## Rollback

If you need to undo this migration:

1. **Open Supabase Dashboard → SQL Editor**
2. **Copy contents of**: `backend/migrations/009_full_seller_fields_expansion_rollback.sql`
3. **Paste and execute**

⚠️ **Warning**: Rollback will delete all data in the new columns!

## Troubleshooting

### Error: "column already exists"
- **Cause**: Some columns may have been added in a previous migration
- **Solution**: This is safe to ignore. The migration uses `IF NOT EXISTS`

### Error: "constraint already exists"
- **Cause**: The status constraint is being recreated
- **Solution**: This is expected. The old constraint is dropped first

### Timeout Error
- **Cause**: Large migration taking too long
- **Solution**: 
  - Try running in Supabase CLI instead of dashboard
  - Or split the migration into smaller batches

### Permission Error
- **Cause**: Insufficient database permissions
- **Solution**: 
  - Ensure you're logged in as project owner
  - Check that service role key is correct in .env

## Impact Assessment

- **Database Size**: Increases table size, but most fields will be NULL initially
- **Performance**: Minimal impact; indexes optimize query patterns
- **Backward Compatibility**: ✅ Fully compatible; all new fields are optional
- **Data Loss Risk**: ✅ None; only adds new structures
- **Downtime**: ✅ None; migration runs online

## Next Steps

After successful migration:

1. ✅ **Update TypeScript Types** (Task 2)
   - Update `backend/src/types/index.ts`
   - Update `frontend/src/types/index.ts`

2. ✅ **Implement Services** (Tasks 3-17)
   - SellerNumberService
   - DuplicateDetectionService
   - And more...

3. ✅ **Update API Endpoints** (Task 18)
   - Add new field handling
   - Update validation

4. ✅ **Update Frontend** (Tasks 20-25)
   - Registration forms
   - Detail pages
   - List views

## Files in This Migration

- `009_full_seller_fields_expansion.sql` - Main migration file
- `009_full_seller_fields_expansion_rollback.sql` - Rollback script
- `verify-009-migration.ts` - Automated verification script
- `009_README.md` - This file

## Support

If you encounter issues:

1. Check the verification output for specific errors
2. Review the SUPABASE_MIGRATION.md file for detailed documentation
3. Check Supabase Dashboard → Database → Logs for error details
4. Ensure all previous migrations (001-008) have been applied

## Migration Checklist

- [ ] Backup database (optional but recommended)
- [ ] Run migration SQL in Supabase Dashboard
- [ ] Verify migration success (run verification script)
- [ ] Check for any error messages
- [ ] Test inserting data with new fields
- [ ] Update application code to use new fields
- [ ] Deploy updated application

---

**Migration Version**: 009  
**Date Created**: 2024-12-02  
**Spec**: seller-list-management  
**Task**: 1. データベーススキーマの全フィールド拡張
