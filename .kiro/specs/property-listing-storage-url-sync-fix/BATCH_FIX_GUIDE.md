# Batch Fix Guide: Storage Location for ~50 Properties

## Overview

This guide explains how to fix missing `storage_location` values for approximately 50 properties (including AA11165) using the batch processing scripts.

## Problem

- ~50 properties have NULL or incorrect `storage_location` in the database
- The correct data exists in 業務依頼シート (Gyomu Irai Sheet) column CO
- Example affected properties: AA11165, AA13129, AA13154, etc.

## Solution

Use the existing batch processing scripts to:
1. Identify all mismatches between database and spreadsheet
2. Fix all mismatches in one operation
3. Verify the fix was successful

## Prerequisites

- Access to Supabase database
- Google Service Account credentials configured
- Node.js and TypeScript installed

## Step-by-Step Instructions

### Step 1: Diagnose (No Changes)

First, run the diagnostic script to see how many properties need fixing:

```bash
cd backend
npx ts-node find-and-fix-all-storage-location-mismatches.ts
```

**Expected Output:**
```
=== 全物件の格納先URL不一致検出・修正 ===

📋 業務依頼シートからデータを取得中...
取得行数: 319
物件数: 250

📊 データベースから全物件を取得中...
データベース物件数: 245

🔍 不一致を検出中...
不一致件数: 50

📋 不一致の詳細:

AA11165:
  スプレッドシート: https://drive.google.com/drive/folders/...
  データベース: (NULL)
  タイプ: missing_in_db

AA11166:
  スプレッドシート: https://drive.google.com/drive/folders/...
  データベース: (NULL)
  タイプ: missing_in_db

... 他48件

ℹ️ 診断モードで実行しました（修正は行いません）
修正を実行する場合: FIX=true npx ts-node find-and-fix-all-storage-location-mismatches.ts
```

### Step 2: Review the Mismatches

Review the output to confirm:
- The number of affected properties (~50)
- The properties are the ones you expect
- The spreadsheet values look correct (Google Drive URLs)

### Step 3: Execute Batch Fix

Once you've confirmed the diagnostic output, run the fix:

```bash
cd backend
FIX=true npx ts-node find-and-fix-all-storage-location-mismatches.ts
```

**Expected Output:**
```
=== 全物件の格納先URL不一致検出・修正 ===

📋 業務依頼シートからデータを取得中...
物件数: 250

📊 データベースから全物件を取得中...
データベース物件数: 245

🔍 不一致を検出中...
不一致件数: 50

🔧 一括修正を開始します...

✅ AA11165
✅ AA11166
✅ AA11167
... (continues for all 50 properties)

=== 修正結果サマリー ===
成功: 50件
失敗: 0件
合計: 50件
```

### Step 4: Verify the Fix

Run the diagnostic script again to confirm all mismatches are resolved:

```bash
cd backend
npx ts-node find-and-fix-all-storage-location-mismatches.ts
```

**Expected Output:**
```
不一致件数: 0
✅ 不一致はありません！
```

## Alternative: Fix Specific Properties

If you only want to fix specific properties instead of all mismatches:

```bash
cd backend

# Fix a single property
npx ts-node fix-storage-location-for-any-property.ts AA11165

# Fix multiple specific properties
npx ts-node fix-storage-location-for-any-property.ts AA11165 AA11166 AA11167
```

## How It Works

### Data Flow

```
業務依頼シート (Spreadsheet)
├─ Column A: Property Number (AA11165, AA11166, ...)
└─ Column CO (93): Storage Location URL

↓ Script reads all data

Compare with Database
├─ property_listings.property_number
└─ property_listings.storage_location

↓ Identify mismatches

Update Database
└─ Set storage_location = spreadsheet CO column value
```

### Search Algorithm

1. **Read Spreadsheet:** Fetch columns A (property number) and CO (storage URL) from 業務依頼シート
2. **Read Database:** Fetch all property_listings records
3. **Compare:** Find properties where database value ≠ spreadsheet value
4. **Update:** For each mismatch, update database with spreadsheet value

## Troubleshooting

### Error: Service Account Key Not Found

```bash
# Check environment variable
echo $GOOGLE_SERVICE_ACCOUNT_KEY_PATH

# Verify file exists
ls -la google-service-account.json
```

**Solution:** Ensure the Google Service Account JSON file is in the correct location and the environment variable is set.

### Error: Permission Denied

**Solution:** Verify that the Google Service Account has read access to the spreadsheet:
1. Open the spreadsheet in Google Sheets
2. Click "Share"
3. Add the service account email (found in the JSON file)
4. Grant "Viewer" permission

### Error: Property Not Found in Spreadsheet

**Solution:** The property may not exist in 業務依頼シート. Verify manually:
1. Open the spreadsheet
2. Search for the property number in column A
3. If not found, the property cannot be fixed using this script

### Some Properties Failed to Update

Check the error messages in the output. Common causes:
- Database connection issues
- Invalid property number format
- Database constraints violated

## Performance

- **Diagnostic:** ~30 seconds for 250 properties
- **Batch Fix:** ~1-2 minutes for 50 properties
- **Single Property Fix:** ~5 seconds per property

## Safety

- The script only updates `storage_location` field
- No data is deleted
- Original values are overwritten (not a problem since they're incorrect)
- Can be run multiple times safely (idempotent)

## Verification Queries

After running the fix, you can verify specific properties:

```sql
-- Check AA11165
SELECT property_number, storage_location 
FROM property_listings 
WHERE property_number = 'AA11165';

-- Check all recently updated properties
SELECT property_number, storage_location, updated_at
FROM property_listings 
WHERE updated_at > NOW() - INTERVAL '1 hour'
ORDER BY updated_at DESC;

-- Count properties with storage_location
SELECT 
  COUNT(*) as total,
  COUNT(storage_location) as with_storage,
  COUNT(*) - COUNT(storage_location) as without_storage
FROM property_listings;
```

## Next Steps

After fixing all properties:

1. **Monitor:** Check if new properties have the same issue
2. **Automate:** Consider updating PropertyListingSyncService to read from 業務依頼シート directly
3. **Schedule:** Set up periodic checks for mismatches

## Related Files

- `backend/find-and-fix-all-storage-location-mismatches.ts` - Main batch script
- `backend/fix-storage-location-for-any-property.ts` - Single property fix
- `backend/diagnose-storage-url-for-multiple-properties.ts` - Diagnostic script
- `backend/今すぐ実行_50件の格納先URL修正.md` - Japanese quick start guide
- `.kiro/specs/property-listing-storage-url-sync-fix/` - Full specification

## Summary

✅ **Batch processing scripts are ready to use**  
✅ **Can fix all ~50 properties in under 2 minutes**  
✅ **Safe to run multiple times**  
✅ **Detailed reporting and verification**  

The solution is complete and ready for execution!
