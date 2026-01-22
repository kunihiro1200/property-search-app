# Tasks: Auto-Sync Diagnostic Tool

## Task 1: Create Diagnostic Script ✅

**Status:** COMPLETE

**Description:** Create the diagnostic script that checks auto-sync status

**Implementation:**
- Create `backend/diagnose-auto-sync-status.ts`
- Import Supabase client and dotenv
- Implement main diagnostic function

**Acceptance Criteria:**
- Script can be executed with `npx ts-node diagnose-auto-sync-status.ts`
- Script loads environment variables from .env file
- Script connects to Supabase successfully

---

## Task 2: Implement Sync Log Check ✅

**Status:** COMPLETE

**Description:** Check sync_logs table for recent sync activity

**Implementation:**
```typescript
const { data: syncLogs, error: syncLogsError } = await supabase
  .from('sync_logs')
  .select('*')
  .order('created_at', { ascending: false })
  .limit(10);

if (syncLogsError) {
  console.log('❌ sync_logsテーブルが存在しないか、アクセスできません');
} else {
  console.log(`✅ 最新の同期ログ ${syncLogs?.length || 0} 件を取得`);
  // Display latest sync details
}
```

**Acceptance Criteria:**
- Displays latest 10 sync logs
- Shows sync type, status, timestamp, and message
- Handles case when table doesn't exist

---

## Task 3: Implement Data Freshness Check ✅

**Status:** COMPLETE

**Description:** Check when property_listings and buyers were last updated

**Implementation:**
```typescript
const { data: latestProperty } = await supabase
  .from('property_listings')
  .select('property_number, updated_at')
  .order('updated_at', { ascending: false })
  .limit(1);

const lastUpdate = new Date(latestProperty[0].updated_at);
const now = new Date();
const hoursSinceUpdate = (now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60);

if (hoursSinceUpdate > 24) {
  console.log('⚠️ 24時間以上更新されていません');
}
```

**Acceptance Criteria:**
- Checks both property_listings and buyers tables
- Calculates hours since last update
- Warns if data is older than 24 hours

---

## Task 4: Implement Data Count Check ✅

**Status:** COMPLETE

**Description:** Count total records in property_listings and buyers tables

**Implementation:**
```typescript
const { count: propertyCount } = await supabase
  .from('property_listings')
  .select('*', { count: 'exact', head: true });

console.log(`✅ 物件総数: ${propertyCount} 件`);
```

**Acceptance Criteria:**
- Displays total count for property_listings
- Displays total count for buyers
- Handles errors gracefully

---

## Task 5: Implement Error Log Check ✅

**Status:** COMPLETE

**Description:** Check for recent sync errors

**Implementation:**
```typescript
const { data: errorLogs } = await supabase
  .from('sync_logs')
  .select('*')
  .eq('status', 'error')
  .order('created_at', { ascending: false })
  .limit(5);

if (errorLogs && errorLogs.length > 0) {
  console.log(`⚠️ 最近のエラー ${errorLogs.length} 件:`);
  errorLogs.forEach((log, index) => {
    console.log(`\n  ${index + 1}. ${log.sync_type}`);
    console.log(`     時刻: ${log.created_at}`);
    console.log(`     エラー: ${log.error_message || log.message}`);
  });
}
```

**Acceptance Criteria:**
- Displays latest 5 error logs
- Shows error type, timestamp, and message
- Shows success message if no errors

---

## Task 6: Implement Environment Variable Check ✅

**Status:** COMPLETE

**Description:** Verify required environment variables are set

**Implementation:**
```typescript
const requiredEnvVars = [
  'GOOGLE_SHEETS_SPREADSHEET_ID',
  'GOOGLE_SERVICE_ACCOUNT_EMAIL',
  'GOOGLE_PRIVATE_KEY'
];

requiredEnvVars.forEach(varName => {
  if (process.env[varName]) {
    console.log(`✅ ${varName}: 設定済み`);
  } else {
    console.log(`❌ ${varName}: 未設定`);
  }
});
```

**Acceptance Criteria:**
- Checks all required environment variables
- Shows clear status for each variable
- Doesn't display sensitive values

---

## Task 7: Implement Recommendations ✅

**Status:** COMPLETE

**Description:** Provide actionable recommendations based on findings

**Implementation:**
```typescript
console.log('\n推奨アクション:');
console.log('1. 同期ログが24時間以上更新されていない場合 → 自動同期が停止している可能性');
console.log('2. エラーログがある場合 → エラー内容を確認して修正');
console.log('3. 環境変数が未設定の場合 → .envファイルを確認');
console.log('4. 手動同期を試す: npm run sync-property-listings または npm run sync-buyers');
```

**Acceptance Criteria:**
- Displays clear, actionable recommendations
- Recommendations are context-aware based on findings
- Includes commands for manual sync

---

## Task 8: Add npm Script

**Status:** PENDING

**Description:** Add npm script for easy execution

**Implementation:**
Add to `backend/package.json`:
```json
{
  "scripts": {
    "diagnose-sync": "ts-node diagnose-auto-sync-status.ts"
  }
}
```

**Acceptance Criteria:**
- Can run with `npm run diagnose-sync`
- Script executes successfully
- Output is clear and readable

---

## Task 9: Create Quick Start Guide

**Status:** PENDING

**Description:** Create user-friendly guide for running diagnostics

**Implementation:**
Create `backend/AUTO_SYNC_DIAGNOSTIC_GUIDE.md` with:
- Purpose of the diagnostic tool
- How to run it
- How to interpret results
- Common issues and solutions

**Acceptance Criteria:**
- Guide is clear and concise
- Includes examples of output
- Provides troubleshooting steps

---

## Task 10: Test Diagnostic Script

**Status:** PENDING

**Description:** Test the diagnostic script in various scenarios

**Test Cases:**
1. Normal operation (all systems working)
2. No sync logs (sync never ran)
3. Stale data (>24 hours old)
4. Recent errors in sync_logs
5. Missing environment variables
6. Table doesn't exist

**Acceptance Criteria:**
- All test cases pass
- Error messages are clear
- Script doesn't crash on errors
