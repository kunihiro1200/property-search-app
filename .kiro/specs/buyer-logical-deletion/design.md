# Design Document

## Overview

買主リストの論理削除機能は、スプレッドシートから削除された買主をデータベースでも論理削除（`deleted_at`フィールドを設定）する機能です。この設計は、既に実装されている売主リストの論理削除機能をベースとし、買主リスト向けにカスタマイズします。

論理削除を使用することで、以下のメリットがあります：
- 誤削除時の復元が可能
- 削除履歴の監査証跡を保持
- データの完全性を維持
- 将来的な分析やレポートに活用可能

## Architecture

### システム構成

```
┌─────────────────────────────────────────────────────────────┐
│                    Google Spreadsheet                        │
│                    (買主リスト)                              │
│                                                              │
│  - 買主番号                                                  │
│  - 氏名・会社名                                              │
│  - 削除フラグ (新規追加)                                     │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   │ 5分ごとに自動同期
                   │
                   ▼
┌─────────────────────────────────────────────────────────────┐
│          EnhancedAutoSyncService                             │
│          (自動同期サービス)                                  │
│                                                              │
│  Phase 1: 買主リスト同期                                     │
│  Phase 2: 削除同期 (新規追加)                                │
│    - detectDeletedBuyers()                                   │
│    - syncDeletedBuyers()                                     │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────────┐
│              Supabase PostgreSQL                             │
│                                                              │
│  buyers テーブル                                             │
│    - buyer_number (主キー)                                   │
│    - deleted_at (新規追加)                                   │
│    - その他のフィールド                                      │
│                                                              │
│  buyer_deletion_audit テーブル (新規追加)                    │
│    - id                                                      │
│    - buyer_number                                            │
│    - deleted_at                                              │
│    - deleted_by                                              │
│    - reason                                                  │
│    - buyer_data (JSONB)                                      │
│    - can_recover                                             │
│    - recovered_at                                            │
│    - recovered_by                                            │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────────┐
│                  Backend API                                 │
│                                                              │
│  GET /api/buyers?includeDeleted=true                         │
│  DELETE /api/buyers/:id                                      │
│  POST /api/buyers/:id/restore                                │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────────┐
│                  Frontend                                    │
│                                                              │
│  BuyerListPage                                               │
│    - 削除済みを表示チェックボックス                          │
│    - 削除済みバッジ表示                                      │
│                                                              │
│  BuyerDetailPage                                             │
│    - 削除済みバッジ表示                                      │
│    - 復元ボタン                                              │
└─────────────────────────────────────────────────────────────┘
```

### データフロー

1. **削除検出フロー**
   ```
   スプレッドシート → EnhancedAutoSyncService.detectDeletedBuyers()
   → DBとスプレッドシートを比較 → 削除された買主リストを返す
   ```

2. **削除同期フロー**
   ```
   削除された買主リスト → EnhancedAutoSyncService.syncDeletedBuyers()
   → バリデーション → ソフトデリート実行 → 監査ログ記録
   ```

3. **復元フロー**
   ```
   復元リクエスト → EnhancedAutoSyncService.recoverDeletedBuyer()
   → 監査ログ確認 → deleted_atをNULLに設定 → 監査ログ更新
   ```

## Components and Interfaces

### 1. データベーススキーマ

#### buyers テーブル (既存テーブルに追加)

```sql
ALTER TABLE buyers
ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

CREATE INDEX idx_buyers_deleted_at ON buyers(deleted_at);
```

#### buyer_deletion_audit テーブル (新規作成)

```sql
CREATE TABLE buyer_deletion_audit (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  buyer_id UUID NOT NULL,
  buyer_number TEXT NOT NULL,
  deleted_at TIMESTAMP WITH TIME ZONE NOT NULL,
  deleted_by TEXT NOT NULL,
  reason TEXT,
  buyer_data JSONB NOT NULL,
  can_recover BOOLEAN DEFAULT TRUE,
  recovered_at TIMESTAMP WITH TIME ZONE,
  recovered_by TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_buyer_deletion_audit_buyer_number ON buyer_deletion_audit(buyer_number);
CREATE INDEX idx_buyer_deletion_audit_deleted_at ON buyer_deletion_audit(deleted_at);
CREATE INDEX idx_buyer_deletion_audit_recovered_at ON buyer_deletion_audit(recovered_at);
```

