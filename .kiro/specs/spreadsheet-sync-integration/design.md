# Design Document

## Overview

本システムは、Googleスプレッドシート（約1万行の売主データ）とSupabaseデータベース間のデータ移行および同期機能を提供します。主な設計目標は以下の通りです:

1. **初回データ移行**: 既存スプレッドシートデータを安全にSupabaseに移行
2. **リアルタイム同期**: ブラウザでの編集を即座にスプレッドシートに反映
3. **メール自動登録**: 査定依頼メールから自動的に売主を登録
4. **高パフォーマンス**: 1万行のデータを効率的に処理
5. **エラーハンドリング**: 同期失敗時の適切な処理とリトライ

## Architecture

### System Components

```
┌─────────────────┐
│   Browser UI    │
│   (React)       │
└────────┬────────┘
         │
         ↓ HTTP/REST
┌─────────────────┐
│  Backend API    │
│  (Express.js)   │
└────────┬────────┘
         │
         ├──→ Supabase PostgreSQL
         │
         └──→ Google Sheets API
              (via googleapis)

┌─────────────────┐
│  Email System   │
│  (Existing)     │
└────────┬────────┘
         │
         ↓ Webhook/API
┌─────────────────┐
│  Integration    │
│  Endpoint       │
└─────────────────┘
```

### Data Flow

#### 1. Initial Migration Flow
```
Spreadsheet → Migration Script → Supabase
                                    ↓
                              Validation & Logging
```

#### 2. Browser Edit Flow
```
Browser → API → Supabase → Sync Service → Google Sheets API
                  ↓
            Response to Browser
```

#### 3. Email Registration Flow
```
Email System → Integration API → Seller Number Generation
                                        ↓
                                  Supabase Insert
                                        ↓
                                  Spreadsheet Append
```

## Components and Interfaces

### 1. SpreadsheetSyncService

スプレッドシートとSupabase間の同期を管理するコアサービス。

```typescript
interface SpreadsheetSyncService {
  // 初回データ移行
  migrateFromSpreadsheet(options: MigrationOptions): Promise<MigrationResult>;
  
  // Supabase → Spreadsheet 同期
  syncToSpreadsheet(sellerId: string): Promise<SyncResult>;
  syncBatchToSpreadsheet(sellerIds: string[]): Promise<BatchSyncResult>;
  
  // 手動同期トリガー
  manualSync(direction: 'full' | 'incremental'): Promise<SyncResult>;
  
  // 同期ステータス確認
  getSyncStatus(): Promise<SyncStatus>;
}

interface MigrationOptions {
  batchSize: number;
  skipDuplicates: boolean;
  dryRun: boolean;
}

interface MigrationResult {
  totalRows: number;
  successCount: number;
  failureCount: number;
  errors: MigrationError[];
  duration: number;
}

interface SyncResult {
  success: boolean;
  rowsAffected: number;
  error?: string;
}
```

### 2. GoogleSheetsClient

Google Sheets APIとの通信を抽象化するクライアント。

```typescript
interface GoogleSheetsClient {
  // 認証
  authenticate(): Promise<void>;
  
  // 読み取り
  readAll(): Promise<SheetRow[]>;
  readRange(range: string): Promise<SheetRow[]>;
  
  // 書き込み
  appendRow(row: SheetRow): Promise<void>;
  updateRow(rowIndex: number, row: SheetRow): Promise<void>;
  deleteRow(rowIndex: number): Promise<void>;
  
  // バッチ操作
  batchUpdate(updates: BatchUpdate[]): Promise<void>;
}

interface SheetRow {
  [columnName: string]: string | number | null;
}

interface BatchUpdate {
  rowIndex: number;
  values: SheetRow;
}
```

### 3. ColumnMapper

スプレッドシートのカラムとSupabaseのカラムをマッピング。

