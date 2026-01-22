# Migration 081 Diagnostic & Resolution

## Overview

This spec documents the diagnostic process and resolution strategy for Migration 081, which creates the `properties` and `valuations` tables for Phase 2 of the seller list management system.

## Problem Statement

After running Migration 081, the verification script reports that required columns are missing from the `properties` and `valuations` tables, even though the migration SQL appears to create them correctly.

## Root Cause Analysis

There are two possible scenarios:

### Scenario 1: Columns Were Not Created
- The migration SQL did not execute successfully
- Some columns were skipped due to errors
- The transaction was rolled back

### Scenario 2: PostgREST Cache Issue
- Columns exist in PostgreSQL but are not visible via REST API
- PostgREST schema cache is stale
- The verification script uses REST API which doesn't see the new columns

## Diagnostic Process

### Step 1: Direct PostgreSQL Verification

Execute the following SQL directly in Supabase SQL Editor to check the actual database state:

```sql
-- Check properties table columns
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'properties' 
ORDER BY ordinal_position;

-- Check valuations table columns
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'valuations' 
ORDER BY ordinal_position;
```

**Expected Results:**
- `properties` should have: construction_year, property_address, current_status, updated_at, created_by, updated_by, version
- `valuations` should have: property_id, valuation_type, valuation_amount_1, valuation_date, created_by

### Step 2: Resolution Based on Findings

#### If Columns Don't Exist → Run補完 Script
Execute `081_補完_add_missing_columns.sql` via Supabase Dashboard SQL Editor

#### If Columns Exist → Reload PostgREST Cache
Use one of these methods:
1. **Pause/Resume Project** (most reliable)
2. **NOTIFY command**: `NOTIFY pgrst, 'reload schema';`
3. **Restart PostgREST** via Supabase Dashboard

### Step 3: Verification

Run the verification script:
```bash
npx ts-node backend/migrations/verify-081-migration.ts
```

## Solution Components

### 1. Diagnostic Guide
- **File**: `backend/migrations/今すぐ実行_081補完_完全診断.md`
- **Purpose**: Step-by-step diagnostic instructions in Japanese
- **Audience**: User executing the migration

### 2.補完 (補完) Script
- **File**: `backend/migrations/081_補完_add_missing_columns.sql`
- **Purpose**: Add any missing columns with idempotent checks
- **Features**:
  - Uses `DO` blocks with `IF NOT EXISTS` checks
  - Safe to run multiple times
  - Adds all required columns for both tables
  - Creates indexes and triggers
  - Provides detailed NOTICE messages

### 3. Verification Script
- **File**: `backend/migrations/verify-081-migration.ts`
- **Purpose**: Programmatically verify migration success
- **Checks**:
  - Table existence
  - Required columns presence
  - Data types correctness

## User Acceptance Criteria

1. ✅ User can diagnose the issue by running SQL queries in Supabase Dashboard
2. ✅ User receives clear instructions on which resolution path to take
3. ✅ 補完 script is idempotent and safe to run multiple times
4. ✅ PostgREST cache reload instructions are provided
5. ✅ Verification script confirms successful resolution
6. ✅ All documentation is in Japanese for user accessibility

## Technical Details

### Properties Table Required Columns
- `construction_year` (INTEGER)
- `property_address` (TEXT NOT NULL)
- `property_address_ieul_apartment` (TEXT)
- `current_status` (VARCHAR(20) with CHECK constraint)
- `fixed_asset_tax_road_price` (DECIMAL(15, 2))
- `updated_at` (TIMESTAMP WITH TIME ZONE)
- `created_by` (UUID REFERENCES employees)
- `updated_by` (UUID REFERENCES employees)
- `version` (INTEGER DEFAULT 1)

### Valuations Table Required Columns
- `property_id` (UUID NOT NULL REFERENCES properties)
- `valuation_type` (VARCHAR(20) with CHECK constraint)
- `valuation_amount_1` (BIGINT NOT NULL)
- `valuation_amount_2` (BIGINT NOT NULL)
- `valuation_amount_3` (BIGINT NOT NULL)
- `calculation_method` (TEXT)
- `calculation_parameters` (JSONB)
- `valuation_report_url` (TEXT)
- `valuation_date` (TIMESTAMP WITH TIME ZONE)
- `created_by` (UUID REFERENCES employees)
- `notes` (TEXT)
- `created_at` (TIMESTAMP WITH TIME ZONE)

## Next Steps

1. User executes Step 1 diagnostic SQL queries
2. User reports results (columns exist or don't exist)
3. Based on results:
   - **Columns missing**: Execute 補完 script
   - **Columns exist**: Reload PostgREST cache
4. Run verification script to confirm resolution
5. Proceed with Phase 2 implementation

## References

- Original Migration: `backend/migrations/081_create_properties_and_valuations.sql`
- 補完 Script: `backend/migrations/081_補完_add_missing_columns.sql`
- Diagnostic Guide: `backend/migrations/今すぐ実行_081補完_完全診断.md`
- Verification Script: `backend/migrations/verify-081-migration.ts`
