# Design Document

## Overview

買主同期システムにおいて、PostgRESTのスキーマキャッシュ問題により`last_synced_at`と`updated_at`カラムが認識されない問題が発生しています。Supabaseプロジェクトの再起動が繰り返し失敗しているため、これらのカラムに依存しない全件同期方式を実装します。

現在の`BuyerSyncService`は既に全件同期を行っていますが、以下の改善を行います:
- パフォーマンスの最適化（バッチサイズ調整、進捗レポート）
- エラーハンドリングの強化
- 同期統計の詳細化
- 買主6648の特定検証

## Architecture

```
┌─────────────────┐
│  Google Sheets  │
│  (買主リスト)    │
└────────┬────────┘
         │ fetch all
         ↓
┌─────────────────────────┐
│  BuyerSyncService       │
│  - fetchAllBuyers()     │
│  - processBatch()       │
│  - validateBuyer()      │
│  - reportProgress()     │
└────────┬────────────────┘
         │ upsert
         ↓
┌─────────────────────────┐
│  Supabase Database      │
│  - buyers table         │
│  - sync_logs table      │
└─────────────────────────┘
```

## Components and Interfaces

### BuyerSyncService (Enhanced)

既存の`BuyerSyncService`を拡張します:

```typescript
export interface SyncResult {
  created: number;
  updated: number;
  failed: number;
  skipped: number;
  errors: SyncError[];
  duration: number;
  totalProcessed: number;
  successRate: number;
}

export interface SyncError {
  row: number;
  buyerNumber: string | null;
  message: string;
  timestamp: string;
}

export interface SyncProgress {
  current: number;
  total: number;
  percentage: number;
  estimatedTimeRemaining: number;
}

export class BuyerSyncService {
  // 既存のメソッド
  async syncAll(): Promise<SyncResult>;
  
  // 新規メソッド
  async syncAllWithProgress(
    progressCallback?: (progress: SyncProgress) => void
  ): Promise<SyncResult>;
  
  async verifyBuyer(buyerNumber: string): Promise<BuyerVerificationResult>;
  
  async getSyncStatistics(): Promise<SyncStatistics>;
  
  private reportProgress(current: number, total: number, startTime: number): void;
  
  private calculateSuccessRate(result: SyncResult): number;
}
```

### SyncLogger

同期ログを記録するサービス:

```typescript
export interface SyncLog {
  id: string;
  sync_started_at: string;
  sync_completed_at: string | null;
  total_buyers: number;
  created_count: number;
  updated_count: number;
  failed_count: number;
  skipped_count: number;
  success_rate: number;
  duration_ms: number;
  errors: SyncError[];
}

export class SyncLogger {
  async logSyncStart(totalBuyers: number): Promise<string>;
  
  async logSyncComplete(
    syncId: string,
    result: SyncResult
  ): Promise<void>;
  
  async getRecentSyncs(limit: number): Promise<SyncLog[]>;
  
  async getSyncById(syncId: string): Promise<SyncLog | null>;
}
```

### BuyerVerificationService

買主データの検証サービス:

```typescript
export interface BuyerVerificationResult {
  buyerNumber: string;
  existsInDatabase: boolean;
  existsInSpreadsheet: boolean;
  dataMatches: boolean;
  mismatches: FieldMismatch[];
  lastSyncedAt: string | null;
}

export interface FieldMismatch {
  field: string;
  databaseValue: any;
  spreadsheetValue: any;
}

export class BuyerVerificationService {
  async verifyBuyer(buyerNumber: string): Promise<BuyerVerificationResult>;
  
  async verifyAllBuyers(): Promise<{
    total: number;
    matched: number;
    mismatched: number;
    missingInDb: number;
    missingInSheet: number;
  }>;
  
  private compareFields(
    dbBuyer: any,
    sheetBuyer: any
  ): FieldMismatch[];
}
```

## Data Models

### buyers table (既存)

```sql
CREATE TABLE buyers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  buyer_number TEXT UNIQUE NOT NULL,
  -- ... 他のフィールド ...
  last_synced_at TIMESTAMPTZ,  -- 使用されるが、フィルタリングには使わない
  updated_at TIMESTAMPTZ,       -- 使用されるが、フィルタリングには使わない
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### sync_logs table (新規)

```sql
CREATE TABLE sync_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sync_started_at TIMESTAMPTZ NOT NULL,
  sync_completed_at TIMESTAMPTZ,
  total_buyers INTEGER NOT NULL,
  created_count INTEGER DEFAULT 0,
  updated_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,
  skipped_count INTEGER DEFAULT 0,
  success_rate DECIMAL(5,2),
  duration_ms INTEGER,
  errors JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_sync_logs_started_at ON sync_logs(sync_started_at DESC);
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: 全件同期の完全性

*For any* sync operation, the number of buyers processed should equal the total number of buyers in the spreadsheet (excluding empty rows).