### 2. EnhancedAutoSyncService の拡張

#### 新規メソッド

```typescript
/**
 * DBにあってスプレッドシートにない買主番号を検出（削除された買主）
 */
async detectDeletedBuyers(): Promise<string[]>

/**
 * 削除前のバリデーション
 */
private async validateBuyerDeletion(buyerNumber: string): Promise<ValidationResult>

/**
 * ソフトデリートを実行
 */
private async executeBuyerSoftDelete(buyerNumber: string): Promise<DeletionResult>

/**
 * 削除された買主を一括同期
 */
async syncDeletedBuyers(buyerNumbers: string[]): Promise<DeletionSyncResult>

/**
 * 削除された買主を復元
 */
async recoverDeletedBuyer(buyerNumber: string, recoveredBy: string): Promise<RecoveryResult>

/**
 * DBから全アクティブ買主番号を取得（削除済みを除外）
 */
private async getAllActiveBuyerNumbers(): Promise<Set<string>>
```

### 3. BuyerService の拡張

#### 既存メソッドの修正

```typescript
/**
 * 買主リストを取得（削除済みを除外）
 */
async getAll(options: BuyerQueryOptions = {}): Promise<PaginatedResult<any>> {
  let query = this.supabase
    .from('buyers')
    .select('*', { count: 'exact' })
    .is('deleted_at', null); // 削除済みを除外
  
  // ... 既存のフィルタリング処理
}

/**
 * 買主番号で買主を取得（削除済みを除外）
 */
async getByBuyerNumber(buyerNumber: string, includeDeleted: boolean = false): Promise<any | null> {
  let query = this.supabase
    .from('buyers')
    .select('*')
    .eq('buyer_number', buyerNumber);
  
  if (!includeDeleted) {
    query = query.is('deleted_at', null);
  }
  
  const { data, error } = await query.single();
  // ... エラーハンドリング
}
```

### 4. API エンドポイント

#### GET /api/buyers

```typescript
// クエリパラメータ: includeDeleted=true
router.get('/', async (req: Request, res: Response) => {
  const { includeDeleted } = req.query;
  
  const options = {
    // ... 既存のオプション
    includeDeleted: includeDeleted === 'true'
  };
  
  const result = await buyerService.getAll(options);
  res.json(result);
});
```

#### DELETE /api/buyers/:id

```typescript
// 論理削除を実行
router.delete('/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = (req as any).employee?.id || 'manual';
  
  const result = await enhancedAutoSyncService.executeBuyerSoftDelete(id);
  
  if (result.success) {
    res.json({ success: true, deletedAt: result.deletedAt });
  } else {
    res.status(500).json({ error: result.error });
  }
});
```

#### POST /api/buyers/:id/restore

```typescript
// 削除された買主を復元
router.post('/:id/restore', async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = (req as any).employee?.id || 'manual';
  
  const result = await enhancedAutoSyncService.recoverDeletedBuyer(id, userId);
  
  if (result.success) {
    res.json({ success: true, recoveredAt: result.recoveredAt });
  } else {
    res.status(500).json({ error: result.error });
  }
});
```

### 5. フロントエンド UI

#### BuyerListPage の拡張

```typescript
// 削除済みを表示するチェックボックス
const [showDeleted, setShowDeleted] = useState(false);

// API呼び出し時にincludeDeletedパラメータを追加
const fetchBuyers = async () => {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
    includeDeleted: String(showDeleted),
    // ... その他のパラメータ
  });
  
  const response = await fetch(`/api/buyers?${params}`);
  const data = await response.json();
  setBuyers(data.data);
};

// 削除済みバッジの表示
{buyer.deleted_at && (
  <Badge variant="destructive">削除済み</Badge>
)}
```

