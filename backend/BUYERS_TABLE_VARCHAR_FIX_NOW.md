# 🚨 Buyers Table VARCHAR(50) Fix - Execute Now

## Current Situation
- ✅ `buyers` table EXISTS in Supabase
- ❌ Has VARCHAR(50) columns (should be TEXT)
- ❌ 352 buyers failed to sync with "value too long" errors
- 📊 Missing: 356 buyers (8.6% of 4,137 total)

---

## 🎯 Solution: Run Migration 050

Migration 050 converts all VARCHAR(50) columns to TEXT, fixing the sync errors.

---

## 📋 Step-by-Step Instructions

### Step 1: Run Migration 050 in Supabase

**Option A: Supabase SQL Editor (RECOMMENDED)**

1. Open your Supabase project dashboard
2. Click **SQL Editor** in left sidebar
3. Click **New query**
4. Copy the entire contents of: `backend/migrations/050_fix_remaining_buyer_varchar_fields.sql`
5. Paste into SQL Editor
6. Click **Run**
7. Wait for success message ✅

**Option B: Command Line (if DATABASE_URL is configured)**

```bash
cd backend
npx ts-node migrations/run-050-direct.ts
```

---

### Step 2: Re-sync All Buyers

After Migration 050 completes successfully:

```bash
cd backend
npx ts-node sync-buyers.ts
```

**Expected output:**
```
=== 同期結果 ===
作成: 356件
更新: 3781件
失敗: 0件  ← Should be 0!
```

---

### Step 3: Verify Success

```bash
cd backend
npx ts-node check-buyer-count-comparison.ts
```

**Expected output:**
```
✅ Spreadsheet: 4137 buyers
✅ Database: 4137 buyers
📊 Difference: 0 buyers not synced
✅ Counts match!
```

---

## 🔍 What Migration 050 Does

Converts **130+ VARCHAR(50) columns** to TEXT:

### Key Fields Being Fixed:
- **Basic Info**: name, nickname, phone_number, email, line_id
- **Property**: property_address, property_number, building_name_price
- **URLs**: athome_url, google_map_url, pdf_url, image_url
- **Assignees**: initial_assignee, follow_up_assignee, property_assignee
- **Status**: distribution_type, inquiry_source, offer_status
- **Desired Conditions**: desired_area, desired_property_type, desired_timing
- **100+ other fields** (see migration file for complete list)

---

## ✅ Success Criteria

All must be true:
- ✅ Migration 050 executed without errors
- ✅ `sync-buyers.ts` shows "失敗: 0件"
- ✅ `check-buyer-count-comparison.ts` shows "Difference: 0"
- ✅ No VARCHAR(50) errors in logs

---

## 🚨 Troubleshooting

### Error: "Could not find the function public.exec_sql"
→ Use **Option A** (Supabase SQL Editor) instead

### Error: "permission denied"
→ Check `SUPABASE_SERVICE_KEY` in `.env` file

### Still have failed syncs after migration
1. Check error details in `sync-buyers.ts` output
2. Verify migration completed: `npx ts-node verify-buyers-schema.ts`
3. Check specific buyer: `npx ts-node check-buyer-6647.ts`

---

## 📚 Related Files

- `backend/migrations/050_fix_remaining_buyer_varchar_fields.sql` - The migration
- `backend/sync-buyers.ts` - Sync script
- `backend/check-buyer-count-comparison.ts` - Verification script
- `backend/BUYER_SYNC_FIX_GUIDE.md` - Detailed guide

---

## ⏱️ Estimated Time

- Migration 050: ~30 seconds
- Re-sync buyers: ~2-3 minutes
- Verification: ~10 seconds

**Total: ~4 minutes** ⚡

---

## 🎉 After Success

Once complete, you'll have:
- ✅ All 4,137 buyers synced to database
- ✅ No VARCHAR(50) length errors
- ✅ All text fields can store unlimited length
- ✅ Future syncs will work smoothly

---

**Ready to execute? Start with Step 1! 🚀**
