# Migration 022: Add Site Column to Sellers Table

## Overview

This migration adds a `site` column to the `sellers` table to track the website or channel from which seller inquiries originated. This enables marketing effectiveness tracking and customer acquisition source analysis.

## Changes

- **Table**: `sellers`
- **New Column**: `site` (VARCHAR(100), nullable)
- **New Index**: `idx_sellers_site` (for analytics queries)

## Prerequisites

- Access to Supabase Dashboard
- Admin privileges on the database

## Migration Steps

### Option 1: Manual Execution via Supabase Dashboard (Recommended)

1. **Open Supabase Dashboard**
   - Navigate to: https://app.supabase.com
   - Select your project

2. **Open SQL Editor**
   - Click on "SQL Editor" in the left sidebar
   - Click "New query"

3. **Execute Migration SQL**
   - Copy and paste the following SQL:

```sql
-- Migration 022: Add site column to sellers table
-- This migration adds a site field to track the website/channel from which seller inquiries originated

-- Add site column to sellers table
ALTER TABLE sellers ADD COLUMN site VARCHAR(100) NULL;

-- Add index on site column for analytics queries
CREATE INDEX idx_sellers_site ON sellers(site);

-- Add comment to document the column
COMMENT ON COLUMN sellers.site IS 'Website or channel from which the seller inquiry originated (e.g., ウビ, HP, at-home)';
```

4. **Run the Query**
   - Click the "Run" button (or press Ctrl+Enter / Cmd+Enter)
   - Wait for confirmation message

5. **Verify Success**
   - You should see a success message
   - Run verification query (see below)

### Option 2: Using Migration Script

```bash
cd backend
npx ts-node migrations/run-022-migration.ts
```

Follow the on-screen instructions.

## Verification

After running the migration, verify it was successful:

### Via Supabase Dashboard

Run this query in SQL Editor:

```sql
-- Check if site column exists
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'sellers' AND column_name = 'site';

-- Check if index exists
SELECT indexname
FROM pg_indexes
WHERE tablename = 'sellers' AND indexname = 'idx_sellers_site';
```

Expected results:
- Column `site` should exist with type `character varying` and `is_nullable = YES`
- Index `idx_sellers_site` should exist

### Via Migration Script

```bash
cd backend
npx ts-node migrations/run-022-migration.ts --verify
```

## Rollback

If you need to rollback this migration:

```sql
-- Remove index
DROP INDEX IF EXISTS idx_sellers_site;

-- Remove column
ALTER TABLE sellers DROP COLUMN IF EXISTS site;
```

## Valid Site Values

The application will validate site values against this predefined list:

- ウビ
- HおYすaL
- エ近所
- チP紹
- リ買
- HP
- 知合
- at-home
- の掲載を見て
- 2件目以降査定

## Impact

- **Existing Data**: No impact - existing seller records will have `site = NULL`
- **Application**: Backend and frontend code will be updated to handle the new field
- **Performance**: Minimal - index added for efficient queries
- **Downtime**: None - migration is non-breaking

## Next Steps

After successful migration:

1. Update backend types and services (Task 2-3)
2. Update frontend types and UI (Task 5-10)
3. Test the feature in Call Mode Page

## Troubleshooting

### Error: "column already exists"

The migration has already been applied. Run verification to confirm.

### Error: "permission denied"

Ensure you're using an account with admin privileges or the service role key.

### Error: "relation does not exist"

The sellers table doesn't exist. Run earlier migrations first.

## Support

For issues or questions, refer to:
- Supabase Documentation: https://supabase.com/docs
- Project README: ../README.md