**Validates: Requirements 1.1, 1.5**

### Property 2: Upsertの冪等性

*For any* buyer with a given buyer_number, running sync multiple times should result in the same final state in the database.

**Validates: Requirements 3.1, 3.2, 3.3**

### Property 3: created_atの不変性

*For any* existing buyer, updating through sync should preserve the original created_at timestamp.

**Validates: Requirements 3.3**

### Property 4: エラー分離

*For any* buyer that fails to sync, the failure should not prevent other buyers from being synced successfully.

**Validates: Requirements 4.2, 4.3**

### Property 5: 同期統計の正確性

*For any* sync operation, the sum of created, updated, failed, and skipped counts should equal the total number of buyers processed.

**Validates: Requirements 5.1, 5.2**

### Property 6: 買主番号の一意性

*For any* two buyers in the database, they should have different buyer_numbers.

**Validates: Requirements 3.1**

### Property 7: 成功率の計算

*For any* sync result, the success rate should equal (created + updated) / (created + updated + failed) * 100.

**Validates: Requirements 5.3**

### Property 8: 買主6648の同期

*For any* sync operation that includes buyer 6648 in the spreadsheet, buyer 6648 should exist in the database after sync completes.

**Validates: Requirements 6.1, 6.2**

## Error Handling

### エラーカテゴリ

1. **Network Errors**: Google Sheets API接続エラー
   - リトライ: 3回、指数バックオフ
   - 失敗時: 同期を中止、アラート送信

2. **Database Errors**: Supabase接続エラー
   - リトライ: 3回、指数バックオフ
   - 失敗時: 同期を中止、アラート送信

3. **Data Validation Errors**: 個別買主のデータエラー
   - リトライ: なし
   - 失敗時: エラーログに記録、次の買主に進む

4. **Schema Errors**: データベーススキーマ不整合
   - リトライ: なし
   - 失敗時: 同期を中止、アラート送信

### エラーログ形式

```typescript
{
  row: 1234,
  buyerNumber: "6648",
  message: "Database error: ...",
  timestamp: "2025-12-29T10:30:00Z",
  errorType: "database_error"
}
```

## Testing Strategy

### Unit Tests

1. **BuyerSyncService.processBatch()**
   - 正常なバッチ処理
   - 空のバッチ
   - 一部エラーを含むバッチ
   - buyer_numberが空の行

2. **BuyerSyncService.calculateSuccessRate()**
   - 100%成功
   - 0%成功
   - 部分的成功

3. **BuyerVerificationService.compareFields()**
   - 完全一致
   - 部分不一致
   - 型の違い

### Property-Based Tests

各correctness propertyに対して、最低100回の反復でテストを実行します:

1. **Property 1: 全件同期の完全性**
   ```typescript
   // Feature: buyer-sync-postgrest-cache-workaround, Property 1: 全件同期の完全性
   fc.assert(
     fc.asyncProperty(
       fc.array(fc.record({ buyer_number: fc.string() })),
       async (buyers) => {
         const result = await syncService.syncAll();
         expect(result.totalProcessed).toBe(buyers.length);
       }
     ),
     { numRuns: 100 }
   );
   ```

2. **Property 2: Upsertの冪等性**
   ```typescript
   // Feature: buyer-sync-postgrest-cache-workaround, Property 2: Upsertの冪等性
   fc.assert(
     fc.asyncProperty(
       fc.record({ buyer_number: fc.string(), name: fc.string() }),
       async (buyer) => {
         await syncService.syncBuyer(buyer);
         const state1 = await getBuyerFromDb(buyer.buyer_number);
         
         await syncService.syncBuyer(buyer);
         const state2 = await getBuyerFromDb(buyer.buyer_number);
         
         expect(state1).toEqual(state2);
       }
     ),
     { numRuns: 100 }
   );
   ```

3. **Property 3: created_atの不変性**
   ```typescript
   // Feature: buyer-sync-postgrest-cache-workaround, Property 3: created_atの不変性
   fc.assert(
     fc.asyncProperty(
       fc.record({ buyer_number: fc.string(), name: fc.string() }),
       async (buyer) => {
         await syncService.syncBuyer(buyer);
         const originalCreatedAt = (await getBuyerFromDb(buyer.buyer_number)).created_at;
         
         await syncService.syncBuyer({ ...buyer, name: 'Updated' });
         const updatedCreatedAt = (await getBuyerFromDb(buyer.buyer_number)).created_at;
         
         expect(updatedCreatedAt).toEqual(originalCreatedAt);
       }
     ),
     { numRuns: 100 }
   );
   ```

