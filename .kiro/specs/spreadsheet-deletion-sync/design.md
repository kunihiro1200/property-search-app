# Design Document: Spreadsheet Deletion Sync

## Overview

スプレッドシートから削除された売主データをデータベースに自動的に反映する機能を実装します。安全性と可逆性を重視し、ソフトデリート方式を採用します。

## Architecture

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                  EnhancedAutoSyncService                     │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  1. detectMissingSellers()                           │  │
│  │     - Spreadsheet sellers vs DB sellers              │  │
│  │     - Returns: missing (to add)                      │  │
│  └──────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  2. detectDeletedSellers() [NEW]                     │  │
│  │     - DB sellers vs Spreadsheet sellers              │  │
│  │     - Returns: deleted (to remove)                   │  │
│  └──────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  3. syncMissingSellers()                             │  │
│  │     - Add missing sellers to DB                      │  │
│  └──────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  4. syncDeletedSellers() [NEW]                       │  │
│  │     - Soft delete sellers from DB                    │  │
│  │     - Validate before deletion                       │  │
│  │     - Log deletion operations                        │  │
│  └──────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  5. runFullSync()                                    │  │
│  │     - Execute: detect → add → delete                 │  │
│  │     - Transaction-based                              │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow

```
┌──────────────────┐
│  Spreadsheet     │
│  (Source)        │
└────────┬─────────┘
         │
         ▼
┌──────────────────────────────────────────┐
│  EnhancedAutoSyncService                 │
│  ┌────────────────────────────────────┐  │
│  │ 1. Fetch all spreadsheet sellers  │  │
│  │    Set<seller_number>             │  │
│  └────────────────────────────────────┘  │
│  ┌────────────────────────────────────┐  │
│  │ 2. Fetch all DB sellers           │  │
│  │    Set<seller_number>             │  │
│  │    (paginated, all records)       │  │
│  └────────────────────────────────────┘  │
│  ┌────────────────────────────────────┐  │
│  │ 3. Compare sets                   │  │
│  │    Missing = Sheet - DB           │  │
│  │    Deleted = DB - Sheet           │  │
│  └────────────────────────────────────┘  │
│  ┌────────────────────────────────────┐  │
│  │ 4. Validate deletions             │  │
│  │    - Check active contracts       │  │
│  │    - Verify seller format         │  │
│  │    - Flag for manual review       │  │
│  └────────────────────────────────────┘  │
│  ┌────────────────────────────────────┐  │
│  │ 5. Execute soft delete            │  │
│  │    UPDATE sellers                 │  │
│  │    SET deleted_at = NOW()         │  │
│  │    WHERE seller_number IN (...)   │  │
│  └────────────────────────────────────┘  │
│  ┌────────────────────────────────────┐  │
│  │ 6. Log operations                 │  │
│  │    INSERT INTO sync_logs          │  │
│  └────────────────────────────────────┘  │
└──────────────────────────────────────────┘
         │
         ▼
┌──────────────────┐
│  Database        │
│  (Target)        │
└──────────────────┘
```

## Database Schema Changes

### 1. Add `deleted_at` Column to `sellers` Table

```sql
-- Migration: Add soft delete support
ALTER TABLE sellers 
ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Create index for efficient queries
CREATE INDEX idx_sellers_deleted_at ON sellers(deleted_at);

-- Create index for active sellers (most common query)
CREATE INDEX idx_sellers_active ON sellers(seller_number) 
WHERE deleted_at IS NULL;
```

### 2. Update Sync Logs Schema

```sql
-- Add deletion tracking to sync_logs
ALTER TABLE sync_logs
ADD COLUMN deleted_sellers_count INTEGER DEFAULT 0,
ADD COLUMN deleted_seller_numbers TEXT[];
```

### 3. Create Deletion Audit Table (Optional)

