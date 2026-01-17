# Phase 3: Seller Deletion Sync - クイックスタートガイド

## 🚀 今すぐ実行: 実装状況の確認

Phase 3: Seller Deletion Sync が正しく動作するか確認します。

### ステップ1: deleted_at カラムの確認

```bash
cd backend
npx ts-node check-deleted-at-column.ts
```

**期待される出力:**
```
🔍 Checking deleted_at column...

1️⃣  Testing column accessibility...
✅ deleted_at column exists and is accessible

2️⃣  Counting deleted sellers...
📊 Deleted sellers: 0

3️⃣  Counting active sellers...
📊 Active sellers: 12345

4️⃣  Checking seller_deletion_audit table...
✅ seller_deletion_audit table exists
📊 Audit records: 0

5️⃣  Checking properties.deleted_at column...
✅ properties.deleted_at column exists

✅ All checks passed!
```

### ステップ2: 削除同期のテスト

```bash
cd backend
npx ts-node test-deletion-sync.ts
```

**期待される出力:**
```
🧪 Testing Phase 3: Seller Deletion Sync...

✅ EnhancedAutoSyncService initialized

1️⃣  Detecting deleted sellers...
🗑️  Detected 5 deleted sellers
   First 10: AA12345, AA12346, AA12347, AA12348, AA12349

⚠️  Deletion sync is available but not executed in this test.
   To execute deletion sync, run:
   ```typescript
   const result = await syncService.syncDeletedSellers(deletedSellers);
   console.log(result);
   ```

📋 What will happen when you execute deletion sync:
   1. Validate each seller (check for active contracts, recent activity)
   2. Create audit log in seller_deletion_audit table
   3. Set deleted_at timestamp on sellers table
   4. Cascade delete to properties table
   5. Return detailed results

🔧 Configuration:
   - DELETION_SYNC_ENABLED: true (default)
   - DELETION_VALIDATION_STRICT: true (default)
   - DELETION_RECENT_ACTIVITY_DAYS: 7 (default)
   - DELETION_MAX_PER_SYNC: 100 (default)

2️⃣  Checking active sellers...
📊 Active sellers in database: 12345

3️⃣  Checking already deleted sellers...
📊 Already deleted sellers: 0

4️⃣  Checking deletion audit logs...
📊 Audit records: 0

✅ Test completed successfully!
```

## ❌ エラーが発生した場合

### エラー1: "deleted_at column not found"

**原因:** Migration 051 が未実行

**解決策:**
```bash
cd backend
npx ts-node migrations/run-051-migration.ts
```

または Supabase ダッシュボードで直接実行:
```sql
-- backend/migrations/051_add_soft_delete_support.sql の内容をコピー&ペースト
```

### エラー2: "seller_deletion_audit table not found"

**原因:** Migration 051 が未実行

**解決策:** エラー1と同じ

### エラー3: "Column exists but not accessible via API"

**原因:** PostgREST キャッシュの問題

**解決策:**

**方法1: スキーマリロード (推奨)**
```sql
-- Supabase ダッシュボードで実行
NOTIFY pgrst, 'reload schema';
```

**方法2: プロジェクト再起動**
1. Supabase ダッシュボードを開く
2. Settings → General
3. "Pause project" をクリック
4. 数秒待つ
5. "Resume project" をクリック

## ✅ 削除同期を実行する

### 手動実行

```typescript
// backend/execute-deletion-sync.ts
import { getEnhancedAutoSyncService } from './src/services/EnhancedAutoSyncService';

async function executeDeletionSync() {
  const syncService = getEnhancedAutoSyncService();
  await syncService.initialize();
  
  // 削除された売主を検出
  const deletedSellers = await syncService.detectDeletedSellers();
  console.log(`🗑️  Detected ${deletedSellers.length} deleted sellers`);
  
  if (deletedSellers.length === 0) {
    console.log('✅ No deleted sellers to sync');
    return;
  }
  
  // 削除同期を実行
  const result = await syncService.syncDeletedSellers(deletedSellers);
  
  console.log('\n📊 Deletion Sync Results:');
  console.log(`   Total detected: ${result.totalDetected}`);
  console.log(`   Successfully deleted: ${result.successfullyDeleted}`);
  console.log(`   Failed to delete: ${result.failedToDelete}`);
  console.log(`   Requires manual review: ${result.requiresManualReview}`);
  console.log(`   Duration: ${(result.durationMs / 1000).toFixed(2)}s`);
  
  if (result.deletedSellerNumbers.length > 0) {
    console.log('\n✅ Deleted sellers:');
    console.log(`   ${result.deletedSellerNumbers.join(', ')}`);
  }
  
  if (result.manualReviewSellerNumbers.length > 0) {
    console.log('\n⚠️  Requires manual review:');
    console.log(`   ${result.manualReviewSellerNumbers.join(', ')}`);
  }
  
  if (result.errors.length > 0) {
    console.log('\n❌ Errors:');
    for (const error of result.errors) {
      console.log(`   - ${error.sellerNumber}: ${error.error}`);
    }
  }
}

executeDeletionSync().catch(console.error);
```

