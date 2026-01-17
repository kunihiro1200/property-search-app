# Migration 080: Add Search Filter Indexes - Execution Guide

## Overview

This migration creates database indexes to optimize the public property search filters feature:
- **GIN trigram index** on `address` for fast location search
- **B-tree index** on `construction_year_month` for building age filtering
- **GIN trigram index** on `property_number` for property number search

## Prerequisites

✅ **Migration 079 must be completed first** (pg_trgm extension enabled)

## Quick Execution (Recommended)

### Option 1: Supabase Dashboard (Easiest)

1. Open Supabase Dashboard → SQL Editor
2. Copy and paste the following SQL:

```sql
-- GIN index for location (address) search
CREATE INDEX IF NOT EXISTS idx_property_listings_address_gin 
ON property_listings 
USING gin(address gin_trgm_ops);

-- B-tree index for construction year/month filtering
CREATE INDEX IF NOT EXISTS idx_property_listings_construction_year_month 
ON property_listings(construction_year_month);

-- GIN index for property number search
CREATE INDEX IF NOT EXISTS idx_property_listings_property_number_gin 
ON property_listings 
USING gin(property_number gin_trgm_ops);
```

3. Click "Run" button
4. Verify success message

### Option 2: TypeScript Runner Script

```bash
cd backend
npx ts-node migrations/run-080-migration.ts
```

## Verification

After running the migration, verify the indexes were created:

```sql
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'property_listings'
AND indexname LIKE 'idx_property_listings_%';
```

Expected output should include:
- `idx_property_listings_address_gin`
- `idx_property_listings_construction_year_month`
- `idx_property_listings_property_number_gin`

## Performance Impact

### Before Indexes
- Location search: Sequential scan (slow)
- Age filtering: Sequential scan (slow)
- Property number search: Sequential scan (slow)

### After Indexes
- Location search: GIN index scan (fast)
- Age filtering: Index scan (fast)
- Property number search: GIN index scan (fast)

### Expected Performance
- Response time: < 2 seconds for typical queries
- Handles 1000+ properties efficiently

## Testing

Test the indexes are being used:

```sql
-- Test location search uses GIN index
EXPLAIN ANALYZE
SELECT * FROM property_listings
WHERE address ILIKE '%大分市%';

-- Test age filter uses B-tree index
EXPLAIN ANALYZE
SELECT * FROM property_listings
WHERE construction_year_month >= '2020-01'
AND construction_year_month <= '2023-12';

-- Test property number search uses GIN index
EXPLAIN ANALYZE
SELECT * FROM property_listings
WHERE property_number ILIKE '%AA%';
```

Look for "Index Scan" or "Bitmap Index Scan" in the output (not "Seq Scan").

## Rollback

If you need to remove the indexes:

```sql
DROP INDEX IF EXISTS idx_property_listings_address_gin;
DROP INDEX IF EXISTS idx_property_listings_construction_year_month;
DROP INDEX IF EXISTS idx_property_listings_property_number_gin;
```

## Troubleshooting

### Error: "extension pg_trgm does not exist"
**Solution:** Run migration 079 first to enable the pg_trgm extension.

### Error: "relation property_listings does not exist"
**Solution:** Ensure the property_listings table exists. Check previous migrations.

### Indexes not being used in queries
**Solution:** 
1. Run `ANALYZE property_listings;` to update statistics
2. Check query patterns match index usage (ILIKE for text, range for dates)
3. Verify sufficient data exists (indexes may not be used for very small tables)

### Slow index creation
**Note:** Index creation may take time on large tables. This is normal.
- For 1000 properties: ~1-2 seconds
- For 10000 properties: ~5-10 seconds

## Next Steps

After successful migration:
1. ✅ Mark Task 2 as complete in tasks.md
2. ➡️ Proceed to Task 3: Extend PropertyListingService - Location Filter
3. 📝 Update TASK_2_STATUS.md with completion details

## Related Files

- Migration SQL: `backend/migrations/080_add_search_filter_indexes.sql`
- Runner script: `backend/migrations/run-080-migration.ts`
- Task list: `.kiro/specs/public-property-search-filters/tasks.md`
- Design doc: `.kiro/specs/public-property-search-filters/design.md`
