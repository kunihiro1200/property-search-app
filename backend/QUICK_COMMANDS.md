# Quick Commands Reference

## 🔍 Check Current Status

```bash
cd backend
npx ts-node verify-buyers-last-synced-direct.ts
```

**Expected output if working:**
```
✅ SUCCESS - Column is accessible!
✅ All checks passed!
```

**Expected output if NOT working:**
```
❌ FAILED - Column does not exist or is not accessible
Error: column buyers.last_synced_at does not exist
```

---

## 🔄 Monitor Cache Refresh (Automatic)

```bash
cd backend
npx ts-node monitor-cache-refresh.ts
```

This will:
- Check every 30 seconds
- Run for up to 15 minutes
- Notify you when cache refreshes
- Press Ctrl+C to stop

---

## 🚀 After Cache Refresh

Once the cache is refreshed, proceed with:

```bash
# 1. Verify column is accessible
npx ts-node verify-buyers-last-synced-direct.ts

# 2. Run buyer sync
npx ts-node sync-buyers.ts

# 3. Start backend server
npm run dev
```

---

## 📚 Documentation

| Language | File |
|----------|------|
| 日本語 | `スキーマキャッシュ更新_今すぐ実行.md` |
| 日本語 | `今すぐ実行_最新版.md` |
| English | `SUPABASE_CACHE_REFRESH_SOLUTIONS.md` |
| Index | `SCHEMA_CACHE_FIX_INDEX.md` |

---

## 🎯 Quick Decision Tree

```
Is the column accessible?
│
├─ YES → Proceed with buyer sync
│
└─ NO → Choose one:
    │
    ├─ Option A: Restart Supabase project (3-5 min)
    │   └─ Dashboard → Settings → Pause → Resume
    │
    └─ Option B: Run monitoring script (5-15 min)
        └─ npx ts-node monitor-cache-refresh.ts
```

---

## 🔧 Troubleshooting Commands

```bash
# Check if buyers table exists
npx ts-node check-buyers-table-exists.ts

# Check buyers table structure
npx ts-node check-buyers-table-structure.ts

# Check all varchar constraints
psql -f check-all-varchar-constraints.sql
```

---

## 📞 Support

If nothing works after 15 minutes:
- Project ID: `fzcuexscuwhoywcicdqq`
- Error Code: PGRST205
- Support: https://supabase.com/dashboard/support

---

**Last Updated:** 2025-12-27