```sql
-- Track deletion history for recovery
CREATE TABLE seller_deletion_audit (
  id SERIAL PRIMARY KEY,
  seller_id INTEGER NOT NULL,
  seller_number VARCHAR(20) NOT NULL,
  deleted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  deleted_by VARCHAR(50) DEFAULT 'auto_sync',
  reason TEXT DEFAULT 'deleted from spreadsheet',
  seller_data JSONB NOT NULL, -- Backup of seller data
  can_recover BOOLEAN DEFAULT TRUE,
  recovered_at TIMESTAMP WITH TIME ZONE DEFAULT NULL
);

CREATE INDEX idx_deletion_audit_seller_number 
ON seller_deletion_audit(seller_number);

CREATE INDEX idx_deletion_audit_deleted_at 
ON seller_deletion_audit(deleted_at);
```

## Implementation Details

### 1. Deletion Detection

```typescript
/**
 * DBにあってスプレッドシートにない売主番号を検出
 * 削除候補として返す
 */
async detectDeletedSellers(): Promise<string[]> {
  if (!this.isInitialized || !this.sheetsClient) {
    await this.initialize();
  }

  console.log('🔍 Detecting deleted sellers...');

  // スプレッドシートから全売主番号を取得
  const allRows = await this.sheetsClient!.readAll();
  const sheetSellerNumbers = new Set<string>();
  
  for (const row of allRows) {
    const sellerNumber = row['売主番号'];
    if (sellerNumber && typeof sellerNumber === 'string' && sellerNumber.startsWith('AA')) {
      sheetSellerNumbers.add(sellerNumber);
    }
  }
  console.log(`📊 Spreadsheet sellers: ${sheetSellerNumbers.size}`);

  // DBから全売主番号を取得（削除済みを除く）
  const dbSellerNumbers = await this.getAllActiveDbSellerNumbers();
  console.log(`📊 Database active sellers: ${dbSellerNumbers.size}`);

  // 差分を計算（DBにあってスプレッドシートにないもの）
  const deletedSellers: string[] = [];
  for (const sellerNumber of dbSellerNumbers) {
    if (!sheetSellerNumbers.has(sellerNumber)) {
      deletedSellers.push(sellerNumber);
    }
  }

  // 売主番号でソート
  deletedSellers.sort((a, b) => {
    const numA = parseInt(a.replace('AA', ''), 10);
    const numB = parseInt(b.replace('AA', ''), 10);
    return numA - numB;
  });

  console.log(`🗑️ Deleted sellers: ${deletedSellers.length}`);
  if (deletedSellers.length > 0) {
    console.log(`   First few: ${deletedSellers.slice(0, 5).join(', ')}${deletedSellers.length > 5 ? '...' : ''}`);
  }

  return deletedSellers;
}

/**
 * DBから全アクティブ売主番号を取得（ページネーション対応）
 */
private async getAllActiveDbSellerNumbers(): Promise<Set<string>> {
  const allSellerNumbers = new Set<string>();
  const pageSize = 1000;
  let offset = 0;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await this.supabase
      .from('sellers')
      .select('seller_number')
      .is('deleted_at', null) // 削除済みを除外
      .range(offset, offset + pageSize - 1);

    if (error) {
      throw new Error(`Failed to fetch DB sellers: ${error.message}`);
    }

    if (!data || data.length === 0) {
      hasMore = false;
    } else {
      for (const seller of data) {
        if (seller.seller_number) {
          allSellerNumbers.add(seller.seller_number);
        }
      }
      offset += pageSize;
      
      if (data.length < pageSize) {
        hasMore = false;
      }
    }
  }

  return allSellerNumbers;
}
```

### 2. Deletion Validation

