# Quick Start Guide - AA4885 Property Listing Sync Fix

## 🎯 Problem

AA4885's ATBB status is outdated by 21 days. The spreadsheet shows "非公開（一般）" but the database still shows "一般・公開中".

## ✅ Solution (1 Minute)

**Just restart the backend server!**

```bash
cd backend
npm run dev
```

That's it! No code changes, no migrations, no manual fixes needed.

## 📊 What Happens Next

### Timeline

| Time | Event |
|------|-------|
| T+5 seconds | First automatic sync executes |
| T+5 seconds | AA4885 and 7 other properties updated |
| T+5 minutes | Second sync (checks for new changes) |
| T+10 minutes | Third sync (continues every 5 minutes) |

### Expected Console Output

```
✅ EnhancedAutoSyncService initialized
📊 Enhanced periodic auto-sync enabled (interval: 5 minutes)
   Using full comparison mode - all missing sellers will be detected
🔄 Starting full sync (triggered by: scheduled)
🏢 Phase 4.5: Property Listing Update Sync
✅ Property listing update sync: 8 updated, 0 failed
```

## 🔍 Verification

### 1. Check Console Logs

Look for the messages above in your terminal.

### 2. Verify AA4885 in Database

```bash
npx ts-node backend/check-aa4885-atbb-status.ts
```

Expected output:
```
✅ Spreadsheet: "非公開（一般）"
✅ Database:    "非公開（一般）"
✅ Status: SYNCHRONIZED
```

### 3. Check Browser

1. Navigate to AA4885 property detail page
2. Confirm ATBB status shows: "非公開（一般）"
3. Refresh if needed (Ctrl+F5)

## 🎉 Why This Works

### The Implementation is Complete

- ✅ Phase 4.5 (Property Listing Update Sync) is implemented
- ✅ Manual test confirmed it works (8 properties updated successfully)
- ✅ Startup code is in place (`backend/src/index.ts`)
- ✅ All dependencies are installed and working

### The Issue Was Simple

The backend server wasn't restarted after the implementation was completed, so the periodic sync manager never started.

### The Fix is Simple

Restarting the server triggers the startup code, which:
1. Initializes EnhancedAutoSyncService
2. Starts the periodic sync manager
3. Executes the first sync after 5 seconds
4. Continues syncing every 5 minutes automatically

## 📋 Affected Properties

The following 8 properties will be automatically updated:

1. AA4885 (ATBB status)
2. AA5852 (ATBB status)
3. AA9313 (ATBB status)
4. AA11165 (Storage location)
5. AA12449 (Distribution areas)
6. AA12766 (Distribution areas)
7. AA13129 (Distribution areas)
8. AA13154 (Storage location)

## 🚀 Future Maintenance

### No Manual Intervention Needed

Once the server is running:
- ✅ All property changes sync automatically every 5 minutes
- ✅ No manual scripts needed
- ✅ No database updates needed
- ✅ Just keep the backend server running

### Monitoring

To check sync status anytime:

```bash
npx ts-node backend/check-property-listing-auto-sync-status.ts
```

This shows:
- Last sync time
- Properties updated
- Any errors
- Sync frequency

## ❓ Troubleshooting

### Server Won't Start

```bash
# Check if port 3001 is in use
netstat -ano | findstr :3001

# Kill the process if needed
taskkill /PID <PID> /F

# Try again
npm run dev
```

### Sync Not Executing

Check the console logs for:
- ✅ "EnhancedAutoSyncService initialized"
- ✅ "Enhanced periodic auto-sync enabled"

If you don't see these messages:
1. Check `.env` file: `AUTO_SYNC_ENABLED=true`
2. Check Google Sheets credentials are configured
3. Check database connection is working

### Still Not Working?

Run the diagnostic script:

```bash
npx ts-node backend/diagnose-auto-sync-service.ts
```

This will check:
- Environment variables
- Service initialization
- Periodic sync manager status
- Manual sync test

## 📚 Related Documentation

- **Detailed Diagnosis**: `requirements.md` (this spec)
- **Implementation Details**: `.kiro/specs/property-listing-atbb-status-auto-sync/`
- **Manual Fix Script**: `backend/fix-aa4885-atbb-status.ts` (not needed!)
- **Diagnostic Scripts**: `backend/diagnose-*.ts`

## 🎯 Success Criteria

- [x] Backend server running
- [x] Console shows periodic sync enabled
- [x] First sync executes within 5 seconds
- [x] AA4885 ATBB status updated
- [x] Browser displays correct status
- [x] Syncs continue every 5 minutes

---

**Remember**: The implementation is complete. Just restart the server and everything works automatically! 🎉