#### BuyerDetailPage の拡張

```typescript
// 削除済みバッジと復元ボタン
{buyer.deleted_at && (
  <div className="flex items-center gap-2">
    <Badge variant="destructive">削除済み</Badge>
    <Button onClick={handleRestore}>復元</Button>
  </div>
)}

// 復元処理
const handleRestore = async () => {
  const response = await fetch(`/api/buyers/${buyerNumber}/restore`, {
    method: 'POST',
  });
  
  if (response.ok) {
    toast.success('買主を復元しました');
    // ページをリロード
    window.location.reload();
  } else {
    toast.error('復元に失敗しました');
  }
};
```

## Data Models

### ValidationResult

```typescript
interface ValidationResult {
  canDelete: boolean;
  reason?: string;
  requiresManualReview: boolean;
  details?: {
    hasActiveInquiries?: boolean;
    hasRecentActivity?: boolean;
    lastActivityDate?: Date;
  };
}
```

### DeletionResult

```typescript
interface DeletionResult {
  buyerNumber: string;
  success: boolean;
  error?: string;
  auditId?: string;
  deletedAt?: Date;
}
```

### DeletionSyncResult

```typescript
interface DeletionSyncResult {
  totalDetected: number;
  successfullyDeleted: number;
  failedToDelete: number;
  requiresManualReview: number;
  deletedBuyerNumbers: string[];
  manualReviewBuyerNumbers: string[];
  errors: Array<{ buyerNumber: string; error: string }>;
  startedAt: Date;
  completedAt: Date;
  durationMs: number;
}
```

### RecoveryResult

