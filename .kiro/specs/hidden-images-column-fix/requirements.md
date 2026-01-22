# Hidden Images Column Fix - Requirements

## Overview

Fix the missing `hidden_images` column in the `property_listings` table. The column was supposed to be added by migration 077, but the migration script was using Supabase REST API which cannot execute DDL statements.

## Problem Statement

### User Report
- User reported: "hidden_imagesカラムが実際にデータベースに存在していません"
- User ran migrations 077, 078, 076, and force-restart scripts multiple times
- User restarted Supabase multiple times
- Issue persisted despite all attempts

### Root Cause Analysis

**NOT a schema cache issue** (as initially diagnosed)

The real problems:
1. **REST API Limitation**: `run-077-migration.ts` uses Supabase REST API, which CANNOT execute DDL statements like `ALTER TABLE`
2. **Migration Never Executed**: The script only prints a message asking users to manually run SQL - it doesn't actually create the column
3. **DATABASE_URL Commented Out**: The `.env` file has `DATABASE_URL` commented out, preventing direct PostgreSQL connection
4. **Column Physically Missing**: Verification confirmed the `hidden_images` column does NOT exist in the database

## User Stories

### US-1: Execute Migration via Supabase SQL Editor
**As a** developer  
**I want to** execute the migration SQL directly in Supabase SQL Editor  
**So that** the `hidden_images` column is created in the database

**Acceptance Criteria:**
- SQL file is ready for copy-paste execution
- SQL includes column creation, comments, indexes, and permissions
- SQL includes verification query
- Execution is idempotent (can be run multiple times safely)

### US-2: Alternative Direct PostgreSQL Execution
**As a** developer  
**I want to** execute the migration via direct PostgreSQL connection  
**So that** I can automate future migrations

**Acceptance Criteria:**
- Instructions for uncommenting `DATABASE_URL` in `.env`
- Script available for direct PostgreSQL execution
- Verification script confirms column exists

### US-3: Verification
**As a** developer  
**I want to** verify the column was created successfully  
**So that** I can confirm the fix worked

**Acceptance Criteria:**
- Verification script checks column existence
- Clear success/failure messages
- Script can be run multiple times

## Technical Requirements

### Database Schema Changes

```sql
ALTER TABLE property_listings 
ADD COLUMN IF NOT EXISTS hidden_images TEXT[] DEFAULT ARRAY[]::TEXT[];

COMMENT ON COLUMN property_listings.hidden_images IS '非表示にした画像のファイルIDリスト';

CREATE INDEX IF NOT EXISTS idx_property_listings_hidden_images 
ON property_listings USING GIN (hidden_images);
```

### Permissions

```sql
GRANT SELECT, UPDATE ON property_listings TO anon;
GRANT SELECT, UPDATE ON property_listings TO authenticated;
GRANT ALL ON property_listings TO service_role;
```

## Solution Approach

### Method 1: Supabase SQL Editor (Recommended)

**Steps:**
1. Access https://app.supabase.com
2. Select project `fzcuexscuwhoywcicdqq`
3. Open SQL Editor
4. Copy SQL from `backend/migrations/077_add_hidden_images_MANUAL_EXECUTION.sql`
5. Paste and run
6. Verify with `npx ts-node check-hidden-images-column-exists.ts`

**Advantages:**
- Most reliable
- No environment configuration needed
- Direct database access
- Immediate execution

### Method 2: Direct PostgreSQL Connection

**Steps:**
1. Uncomment `DATABASE_URL` in `.env`
2. Run `npx ts-node execute-077-direct-postgresql.ts`
3. Verify with `npx ts-node check-hidden-images-column-exists.ts`

**Advantages:**
- Automatable
- Good for future migrations
- Scriptable

## Files Created

### Documentation
- `backend/今すぐ実行_真の解決策.md` - Japanese step-by-step guide
- `backend/HIDDEN_IMAGES_REAL_SOLUTION.md` - English detailed explanation

### SQL Files
- `backend/migrations/077_add_hidden_images_MANUAL_EXECUTION.sql` - Complete SQL for manual execution

### Scripts
- `backend/execute-077-direct-postgresql.ts` - Direct PostgreSQL execution script
- `backend/check-hidden-images-column-exists.ts` - Verification script (already exists)

## Success Criteria

- [ ] `hidden_images` column exists in `property_listings` table
- [ ] Column type is `TEXT[]` (array of text)
- [ ] Default value is empty array `ARRAY[]::TEXT[]`
- [ ] GIN index exists on the column
- [ ] Permissions are correctly set
- [ ] Verification script returns success

## Lessons Learned

### What Went Wrong
- ❌ Assumed it was a schema cache issue
- ❌ Tried multiple cache clearing approaches
- ❌ Restarted Supabase unnecessarily
- ❌ Didn't verify the actual migration execution

### What Was Actually Wrong
- ✅ Migration script used REST API
- ✅ REST API cannot execute DDL statements
- ✅ Column was never created
- ✅ Not a cache issue at all

### Best Practices for Future Migrations

1. **DDL Migrations**: Always execute via SQL Editor or direct PostgreSQL connection
2. **Data Migrations**: Can use REST API
3. **Verification**: Always run verification scripts after migrations
4. **Don't Assume Cache Issues**: Verify actual database state first

## Related Issues

- Migration 077: Add hidden_images column
- Migration 078: Force add hidden_images (attempted workaround)
- Migration 076: Related migration

## References

- Supabase Project: https://app.supabase.com/project/fzcuexscuwhoywcicdqq
- Database: `fzcuexscuwhoywcicdqq`
- Table: `property_listings`
- Column: `hidden_images`