```typescript
interface ColumnMapper {
  // スプレッドシート → Supabase
  mapToDatabase(sheetRow: SheetRow): SellerData;
  
  // Supabase → スプレッドシート
  mapToSheet(sellerData: SellerData): SheetRow;
  
  // バリデーション
  validate(sheetRow: SheetRow): ValidationResult;
}

interface ValidationResult {
  isValid: boolean;
  errors: string[];
}
```

### 4. EmailIntegrationService

既存のメールシステムとの統合を管理。

```typescript
interface EmailIntegrationService {
  // メールから売主情報を受け取る
  handleInquiryEmail(emailData: InquiryEmailData): Promise<string>; // returns seller_id
  
  // 売主番号を生成
  generateSellerNumber(): Promise<string>;
}

interface InquiryEmailData {
  name: string;
  address: string;
  phoneNumber: string;
  email?: string;
  propertyAddress: string;
  inquirySource: string;
  inquiryDate: Date;
  // その他のフィールド
}
```

### 5. SyncQueue

同期処理をキューイングして順次処理。

```typescript
interface SyncQueue {
  // キューに追加
  enqueue(operation: SyncOperation): Promise<void>;
  
  // 処理開始
  process(): Promise<void>;
  
  // キューの状態
  getQueueStatus(): QueueStatus;
}

interface SyncOperation {
  type: 'create' | 'update' | 'delete';
  sellerId: string;
  data?: SellerData;
  retryCount: number;
}

interface QueueStatus {
  pending: number;
  processing: number;
  failed: number;
}
```

## Data Models

### Seller Data (Supabase)

既存のSupabaseスキーマを使用。主要フィールド:

```typescript
interface SellerData {
  id: string; // UUID
  seller_number: string; // AA1, AA2, ...
  name: string;
  address: string;
  phone_number: string;
  email?: string;
  inquiry_source?: string;
  inquiry_date?: Date;
  // ... 100+ fields from migration 009
  created_at: Date;
  updated_at: Date;
  synced_to_sheet_at?: Date; // 最後にスプシに同期した時刻
}
```

### Spreadsheet Row

スプレッドシートの行データ。実際のカラム構造に基づいてマッピング。

```typescript
interface SpreadsheetRow {
  売主番号: string;
  氏名: string;
  住所: string;
  電話番号: string;
  メールアドレス?: string;
  反響サイト?: string;
  反響日?: string;
  // ... その他のカラム
}
```

### Sync Log

同期処理のログを記録。

```typescript
interface SyncLog {
  id: string;
  sync_type: 'migration' | 'create' | 'update' | 'delete' | 'manual';
  seller_id?: string;
  status: 'success' | 'failure' | 'pending';
  error_message?: string;
  rows_affected: number;
  started_at: Date;
  completed_at?: Date;
  duration_ms?: number;
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Data Consistency After Sync
*For any* seller record in Supabase, after a successful sync operation, the corresponding row in the spreadsheet should contain the same data values
**Validates: Requirements 3.1, 3.2**

### Property 2: Seller Number Uniqueness
*For any* two seller records, their seller numbers should be unique and follow the sequential pattern (AA1, AA2, ...)
**Validates: Requirements 4.2**

### Property 3: Sync Idempotency
*For any* seller record, syncing the same data multiple times should result in the same spreadsheet state (no duplicate rows)
**Validates: Requirements 3.1**

### Property 4: Migration Completeness
*For any* migration operation, the number of successfully migrated records plus failed records should equal the total number of source rows
**Validates: Requirements 1.1, 1.3**

### Property 5: Error Recovery
*For any* failed sync operation, the system should log the error and the Supabase data should remain unchanged
**Validates: Requirements 1.2, 3.4**

### Property 6: Batch Processing Consistency
*For any* batch of seller records, processing them in batches should produce the same result as processing them individually
**Validates: Requirements 8.1**

### Property 7: Column Mapping Reversibility
*For any* seller data, mapping to spreadsheet format and back should preserve all required fields
**Validates: Requirements 7.2**

### Property 8: Rate Limit Compliance
*For any* sync operation, the number of API requests per 100 seconds should not exceed 100
**Validates: Requirements 8.5**

## Error Handling

### Error Categories

1. **Network Errors**: Google Sheets API接続失敗
   - Retry: 3回まで、exponential backoff
   - Fallback: キューに保存して後で再試行

2. **Validation Errors**: データ形式不正
   - Action: エラーログに記録、該当レコードをスキップ
   - Notification: 管理者に通知

3. **Rate Limit Errors**: API制限超過
   - Action: 自動的に待機してリトライ
   - Monitoring: レート制限の使用状況を監視

4. **Authentication Errors**: 認証失敗
   - Action: システムを停止、管理者に緊急通知
   - Recovery: 認証情報を再設定

5. **Data Conflict Errors**: 重複データ検出
   - Action: 設定に基づいて処理（スキップ/上書き）
   - Logging: 競合の詳細をログに記録

### Error Logging

```typescript
interface ErrorLog {
  id: string;
  error_type: 'network' | 'validation' | 'rate_limit' | 'auth' | 'conflict';
  error_message: string;
  stack_trace?: string;
  seller_id?: string;
  operation: string;
  retry_count: number;
  created_at: Date;
}
```

### Retry Strategy

```typescript
interface RetryConfig {
  maxRetries: 3;
  initialDelay: 1000; // ms
  maxDelay: 10000; // ms
  backoffMultiplier: 2;
}