```typescript
interface RecoveryResult {
  success: boolean;
  buyerNumber: string;
  error?: string;
  recoveredAt?: Date;
  recoveredBy?: string;
  details?: {
    buyerRestored: boolean;
    auditRecordUpdated: boolean;
  };
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: 論理削除の一貫性

*For any* buyer that is marked as deleted, the `deleted_at` field should be set to a non-NULL timestamp, and all buyer data should remain in the database.

**Validates: Requirements 1.1, 1.2**

### Property 2: 削除済み買主の除外

*For any* API request to fetch buyers without the `includeDeleted` parameter, the returned list should not contain any buyers where `deleted_at` is not NULL.

**Validates: Requirements 3.1, 3.2, 3.3**

### Property 3: 復元の完全性

*For any* deleted buyer that is restored, the `deleted_at` field should be set to NULL, and the buyer should immediately appear in the active buyer list.

**Validates: Requirements 5.1, 5.2, 5.4**

### Property 4: 監査ログの完全性

*For any* buyer that is deleted, a corresponding audit record should be created in the `buyer_deletion_audit` table with all buyer data preserved in JSONB format.

**Validates: Requirements 1.2**

### Property 5: スプレッドシート同期の一貫性

*For any* buyer in the spreadsheet with deletion flag set to TRUE, the corresponding buyer in the database should have `deleted_at` set to a non-NULL timestamp after sync.

**Validates: Requirements 2.2**

### Property 6: スプレッドシート復元の一貫性

*For any* buyer in the spreadsheet with deletion flag set to FALSE or empty, the corresponding buyer in the database should have `deleted_at` set to NULL after sync.

**Validates: Requirements 2.3, 5.3**

### Property 7: 削除検出の正確性

*For any* buyer that exists in the database but not in the spreadsheet, the `detectDeletedBuyers()` method should include that buyer number in the returned list.

**Validates: Requirements 2.1**

### Property 8: バリデーションの一貫性

*For any* buyer with active inquiries or recent activity, the validation should return `canDelete: false` and `requiresManualReview: true`.

**Validates: Requirements 2.2 (implicit validation requirement)**

## Error Handling

### 1. 削除バリデーションエラー

**シナリオ**: アクティブな問い合わせがある買主を削除しようとした場合

**処理**:
- `ValidationResult.canDelete = false`
- `ValidationResult.requiresManualReview = true`
- 削除を実行せず、手動レビューが必要な買主リストに追加

### 2. 削除実行エラー

**シナリオ**: データベース更新中にエラーが発生した場合

**処理**:
- トランザクションをロールバック
- エラーメッセージをログに記録
- `DeletionResult.success = false`
- `DeletionResult.error` にエラーメッセージを設定

### 3. 監査ログ作成エラー

**シナリオ**: 監査ログの作成に失敗した場合

**処理**:
- 削除処理を中止
- エラーメッセージをログに記録
- `DeletionResult.success = false`
- `DeletionResult.error = "Audit creation failed"`

### 4. 復元エラー

**シナリオ**: 監査ログが見つからない、または復元が許可されていない場合

**処理**:
- `RecoveryResult.success = false`
- `RecoveryResult.error` に理由を設定
- ユーザーにエラーメッセージを表示

### 5. スプレッドシート同期エラー

**シナリオ**: スプレッドシートの読み取りに失敗した場合

**処理**:
- エラーをログに記録
- 同期処理を中止
- 次回の自動同期で再試行

## Testing Strategy

### Unit Tests

#### BuyerService

- `getAll()` が削除済み買主を除外することを確認
- `getByBuyerNumber()` が `includeDeleted=false` の場合に削除済み買主を返さないことを確認
- `getByBuyerNumber()` が `includeDeleted=true` の場合に削除済み買主を返すことを確認

#### EnhancedAutoSyncService

- `detectDeletedBuyers()` がDBにあってスプレッドシートにない買主を正しく検出することを確認
- `validateBuyerDeletion()` がアクティブな問い合わせがある買主を検出することを確認
- `executeBuyerSoftDelete()` が `deleted_at` を設定し、監査ログを作成することを確認
- `recoverDeletedBuyer()` が `deleted_at` を NULL に設定し、監査ログを更新することを確認

### Property-Based Tests

#### Property 1: 論理削除の一貫性

```typescript
// For any buyer, after deletion, deleted_at should be non-NULL and data should remain
test('Property 1: Logical deletion consistency', async () => {
  // Generate random buyer data
  const buyer = generateRandomBuyer();
  
  // Delete the buyer
  await enhancedAutoSyncService.executeBuyerSoftDelete(buyer.buyer_number);
  
  // Verify deleted_at is set
  const deletedBuyer = await buyerService.getByBuyerNumber(buyer.buyer_number, true);
  expect(deletedBuyer.deleted_at).not.toBeNull();
  
  // Verify all data is preserved
  expect(deletedBuyer.name).toBe(buyer.name);
  expect(deletedBuyer.phone).toBe(buyer.phone);
});
```

#### Property 2: 削除済み買主の除外

```typescript
// For any API request without includeDeleted, deleted buyers should not be returned
test('Property 2: Deleted buyers exclusion', async () => {
  // Generate random buyers (some deleted, some active)
  const buyers = generateRandomBuyers(100);
  const deletedBuyers = buyers.slice(0, 20);
  
  // Delete some buyers
  for (const buyer of deletedBuyers) {
    await enhancedAutoSyncService.executeBuyerSoftDelete(buyer.buyer_number);
  }
  
  // Fetch all buyers without includeDeleted
  const result = await buyerService.getAll({ includeDeleted: false });
  
  // Verify no deleted buyers are returned
  for (const buyer of result.data) {
    expect(buyer.deleted_at).toBeNull();
  }
});
```

#### Property 3: 復元の完全性

```typescript
// For any deleted buyer, after restoration, deleted_at should be NULL
test('Property 3: Restoration completeness', async () => {
  // Generate random buyer
  const buyer = generateRandomBuyer();
  
  // Delete the buyer
  await enhancedAutoSyncService.executeBuyerSoftDelete(buyer.buyer_number);
  
  // Restore the buyer
  await enhancedAutoSyncService.recoverDeletedBuyer(buyer.buyer_number, 'test');
  
  // Verify deleted_at is NULL
  const restoredBuyer = await buyerService.getByBuyerNumber(buyer.buyer_number);
  expect(restoredBuyer.deleted_at).toBeNull();
  
  // Verify buyer appears in active list
  const result = await buyerService.getAll({ includeDeleted: false });
  const found = result.data.find(b => b.buyer_number === buyer.buyer_number);
  expect(found).toBeDefined();
});
```

#### Property 4: 監査ログの完全性

```typescript
// For any deleted buyer, an audit record should be created
test('Property 4: Audit log completeness', async () => {
  // Generate random buyer
  const buyer = generateRandomBuyer();
  
  // Delete the buyer
  const result = await enhancedAutoSyncService.executeBuyerSoftDelete(buyer.buyer_number);
  
  // Verify audit record was created
  expect(result.auditId).toBeDefined();
  
  // Fetch audit record
  const { data: auditLog } = await supabase
    .from('buyer_deletion_audit')
    .select('*')
    .eq('id', result.auditId)
    .single();
  
  // Verify audit log contains buyer data
  expect(auditLog.buyer_number).toBe(buyer.buyer_number);
  expect(auditLog.buyer_data).toBeDefined();
  expect(auditLog.buyer_data.name).toBe(buyer.name);
});
```

#### Property 5: スプレッドシート同期の一貫性

```typescript
// For any buyer with deletion flag TRUE in spreadsheet, deleted_at should be set after sync
test('Property 5: Spreadsheet sync consistency (deletion)', async () => {
  // Generate random buyers in spreadsheet with deletion flag
  const buyers = generateRandomBuyersInSpreadsheet(50);
  const deletedBuyers = buyers.filter(b => b.deletion_flag === true);
  
  // Run sync
  await enhancedAutoSyncService.syncDeletedBuyers(deletedBuyers.map(b => b.buyer_number));
  
  // Verify all buyers with deletion flag have deleted_at set
  for (const buyer of deletedBuyers) {
    const dbBuyer = await buyerService.getByBuyerNumber(buyer.buyer_number, true);
    expect(dbBuyer.deleted_at).not.toBeNull();
  }
});
```

#### Property 6: スプレッドシート復元の一貫性

```typescript
// For any buyer with deletion flag FALSE in spreadsheet, deleted_at should be NULL after sync
test('Property 6: Spreadsheet sync consistency (restoration)', async () => {
  // Generate random buyers in spreadsheet with deletion flag FALSE
  const buyers = generateRandomBuyersInSpreadsheet(50);
  const restoredBuyers = buyers.filter(b => b.deletion_flag === false);
  
  // First, delete these buyers
  for (const buyer of restoredBuyers) {
    await enhancedAutoSyncService.executeBuyerSoftDelete(buyer.buyer_number);
  }
  
  // Run sync (should restore them)
  await enhancedAutoSyncService.syncDeletedBuyers(restoredBuyers.map(b => b.buyer_number));
  
  // Verify all buyers with deletion flag FALSE have deleted_at NULL
  for (const buyer of restoredBuyers) {
    const dbBuyer = await buyerService.getByBuyerNumber(buyer.buyer_number);
    expect(dbBuyer.deleted_at).toBeNull();
  }
});
```

### Integration Tests

- スプレッドシートから削除された買主が自動同期で論理削除されることを確認
- 削除された買主が買主一覧に表示されないことを確認
- 削除された買主の詳細ページにアクセスすると404エラーが返されることを確認
- 管理者が「削除済みを表示」オプションを有効にすると削除された買主が表示されることを確認
- 削除された買主を復元すると、買主一覧に再表示されることを確認

### End-to-End Tests

1. スプレッドシートで買主を削除
2. 5分待機（自動同期）
3. 買主一覧ページで削除された買主が表示されないことを確認
4. 「削除済みを表示」チェックボックスを有効化
5. 削除された買主が表示されることを確認
6. 削除された買主の詳細ページを開く
7. 「復元」ボタンをクリック
8. 買主一覧ページで復元された買主が表示されることを確認
