# Phase 3: Seller Deletion Sync - 実装状況確認

## 📋 概要

コンテキスト転送で指摘された問題:
> **Phase 3: Seller Deletion Sync** で使用されているが存在しないもの:
> 1. **`sellers.deleted_at` カラム** (Line 1...)

この問題について調査し、実装状況を確認しました。

## ✅ 実装済み確認

### 1. Migration 051: Soft Delete Support

**ファイル:** `backend/migrations/051_add_soft_delete_support.sql`

**実装内容:**
```sql
-- sellers テーブルに deleted_at カラムを追加
ALTER TABLE sellers 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

COMMENT ON COLUMN sellers.deleted_at IS 'Timestamp when the seller was soft-deleted from spreadsheet. NULL means active.';

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_sellers_deleted_at ON sellers(deleted_at);
CREATE INDEX IF NOT EXISTS idx_sellers_active ON sellers(id) WHERE deleted_at IS NULL;
```

**ステータス:** ✅ **実装済み**

### 2. EnhancedAutoSyncService.ts - Phase 3 実装

**ファイル:** `backend/src/services/EnhancedAutoSyncService.ts`

**実装済み機能:**

#### 2.1 削除された売主の検出
```typescript
async detectDeletedSellers(): Promise<string[]>
```
- スプレッドシートとDBを全件比較
- DBにあってスプレッドシートにない売主を検出
- `deleted_at IS NULL` で削除済みを除外

#### 2.2 削除前のバリデーション
```typescript
private async validateDeletion(sellerNumber: string): Promise<ValidationResult>
```
- アクティブな契約をチェック
- 最近のアクティビティをチェック
- アクティブな物件リストをチェック

#### 2.3 ソフトデリート実行
```typescript
private async executeSoftDelete(sellerNumber: string): Promise<DeletionResult>
```
- トランザクションで売主と関連物件を削除
- `seller_deletion_audit` テーブルに監査ログを記録
- `sellers.deleted_at` に削除日時を設定
- 関連する `properties.deleted_at` もカスケード更新

#### 2.4 削除同期の一括実行
```typescript
async syncDeletedSellers(sellerNumbers: string[]): Promise<DeletionSyncResult>
```
- 複数の売主を一括で削除同期
- バリデーション → ソフトデリート → 結果集計

#### 2.5 削除された売主の復元
```typescript
async recoverDeletedSeller(sellerNumber: string, recoveredBy: string): Promise<RecoveryResult>
```
- `deleted_at` を NULL に戻す
- 関連物件も復元
- 監査ログを更新

#### 2.6 フル同期への統合
```typescript
async runFullSync(triggeredBy: 'scheduled' | 'manual'): Promise<CompleteSyncResult>
```
- Phase 1: 追加同期
- Phase 2: 更新同期
- **Phase 3: 削除同期** ← ここで実行
- Phase 4: 作業タスク同期
- Phase 4.5: 物件リスト更新同期
- Phase 4.6: 新規物件追加同期

**ステータス:** ✅ **実装済み**

### 3. 削除同期の設定

**環境変数:**
```typescript
interface DeletionSyncConfig {
  enabled: boolean;                    // DELETION_SYNC_ENABLED (default: true)
  strictValidation: boolean;           // DELETION_VALIDATION_STRICT (default: true)
  recentActivityDays: number;          // DELETION_RECENT_ACTIVITY_DAYS (default: 7)
  sendAlerts: boolean;                 // DELETION_SEND_ALERTS (default: true)
  maxDeletionsPerSync: number;         // DELETION_MAX_PER_SYNC (default: 100)
}
```

**ステータス:** ✅ **実装済み**

### 4. 監査ログテーブル

**テーブル:** `seller_deletion_audit`

**カラム:**
- `id`: 監査ログID
- `seller_id`: 削除された売主ID
- `seller_number`: 売主番号
- `deleted_at`: 削除日時
- `deleted_by`: 削除実行者
- `reason`: 削除理由
- `seller_data`: 売主データのJSONバックアップ
- `can_recover`: 復元可能フラグ
- `recovered_at`: 復元日時
- `recovered_by`: 復元実行者

**ステータス:** ✅ **実装済み**

## 🔍 問題の原因

コンテキスト転送で指摘された「`sellers.deleted_at` カラムが存在しない」という問題は、以下のいずれかの可能性があります:

### 可能性1: Migration 051 が未実行

**確認方法:**
```sql
-- Supabase ダッシュボードで実行
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'sellers' 
AND column_name = 'deleted_at';
```