```typescript
/**
 * 削除前のバリデーション
 */
async validateDeletion(sellerNumber: string): Promise<ValidationResult> {
  // 1. 売主データを取得
  const { data: seller, error } = await this.supabase
    .from('sellers')
    .select('*, properties(*)')
    .eq('seller_number', sellerNumber)
    .is('deleted_at', null)
    .single();

  if (error || !seller) {
    return {
      valid: false,
      reason: 'Seller not found in database',
      requiresManualReview: false,
    };
  }

  // 2. アクティブな契約をチェック
  const hasActiveContract = seller.status === '専任契約中' || 
                           seller.status === '一般契約中';
  
  if (hasActiveContract) {
    return {
      valid: false,
      reason: 'Seller has active contract',
      requiresManualReview: true,
      seller,
    };
  }

  // 3. 最近の活動をチェック（過去7日以内）
  const recentActivityThreshold = new Date();
  recentActivityThreshold.setDate(recentActivityThreshold.getDate() - 7);
  
  const { data: recentActivities } = await this.supabase
    .from('activity_logs')
    .select('id')
    .eq('seller_id', seller.id)
    .gte('created_at', recentActivityThreshold.toISOString())
    .limit(1);

  if (recentActivities && recentActivities.length > 0) {
    return {
      valid: false,
      reason: 'Seller has recent activity (within 7 days)',
      requiresManualReview: true,
      seller,
    };
  }

  // 4. 物件情報をチェック
  if (seller.properties && seller.properties.length > 0) {
    const hasListedProperty = seller.properties.some(
      (p: any) => p.status === '公開中' || p.status === '商談中'
    );
    
    if (hasListedProperty) {
      return {
        valid: false,
        reason: 'Seller has active property listings',
        requiresManualReview: true,
        seller,
      };
    }
  }

  return {
    valid: true,
    reason: 'Validation passed',
    requiresManualReview: false,
    seller,
  };
}

interface ValidationResult {
  valid: boolean;
  reason: string;
  requiresManualReview: boolean;
  seller?: any;
}
```

### 3. Soft Delete Execution

```typescript
/**
 * 削除された売主を同期（ソフトデリート）
 */
async syncDeletedSellers(sellerNumbers: string[]): Promise<DeletionSyncResult> {
  const startTime = new Date();
  const errors: SyncError[] = [];
  const manualReviewRequired: string[] = [];
  let deletedCount = 0;

  if (!this.isInitialized) {
    await this.initialize();
  }

  console.log(`🗑️ Processing ${sellerNumbers.length} deleted sellers...`);

  for (const sellerNumber of sellerNumbers) {
    try {
      // バリデーション
      const validation = await this.validateDeletion(sellerNumber);
      
      if (!validation.valid) {
        if (validation.requiresManualReview) {
          manualReviewRequired.push(sellerNumber);
          console.log(`⚠️ ${sellerNumber}: Requires manual review - ${validation.reason}`);
        } else {
          console.log(`ℹ️ ${sellerNumber}: Skipped - ${validation.reason}`);
        }
        continue;
      }

      // ソフトデリート実行
      await this.executeSoftDelete(sellerNumber, validation.seller);
      deletedCount++;
      console.log(`✅ ${sellerNumber}: Soft deleted`);
      
    } catch (error: any) {
      errors.push({
        sellerNumber,
        message: error.message,
        timestamp: new Date(),
      });
      console.error(`❌ ${sellerNumber}: ${error.message}`);
    }
  }

  const endTime = new Date();
  const result: DeletionSyncResult = {
    success: errors.length === 0 && manualReviewRequired.length === 0,
    startTime,
    endTime,
    deletedCount,
    skippedCount: sellerNumbers.length - deletedCount - errors.length,
    manualReviewRequired,
    errors,
  };

  console.log(`🎉 Deletion sync completed: ${deletedCount} deleted, ${manualReviewRequired.length} require review, ${errors.length} errors`);
  return result;
}

/**
 * ソフトデリートを実行
 */
private async executeSoftDelete(sellerNumber: string, seller: any): Promise<void> {
  const now = new Date().toISOString();

  // トランザクション開始
  try {
    // 1. 売主データをバックアップ（audit table）
    await this.supabase
      .from('seller_deletion_audit')
      .insert({
        seller_id: seller.id,
        seller_number: sellerNumber,
        deleted_at: now,
        deleted_by: 'auto_sync',
        reason: 'deleted from spreadsheet',
        seller_data: seller,
        can_recover: true,
      });

    // 2. 売主をソフトデリート
    const { error: deleteError } = await this.supabase
      .from('sellers')
      .update({ deleted_at: now })
      .eq('seller_number', sellerNumber)
      .is('deleted_at', null);

    if (deleteError) {
      throw new Error(`Failed to soft delete: ${deleteError.message}`);
    }

    // 3. 関連データもソフトデリート（cascade）
    // Properties
    await this.supabase
      .from('properties')
      .update({ deleted_at: now })
      .eq('seller_id', seller.id)
      .is('deleted_at', null);

    // Activity logs は保持（履歴として）
    // Appointments は保持（履歴として）
    
  } catch (error: any) {
    // ロールバック処理
    console.error(`Rollback deletion for ${sellerNumber}:`, error.message);
    throw error;
  }
}

interface DeletionSyncResult {
  success: boolean;
  startTime: Date;
  endTime: Date;
  deletedCount: number;
  skippedCount: number;
  manualReviewRequired: string[];
  errors: SyncError[];
}
```