// Exponential backoff: 1s, 2s, 4s
function calculateDelay(retryCount: number): number {
  return Math.min(
    initialDelay * Math.pow(backoffMultiplier, retryCount),
    maxDelay
  );
}
```

## Testing Strategy

### Unit Tests

1. **ColumnMapper Tests**
   - スプレッドシート → Supabase変換の正確性
   - Supabase → スプレッドシート変換の正確性
   - バリデーションロジック

2. **GoogleSheetsClient Tests**
   - API呼び出しのモック
   - エラーハンドリング
   - レート制限の遵守

3. **SyncQueue Tests**
   - キューイングロジック
   - 順次処理
   - エラー時の動作

### Integration Tests

1. **End-to-End Sync Test**
   - Supabaseにテストデータを作成
   - スプレッドシートに同期
   - データの一致を確認

2. **Migration Test**
   - テスト用スプレッドシートからSupabaseに移行
   - データの完全性を確認

3. **Email Integration Test**
   - モックメールデータから売主を作成
   - Supabaseとスプレッドシートの両方に反映されることを確認

### Property-Based Tests

Property-based testing library: **fast-check** (TypeScript/JavaScript)

Each property test should run a minimum of 100 iterations.

1. **Property 1 Test: Data Consistency After Sync**
   ```typescript
   // Feature: spreadsheet-sync-integration, Property 1: Data Consistency After Sync
   // Validates: Requirements 3.1, 3.2
   ```

2. **Property 2 Test: Seller Number Uniqueness**
   ```typescript
   // Feature: spreadsheet-sync-integration, Property 2: Seller Number Uniqueness
   // Validates: Requirements 4.2
   ```

3. **Property 3 Test: Sync Idempotency**
   ```typescript
   // Feature: spreadsheet-sync-integration, Property 3: Sync Idempotency
   // Validates: Requirements 3.1
   ```

4. **Property 4 Test: Migration Completeness**
   ```typescript
   // Feature: spreadsheet-sync-integration, Property 4: Migration Completeness
   // Validates: Requirements 1.1, 1.3
   ```

5. **Property 5 Test: Error Recovery**
   ```typescript
   // Feature: spreadsheet-sync-integration, Property 5: Error Recovery
   // Validates: Requirements 1.2, 3.4
   ```

6. **Property 6 Test: Batch Processing Consistency**
   ```typescript
   // Feature: spreadsheet-sync-integration, Property 6: Batch Processing Consistency
   // Validates: Requirements 8.1
   ```

7. **Property 7 Test: Column Mapping Reversibility**
   ```typescript
   // Feature: spreadsheet-sync-integration, Property 7: Column Mapping Reversibility
   // Validates: Requirements 7.2
   ```

8. **Property 8 Test: Rate Limit Compliance**
   ```typescript
   // Feature: spreadsheet-sync-integration, Property 8: Rate Limit Compliance
   // Validates: Requirements 8.5
   ```

## Performance Considerations

### Optimization Strategies

1. **Batch Processing**
   - 100件ずつバッチ処理
   - Google Sheets APIの`batchUpdate`を使用

2. **Caching**
   - スプレッドシートのカラムヘッダーをキャッシュ
   - 認証トークンをキャッシュ

3. **Async Processing**
   - 同期処理をバックグラウンドで実行
   - ユーザーの操作をブロックしない

4. **Connection Pooling**
   - Supabase接続をプール
   - 再利用して接続オーバーヘッドを削減

5. **Rate Limiting**
   - Google Sheets API制限を遵守
   - 100リクエスト/100秒を超えないように制御

### Performance Targets

- **初回移行**: 10,000行を5分以内
- **単一レコード同期**: 2秒以内
- **バッチ同期（100件）**: 10秒以内
- **API応答時間**: 500ms以内（同期処理は非同期）

## Security Considerations

1. **認証情報の管理**
   - サービスアカウントキーを環境変数で管理
   - `.env`ファイルを`.gitignore`に追加

2. **アクセス制御**
   - スプレッドシートへのアクセスをサービスアカウントのみに制限
   - Supabase RLSポリシーを適用

3. **データ暗号化**
   - HTTPS通信を使用
   - 機密情報（電話番号など）は既存の暗号化機能を使用

4. **監査ログ**
   - すべての同期操作をログに記録
   - 誰がいつ何を変更したかを追跡

## Deployment Strategy

### Phase 1: Initial Migration (Week 1)
1. サービスアカウント設定
2. 移行スクリプト開発
3. テスト環境で移行テスト
4. 本番環境で移行実行

### Phase 2: One-way Sync (Week 2)
1. SpreadsheetSyncService実装
2. SellerService統合
3. テスト環境で動作確認
4. 本番環境デプロイ

### Phase 3: Email Integration (Week 3)
1. 既存メールシステムとの統合API開発
2. 統合テスト
3. 本番環境デプロイ

### Phase 4: Monitoring & Optimization (Week 4)
1. 同期ステータス監視ダッシュボード
2. パフォーマンス最適化
3. エラーハンドリング改善

## Monitoring and Observability

### Metrics to Track

1. **Sync Performance**
   - 同期処理時間
   - 成功率
   - 失敗率

2. **API Usage**
   - Google Sheets APIリクエスト数
   - レート制限の使用率

3. **Error Rates**
   - エラータイプ別の発生頻度
   - リトライ成功率

4. **Data Quality**
   - バリデーションエラー数
   - データ不整合の検出

### Logging Strategy

```typescript
// 構造化ログ
logger.info('Sync operation started', {
  operation: 'sync_to_spreadsheet',
  seller_id: 'xxx',
  timestamp: new Date().toISOString()
});

logger.error('Sync operation failed', {
  operation: 'sync_to_spreadsheet',
  seller_id: 'xxx',
  error: error.message,
  stack: error.stack,
  retry_count: 2
});
```

### Alerting

1. **Critical Alerts**
   - 認証失敗
   - 連続する同期失敗（5回以上）

2. **Warning Alerts**
   - レート制限に近づいている（80%以上）
   - 同期処理が遅い（目標の2倍以上）

3. **Info Notifications**
   - 初回移行完了
   - 手動同期完了

## Future Enhancements

1. **双方向同期**: スプレッドシート → Supabaseの同期（必要に応じて）
2. **リアルタイム同期**: Supabase Database Webhooksを使用
3. **差分同期**: 変更されたフィールドのみを同期
4. **バージョン管理**: データの変更履歴を保存
5. **複数シート対応**: 買主リスト、物件リストなど