**対処法:**
```bash
# Migration 051 を実行
cd backend
npm run migration:051
```

### 可能性2: PostgREST キャッシュの問題

**症状:**
- カラムは存在するが、PostgREST API経由でアクセスできない
- Supabase ダッシュボードでは見えるが、コードからは見えない

**対処法:**
```sql
-- Supabase ダッシュボードで実行
NOTIFY pgrst, 'reload schema';
```

または Supabase プロジェクトを一時停止→再開

### 可能性3: 環境の不一致

**症状:**
- ローカル環境では動作するが、本番環境では動作しない
- または逆

**対処法:**
- 両環境でマイグレーション状態を確認
- 必要に応じて Migration 051 を再実行

## 📝 次のステップ

### ステップ1: 現在の状態を確認

```bash
# backend ディレクトリで実行
cd backend
npx ts-node check-deleted-at-column.ts
```

**確認スクリプト作成:**
```typescript
// backend/check-deleted-at-column.ts
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function checkDeletedAtColumn() {
  console.log('🔍 Checking deleted_at column...');
  
  // 1. カラムの存在確認
  const { data: columns, error: columnsError } = await supabase
    .from('sellers')
    .select('deleted_at')
    .limit(1);
  
  if (columnsError) {
    console.error('❌ Error accessing deleted_at column:', columnsError.message);
    console.log('\n💡 Solution: Run Migration 051');
    console.log('   cd backend && npm run migration:051');
    return;
  }
  
  console.log('✅ deleted_at column exists and is accessible');
  
  // 2. 削除済み売主の数を確認
  const { count: deletedCount, error: deletedError } = await supabase
    .from('sellers')
    .select('*', { count: 'exact', head: true })
    .not('deleted_at', 'is', null);
  
  if (!deletedError) {
    console.log(`📊 Deleted sellers: ${deletedCount || 0}`);
  }
  
  // 3. アクティブ売主の数を確認
  const { count: activeCount, error: activeError } = await supabase
    .from('sellers')
    .select('*', { count: 'exact', head: true })
    .is('deleted_at', null);
  
  if (!activeError) {
    console.log(`📊 Active sellers: ${activeCount || 0}`);
  }
  
  console.log('\n✅ All checks passed!');
}

checkDeletedAtColumn().catch(console.error);
```

### ステップ2: Migration 051 の実行確認

```bash
# Migration 051 が実行済みか確認
cd backend
npx ts-node migrations/verify-051-migration.ts
```

### ステップ3: 削除同期のテスト

```bash
# 削除同期をテスト実行
cd backend
npx ts-node test-deletion-sync.ts
```

**テストスクリプト作成:**
```typescript
// backend/test-deletion-sync.ts
import { getEnhancedAutoSyncService } from './src/services/EnhancedAutoSyncService';

async function testDeletionSync() {
  console.log('🧪 Testing deletion sync...');
  
  const syncService = getEnhancedAutoSyncService();
  await syncService.initialize();
  
  // 削除された売主を検出
  const deletedSellers = await syncService.detectDeletedSellers();
  console.log(`🗑️  Detected ${deletedSellers.length} deleted sellers`);
  
  if (deletedSellers.length > 0) {
    console.log(`   First few: ${deletedSellers.slice(0, 5).join(', ')}`);
    
    // 削除同期を実行（ドライラン）
    console.log('\n⚠️  To execute deletion sync, run:');
    console.log('   const result = await syncService.syncDeletedSellers(deletedSellers);');
  } else {
    console.log('✅ No deleted sellers to sync');
  }
}

testDeletionSync().catch(console.error);
```

## 🎯 結論

**Phase 3: Seller Deletion Sync は完全に実装済みです。**

問題が発生している場合は、以下のいずれかの原因が考えられます:

1. **Migration 051 が未実行** → 上記のステップ1で確認
2. **PostgREST キャッシュの問題** → スキーマリロードが必要
3. **環境の不一致** → 両環境でマイグレーション状態を確認

次のアクションとして、上記の「次のステップ」を実行して、現在の状態を確認してください。

## 📚 関連ファイル

- `backend/migrations/051_add_soft_delete_support.sql` - Migration定義
- `backend/src/services/EnhancedAutoSyncService.ts` - 削除同期実装
- `backend/src/types/deletion.ts` - 型定義
- `.kiro/specs/spreadsheet-deletion-sync/` - 削除同期の仕様書