実行:
```bash
cd backend
npx ts-node execute-deletion-sync.ts
```

### 自動実行 (フル同期に含まれる)

削除同期は `runFullSync()` に含まれています:

```typescript
const syncService = getEnhancedAutoSyncService();
await syncService.initialize();

// フル同期を実行 (Phase 1-4.6 すべて含む)
const result = await syncService.runFullSync('manual');

console.log('Deletion sync results:', result.deletionResult);
```

## 🔧 設定のカスタマイズ

### 環境変数

`.env` ファイルに追加:

```bash
# 削除同期を有効化 (default: true)
DELETION_SYNC_ENABLED=true

# 厳格なバリデーション (default: true)
# false にすると、アクティブな契約や最近のアクティビティがあっても削除可能
DELETION_VALIDATION_STRICT=true

# 最近のアクティビティの日数 (default: 7)
# この日数以内に更新があった売主は削除されない (STRICT=true の場合)
DELETION_RECENT_ACTIVITY_DAYS=7

# アラート送信 (default: true)
DELETION_SEND_ALERTS=true

# 1回の同期で削除する最大数 (default: 100)
DELETION_MAX_PER_SYNC=100
```

### バリデーションルール

削除前に以下をチェックします:

1. **アクティブな契約**
   - ステータスが「専任契約中」「一般契約中」の場合は削除不可

2. **最近のアクティビティ**
   - `DELETION_RECENT_ACTIVITY_DAYS` 日以内に更新があった場合は要確認
   - 将来の `next_call_date` が設定されている場合は要確認

3. **アクティブな物件リスト**
   - `property_listings` テーブルに削除されていない物件がある場合は要確認

**STRICT=false の場合:**
- アクティブな契約のみチェック
- 最近のアクティビティや物件リストは警告のみ

## 🔄 削除された売主の復元

```typescript
import { getEnhancedAutoSyncService } from './src/services/EnhancedAutoSyncService';

async function recoverSeller() {
  const syncService = getEnhancedAutoSyncService();
  await syncService.initialize();
  
  const sellerNumber = 'AA12345';
  const recoveredBy = 'admin@example.com';
  
  const result = await syncService.recoverDeletedSeller(sellerNumber, recoveredBy);
  
  if (result.success) {
    console.log(`✅ ${sellerNumber} recovered successfully`);
    console.log(`   Recovered at: ${result.recoveredAt}`);
    console.log(`   Recovered by: ${result.recoveredBy}`);
    console.log(`   Properties restored: ${result.details?.propertiesRestored || 0}`);
  } else {
    console.error(`❌ Failed to recover ${sellerNumber}: ${result.error}`);
  }
}

recoverSeller().catch(console.error);
```

## 📊 監視とログ

### 削除監査ログの確認

```sql
-- Supabase ダッシュボードで実行

-- 最近削除された売主
SELECT 
  seller_number,
  deleted_at,
  deleted_by,
  reason,
  can_recover
FROM seller_deletion_audit
ORDER BY deleted_at DESC
LIMIT 10;

-- 復元可能な削除済み売主
SELECT 
  seller_number,
  deleted_at,
  reason
FROM seller_deletion_audit
WHERE can_recover = true
  AND recovered_at IS NULL
ORDER BY deleted_at DESC;

-- 復元された売主
SELECT 
  seller_number,
  deleted_at,
  recovered_at,
  recovered_by
FROM seller_deletion_audit
WHERE recovered_at IS NOT NULL
ORDER BY recovered_at DESC
LIMIT 10;
```

### 削除済み売主の確認

```sql
-- 削除済み売主の一覧
SELECT 
  seller_number,
  name,
  deleted_at
FROM sellers
WHERE deleted_at IS NOT NULL
ORDER BY deleted_at DESC
LIMIT 10;

-- 削除済み売主の数
SELECT COUNT(*) as deleted_count
FROM sellers
WHERE deleted_at IS NOT NULL;

-- アクティブな売主の数
SELECT COUNT(*) as active_count
FROM sellers
WHERE deleted_at IS NULL;
```

## 🎯 まとめ

Phase 3: Seller Deletion Sync は完全に実装済みです。

**実装済み機能:**
- ✅ `sellers.deleted_at` カラム
- ✅ `properties.deleted_at` カラム (カスケード削除)
- ✅ `seller_deletion_audit` テーブル (監査ログ)
- ✅ 削除検出アルゴリズム
- ✅ バリデーションロジック
- ✅ ソフトデリート実行
- ✅ 復元機能
- ✅ フル同期への統合

**次のステップ:**
1. 上記のステップ1とステップ2を実行して動作確認
2. エラーがあれば解決策を実行
3. 必要に応じて設定をカスタマイズ
4. 本番環境で削除同期を有効化

問題が発生した場合は、`PHASE_3_DELETION_SYNC_STATUS.md` を参照してください。