4. **Property 5: 同期統計の正確性**
   ```typescript
   // Feature: buyer-sync-postgrest-cache-workaround, Property 5: 同期統計の正確性
   fc.assert(
     fc.asyncProperty(
       fc.array(fc.record({ buyer_number: fc.string() })),
       async (buyers) => {
         const result = await syncService.syncAll();
         const sum = result.created + result.updated + result.failed + result.skipped;
         expect(sum).toBe(result.totalProcessed);
       }
     ),
     { numRuns: 100 }
   );
   ```

### Integration Tests

1. **End-to-End Sync**
   - Google Sheetsから実際のデータを取得
   - データベースに同期
   - 結果を検証

2. **Buyer 6648 Verification**
   - 買主6648を含むデータセットで同期
   - データベースに買主6648が存在することを確認
   - フィールド値が一致することを確認

3. **Error Recovery**
   - 意図的にエラーを発生させる
   - 他の買主が正常に同期されることを確認
   - エラーログが正しく記録されることを確認

## Performance Considerations

### バッチサイズの最適化

- 現在: 100件/バッチ
- 推奨: 50件/バッチ（メモリ使用量とスループットのバランス）
- 理由: より細かい進捗レポート、メモリ使用量の削減

### 接続プーリング

Supabaseクライアントは内部で接続プーリングを行うため、追加の設定は不要です。

### レート制限

Google Sheets APIのレート制限:
- 100 requests/100 seconds/user
- 対策: バッチ間に100msの遅延を挿入

### 推定同期時間

- 4000買主 ÷ 50買主/バッチ = 80バッチ
- 各バッチ: 約5秒（API呼び出し + DB書き込み）
- 合計: 約6-7分

## Deployment Considerations

### 環境変数

既存の環境変数を使用:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_KEY`
- `GOOGLE_SERVICE_ACCOUNT_JSON_PATH`

### データベースマイグレーション

新しい`sync_logs`テーブルを作成:

```sql
-- Migration: 057_add_sync_logs.sql
CREATE TABLE IF NOT EXISTS sync_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sync_started_at TIMESTAMPTZ NOT NULL,
  sync_completed_at TIMESTAMPTZ,
  total_buyers INTEGER NOT NULL,
  created_count INTEGER DEFAULT 0,
  updated_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,
  skipped_count INTEGER DEFAULT 0,
  success_rate DECIMAL(5,2),
  duration_ms INTEGER,
  errors JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_sync_logs_started_at ON sync_logs(sync_started_at DESC);
```

### ロールバック計画

変更は既存の機能を拡張するのみで、破壊的変更はありません。ロールバックが必要な場合:
1. 新しいコードを元に戻す
2. `sync_logs`テーブルは残しても問題なし（使用されないだけ）

## Monitoring and Alerting

### メトリクス

1. **同期成功率**: 95%以上を維持
2. **同期時間**: 15分以内
3. **エラー率**: 5%以下

### アラート条件

1. 同期成功率 < 95%
2. 同期時間 > 15分
3. 買主6648が同期されていない
4. 連続3回の同期失敗

### ログ出力

```typescript
console.log(`[BuyerSync] Starting sync at ${new Date().toISOString()}`);
console.log(`[BuyerSync] Processing batch ${batchIndex + 1}/${totalBatches}`);
console.log(`[BuyerSync] Progress: ${current}/${total} (${percentage}%)`);
console.log(`[BuyerSync] Sync complete: ${result.created} created, ${result.updated} updated, ${result.failed} failed`);
console.log(`[BuyerSync] Success rate: ${result.successRate}%`);
```

## Documentation

### README更新

`backend/src/services/README.md`に以下を追加:

```markdown
## BuyerSyncService

買主データをGoogle Sheetsからデータベースに同期するサービス。

### 同期方式

全件同期方式を採用しています。`last_synced_at`と`updated_at`カラムは記録されますが、
フィルタリングには使用されません。これはPostgRESTのスキーマキャッシュ問題の回避策です。

### 使用方法

```typescript
const syncService = new BuyerSyncService();
const result = await syncService.syncAll();
console.log(`Synced ${result.created + result.updated} buyers`);
```

### パフォーマンス

- 4000買主の同期: 約6-7分
- バッチサイズ: 50買主/バッチ
- 成功率: 95%以上を目標
```

### トラブルシューティングガイド

`backend/BUYER_SYNC_TROUBLESHOOTING.md`を作成:

```markdown
# 買主同期トラブルシューティング

## 問題: 買主6648が同期されない

### 確認手順
1. スプレッドシートに買主6648が存在するか確認
2. データベースに買主6648が存在するか確認
3. 同期ログでエラーを確認

### 解決方法
- 全件同期を実行: `npm run sync:buyers`
- 検証スクリプトを実行: `npm run verify:buyer -- 6648`

## 問題: 同期が遅い

### 確認手順
1. バッチサイズを確認
2. ネットワーク遅延を確認
3. データベース接続を確認

### 解決方法
- バッチサイズを調整（50-100の範囲）
- Google Sheets APIのレート制限を確認
```
