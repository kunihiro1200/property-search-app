# Migration 023: Add exclusion_action Column

## Overview
This migration adds the `exclusion_action` column to the `sellers` table to store the exclusion action selected by users.

## Manual Migration Steps

### 1. Open Supabase SQL Editor
Go to: https://supabase.com/dashboard/project/fzcuexscuwhoywcicdqq/sql

### 2. Run the SQL
Copy and paste the following SQL into the editor and click "Run":

```sql
ALTER TABLE sellers 
ADD COLUMN exclusion_action VARCHAR(255);

COMMENT ON COLUMN sellers.exclusion_action IS '除外アクション（除外日に不通であれば除外、除外日に何もせず除外）';
```

### 3. Verify the Migration
Run the verification script:
```bash
npx ts-node migrations/verify-023-migration.ts
```

## Expected Result
- The `exclusion_action` column should be added to the `sellers` table
- The column should accept VARCHAR(255) values
- The column should be nullable

## Rollback
If you need to rollback this migration:
```sql
ALTER TABLE sellers DROP COLUMN exclusion_action;
```