### 4. Integration with Existing Sync Flow

```typescript
/**
 * フル同期を実行（追加 + 削除）
 */
async runFullSync(triggeredBy: 'scheduled' | 'manual' = 'scheduled'): Promise<CompleteSyncResult> {
  const startTime = new Date();
  
  try {
    // 1. 不足売主を検出・同期（既存機能）
    const missingSellers = await this.detectMissingSellers();
    let addResult: SyncResult | null = null;
    
    if (missingSellers.length > 0) {
      addResult = await this.syncMissingSellers(missingSellers);
    }

    // 2. 削除売主を検出・同期（新機能）
    let deleteResult: DeletionSyncResult | null = null;
    
    if (this.isDeletionSyncEnabled()) {
      const deletedSellers = await this.detectDeletedSellers();
      
      if (deletedSellers.length > 0) {
        deleteResult = await this.syncDeletedSellers(deletedSellers);
      }
    }

    const endTime = new Date();
    
    return {
      success: (!addResult || addResult.success) && (!deleteResult || deleteResult.success),
      startTime,
      endTime,
      addResult,
      deleteResult,
      triggeredBy,
    };
    
  } catch (error: any) {
    console.error('❌ Full sync failed:', error.message);
    return {
      success: false,
      startTime,
      endTime: new Date(),
      addResult: null,
      deleteResult: null,
      triggeredBy,
      error: error.message,
    };
  }
}

/**
 * 削除同期が有効かどうか
 */
private isDeletionSyncEnabled(): boolean {
  const envValue = process.env.DELETION_SYNC_ENABLED;
  // デフォルトで有効、明示的に'false'の場合のみ無効
  return envValue !== 'false';
}

interface CompleteSyncResult {
  success: boolean;
  startTime: Date;
  endTime: Date;
  addResult: SyncResult | null;
  deleteResult: DeletionSyncResult | null;
  triggeredBy: 'scheduled' | 'manual';
  error?: string;
}
```

## Configuration

### Environment Variables

```bash
# 削除同期の有効/無効
DELETION_SYNC_ENABLED=true  # デフォルト: true

# 削除前のバリデーション設定
DELETION_VALIDATION_STRICT=true  # デフォルト: true
DELETION_RECENT_ACTIVITY_DAYS=7  # デフォルト: 7日

# 削除同期のログレベル
DELETION_SYNC_LOG_LEVEL=info  # debug, info, warn, error
```

## Query Optimization

### Default Query Behavior

すべてのクエリでデフォルトで削除済みレコードを除外：

```typescript
// Before (全レコード取得)
const { data } = await supabase
  .from('sellers')
  .select('*');

// After (アクティブレコードのみ)
const { data } = await supabase
  .from('sellers')
  .select('*')
  .is('deleted_at', null);
```

### Service Layer Update

既存のサービスクラスに削除フィルタを追加：

```typescript
// SellerService.ts
async getAllSellers(includeDeleted: boolean = false) {
  let query = this.supabase
    .from('sellers')
    .select('*');
  
  if (!includeDeleted) {
    query = query.is('deleted_at', null);
  }
  
  return query;
}
```

## Recovery Mechanism

### Manual Recovery API

```typescript
/**
 * 削除された売主を復元
 */
async recoverDeletedSeller(sellerNumber: string): Promise<RecoveryResult> {
  try {
    // 1. 削除監査ログを確認
    const { data: auditLog } = await this.supabase
      .from('seller_deletion_audit')
      .select('*')
      .eq('seller_number', sellerNumber)
      .is('recovered_at', null)
      .order('deleted_at', { ascending: false })
      .limit(1)
      .single();

    if (!auditLog || !auditLog.can_recover) {
      return {
        success: false,
        message: 'Cannot recover: audit log not found or recovery not allowed',
      };
    }

    // 2. 売主を復元
    const { error: recoverError } = await this.supabase
      .from('sellers')
      .update({ deleted_at: null })
      .eq('seller_number', sellerNumber);

    if (recoverError) {
      throw new Error(`Failed to recover seller: ${recoverError.message}`);
    }

    // 3. 関連データを復元
    await this.supabase
      .from('properties')
      .update({ deleted_at: null })
      .eq('seller_id', auditLog.seller_id);

    // 4. 監査ログを更新
    await this.supabase
      .from('seller_deletion_audit')
      .update({ recovered_at: new Date().toISOString() })
      .eq('id', auditLog.id);

    return {
      success: true,
      message: `Seller ${sellerNumber} recovered successfully`,
    };
    
  } catch (error: any) {
    return {
      success: false,
      message: error.message,
    };
  }
}

interface RecoveryResult {
  success: boolean;
  message: string;
}
```

## Monitoring and Alerts

### Sync Log Enhancement

```typescript
// SyncLogService.ts に追加
async logDeletionSync(result: DeletionSyncResult): Promise<void> {
  await this.supabase
    .from('sync_logs')
    .insert({
      sync_type: 'deletion',
      started_at: result.startTime.toISOString(),
      completed_at: result.endTime.toISOString(),
      status: result.success ? 'success' : 'partial_failure',
      deleted_sellers_count: result.deletedCount,
      deleted_seller_numbers: result.manualReviewRequired,
      errors: result.errors,
      duration_ms: result.endTime.getTime() - result.startTime.getTime(),
    });

  // アラート送信（手動レビューが必要な場合）
  if (result.manualReviewRequired.length > 0) {
    await this.sendManualReviewAlert(result.manualReviewRequired);
  }
}
```

## Testing Strategy

### Unit Tests

1. `detectDeletedSellers()` - 削除検出ロジック
2. `validateDeletion()` - バリデーションルール
3. `executeSoftDelete()` - ソフトデリート実行
4. `recoverDeletedSeller()` - 復元機能

### Integration Tests

1. フル同期フロー（追加 + 削除）
2. トランザクションロールバック
3. ページネーション処理

### Manual Testing

1. スプレッドシートから売主を削除
2. 自動同期が実行されることを確認
3. DBで`deleted_at`が設定されることを確認
4. 復元機能のテスト

## Rollout Plan

### Phase 1: Database Schema (Week 1)
- Add `deleted_at` column
- Create indexes
- Create audit table

### Phase 2: Core Implementation (Week 2)
- Implement detection logic
- Implement validation
- Implement soft delete

### Phase 3: Integration (Week 3)
- Integrate with EnhancedAutoSyncService
- Update existing queries
- Add recovery API

### Phase 4: Testing & Monitoring (Week 4)
- Unit tests
- Integration tests
- Manual testing
- Deploy to production with monitoring

## Risk Mitigation

### Risk 1: Accidental Mass Deletion
**Mitigation**: 
- Validation before deletion
- Manual review for active contracts
- Soft delete (reversible)
- Audit logging

### Risk 2: Performance Impact
**Mitigation**:
- Indexed queries
- Pagination for large datasets
- Async processing

### Risk 3: Data Loss
**Mitigation**:
- Soft delete (not hard delete)
- Audit table backup
- Recovery mechanism
- Regular backups

## Success Metrics

1. **Sync Accuracy**: 100% consistency between spreadsheet and database
2. **Deletion Latency**: < 5 minutes from spreadsheet deletion to DB sync
3. **False Positives**: < 1% (sellers flagged for manual review incorrectly)
4. **Recovery Success Rate**: 100% for recoverable deletions
5. **Performance**: < 30 seconds for full sync with 10,000 sellers
