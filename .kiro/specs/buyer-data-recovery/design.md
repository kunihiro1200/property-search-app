# Design Document: 買主データ復旧システム

## Overview

買主リストデータベース（buyersテーブル）からデータが完全に消失したため、スプレッドシートから全データを安全に復元するシステムを設計します。このシステムは、既存の`BuyerSyncService`と`BuyerColumnMapper`を活用し、データの整合性を保ちながら効率的に復元を実行します。

## Architecture

### システム構成

```
┌─────────────────────────────────────────────────────────────┐
│                    買主データ復旧システム                      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────────┐      ┌──────────────────┐           │
│  │  Recovery        │      │  Validation      │           │
│  │  Orchestrator    │─────▶│  Service         │           │
│  └──────────────────┘      └──────────────────┘           │
│           │                         │                      │
│           │                         │                      │
│           ▼                         ▼                      │
│  ┌──────────────────┐      ┌──────────────────┐           │
│  │  BuyerSync       │      │  BuyerColumn     │           │
│  │  Service         │◀─────│  Mapper          │           │
│  └──────────────────┘      └──────────────────┘           │
│           │                                                │
│           │                                                │
└───────────┼────────────────────────────────────────────────┘
            │
            ▼
   ┌────────────────────┐          ┌──────────────────┐
   │  Google Sheets     │          │  Supabase        │
   │  買主リスト         │          │  buyers テーブル  │
   │  (データソース)     │          │  (復元先)         │
   └────────────────────┘          └──────────────────┘
```

### コンポーネント

1. **Recovery Orchestrator**: 復旧プロセス全体を管理
2. **Validation Service**: データ検証ロジック
3. **BuyerSyncService**: 既存の同期サービス（再利用）
4. **BuyerColumnMapper**: カラムマッピング（再利用）

## Components and Interfaces

### 1. BuyerDataRecoveryService

復旧プロセス全体を管理するメインサービス。

```typescript
interface RecoveryOptions {
  dryRun?: boolean;              // 実際の復元を行わず、検証のみ実行
  batchSize?: number;            // バッチサイズ（デフォルト: 100）
  skipValidation?: boolean;      // 検証をスキップ（非推奨）
  createBackup?: boolean;        // 既存データのバックアップを作成
}

interface RecoveryResult {
  success: boolean;
  totalRows: number;             // スプレッドシートの総行数
  validRows: number;             // 検証に合格した行数
  inserted: number;              // 挿入された行数
  failed: number;                // 失敗した行数
  skipped: number;               // スキップされた行数
  errors: RecoveryError[];       // エラーリスト
  duration: number;              // 処理時間（ミリ秒）
  backupCreated: boolean;        // バックアップが作成されたか
}

interface RecoveryError {
  row: number;                   // 行番号
  buyerNumber: string | null;    // 買主番号
  message: string;               // エラーメッセージ
  errorType: RecoveryErrorType;  // エラータイプ
  timestamp: string;             // タイムスタンプ
}

enum RecoveryErrorType {
  VALIDATION_ERROR = 'validation_error',
  DATABASE_ERROR = 'database_error',
  DUPLICATE_ERROR = 'duplicate_error',
  UNKNOWN_ERROR = 'unknown_error'
}

class BuyerDataRecoveryService {
  async recoverAll(options?: RecoveryOptions): Promise<RecoveryResult>
  async validateSpreadsheetData(): Promise<ValidationResult>
  async createBackup(): Promise<BackupResult>
  async restoreFromBackup(backupId: string): Promise<RestoreResult>
}
```

### 2. BuyerDataValidator

データ検証を担当するサービス。

```typescript
interface ValidationResult {
  isValid: boolean;
  totalRows: number;
  validRows: number;
  invalidRows: number;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

interface ValidationError {
  row: number;
  field: string;
  value: any;
  message: string;
  severity: 'error' | 'warning';
}

interface ValidationWarning {
  row: number;
  field: string;
  message: string;
}

class BuyerDataValidator {
  validateRow(data: BuyerRecord): ValidationError[]
  validateBuyerNumber(value: any): boolean
  validateEmail(value: any): boolean
  validatePhoneNumber(value: any): boolean
  checkDuplicates(rows: BuyerRecord[]): ValidationError[]
}
```

### 3. RecoveryLogger

復旧プロセスのログを管理。

```typescript
interface RecoveryLog {
  id: string;
  startTime: string;
  endTime: string | null;
  status: 'in_progress' | 'completed' | 'failed';
  totalRows: number;
  processedRows: number;
  result: RecoveryResult | null;
}

class RecoveryLogger {
  async logRecoveryStart(totalRows: number): Promise<string>
  async logRecoveryProgress(logId: string, progress: number): Promise<void>
  async logRecoveryComplete(logId: string, result: RecoveryResult): Promise<void>
  async getRecoveryHistory(): Promise<RecoveryLog[]>
}
```

## Data Models

### Buyer Record (Database)

```typescript
interface BuyerRecord {
  // 必須フィールド
  buyer_number: string;          // 買主番号（主キー）
  
  // 基本情報（暗号化される可能性あり）
  name?: string | null;          // 氏名・会社名
  phone_number?: string | null;  // 電話番号
  email?: string | null;         // メールアドレス
  
  // 問い合わせ情報
  inquiry_source?: string | null;     // 問合せ元
  property_number?: string | null;    // 物件番号
  hearing?: string | null;            // 問合時ヒアリング
  
  // その他のフィールド（181カラム対応）
  [key: string]: any;
  
  // システムフィールド
  created_at?: string;
  updated_at?: string;
  last_synced_at?: string;
}
```

### Spreadsheet Row

```typescript
interface SpreadsheetRow {
  '買主番号': string;
  '氏名・会社名'?: string;
  '電話番号'?: string;
  'メールアドレス'?: string;
  '問合せ元'?: string;
  '物件番号'?: string;
  '問合時ヒアリング'?: string;
  // ... 181カラム
  [key: string]: any;
}
```

## Correctness Properties

*プロパティとは、システムのすべての有効な実行において真であるべき特性や動作のことです。プロパティは、人間が読める仕様と機械で検証可能な正確性の保証との橋渡しとなります。*

### Property 1: データ完全性保持

*すべての*有効なスプレッドシート行について、復元後のデータベースレコードは元のスプレッドシートデータと同じ情報を含むべきである

**Validates: Requirements 2.3, 4.5**

### Property 2: 必須フィールド検証

*すべての*データベースに挿入されるレコードについて、買主番号フィールドは非nullかつ非空文字列でなければならない

**Validates: Requirements 3.1**

### Property 3: 重複排除

*すべての*復元されたレコードについて、同じ買主番号を持つレコードがデータベース内に複数存在してはならない

**Validates: Requirements 3.4**

### Property 4: エラーハンドリング

*すべての*検証エラーについて、そのレコードはスキップされ、エラーログに記録され、復元プロセスは継続されるべきである

**Validates: Requirements 3.5, 5.3**

### Property 5: バッチ処理の冪等性

*すべての*バッチ処理について、同じバッチを複数回実行しても最終的なデータベース状態は同じになるべきである

**Validates: Requirements 4.2**

### Property 6: 進捗レポート精度

*すべての*復元プロセスについて、報告される進捗率は実際の処理済み行数と総行数の比率と一致するべきである

**Validates: Requirements 5.2**

### Property 7: データ整合性検証

*すべての*復元完了後について、データベースのレコード数はスプレッドシートの有効行数と一致するべきである

**Validates: Requirements 4.5, 6.1**

### Property 8: バックアップとリストアの往復

*すべての*バックアップについて、バックアップを作成してからリストアすると元のデータベース状態に戻るべきである

**Validates: Requirements 7.2, 7.3**

## Error Handling

### エラー分類

1. **Validation Errors**: データ検証エラー
   - 必須フィールドの欠落
   - 不正なフォーマット（メール、電話番号）
   - 重複データ

2. **Database Errors**: データベースエラー
   - 接続エラー
   - トランザクションエラー
   - 制約違反

3. **Spreadsheet Errors**: スプレッドシートエラー
   - 認証エラー
   - アクセス権限エラー
   - レート制限エラー

4. **System Errors**: システムエラー
   - メモリ不足
   - タイムアウト
   - 予期しないエラー

### エラー処理戦略

```typescript
// 検証エラー: スキップして続行
if (validationError) {
  logger.logError(row, error);
  result.skipped++;
  continue;
}

// データベースエラー: リトライ（最大3回）
if (databaseError) {
  for (let retry = 0; retry < 3; retry++) {
    try {
      await insertData();
      break;
    } catch (err) {
      if (retry === 2) {
        logger.logError(row, err);
        result.failed++;
      }
      await sleep(1000 * (retry + 1));
    }
  }
}

// 致命的エラー: プロセス停止
if (fatalError) {
  await rollback();
  throw new RecoveryError('Fatal error occurred', error);
}
```

### ロールバック戦略

```typescript
// トランザクション管理
async function recoverWithTransaction() {
  const transaction = await db.transaction();
  
  try {
    // バックアップ作成
    await createBackup(transaction);
    
    // データ復元
    await insertData(transaction);
    
    // 検証
    await validateResult(transaction);
    
    // コミット
    await transaction.commit();
  } catch (error) {
    // ロールバック
    await transaction.rollback();
    throw error;
  }
}
```

## Testing Strategy

### Unit Tests

1. **BuyerDataValidator**
   - 必須フィールド検証
   - メールアドレス形式検証
   - 電話番号形式検証
   - 重複検出

2. **BuyerColumnMapper**
   - カラムマッピング
   - 型変換
   - null値処理

3. **RecoveryLogger**
   - ログ記録
   - 進捗追跡

### Property-Based Tests

各正確性プロパティに対して、最低100回の反復でテストを実行します。

#### Test 1: データ完全性保持

```typescript
// Property 1: データ完全性保持
// Feature: buyer-data-recovery, Property 1
test('すべての有効なスプレッドシート行は正しく復元される', async () => {
  // ランダムな有効データを生成
  const spreadsheetRows = generateValidSpreadsheetRows(100);
  
  // 復元実行
  await recoveryService.recoverAll({ dryRun: false });
  
  // 検証: すべての行がデータベースに存在する
  for (const row of spreadsheetRows) {
    const dbRecord = await db.buyers.findByNumber(row['買主番号']);
    expect(dbRecord).toBeDefined();
    expect(dbRecord.name).toBe(row['氏名・会社名']);
    expect(dbRecord.email).toBe(row['メールアドレス']);
  }
});
```

#### Test 2: 必須フィールド検証

```typescript
// Property 2: 必須フィールド検証
// Feature: buyer-data-recovery, Property 2
test('買主番号が空のレコードは拒否される', async () => {
  // ランダムなデータを生成（買主番号が空）
  const invalidRows = generateRowsWithEmptyBuyerNumber(100);
  
  // 検証実行
  const result = await validator.validateRows(invalidRows);
  
  // すべてのレコードが検証エラーになる
  expect(result.invalidRows).toBe(100);
  expect(result.errors.every(e => e.field === 'buyer_number')).toBe(true);
});
```

#### Test 3: 重複排除

```typescript
// Property 3: 重複排除
// Feature: buyer-data-recovery, Property 3
test('重複する買主番号は検出される', async () => {
  // 重複を含むランダムデータを生成
  const rowsWithDuplicates = generateRowsWithDuplicates(100, 10);
  
  // 検証実行
  const result = await validator.checkDuplicates(rowsWithDuplicates);
  
  // 重複が検出される
  expect(result.errors.length).toBeGreaterThan(0);
  expect(result.errors.every(e => e.message.includes('duplicate'))).toBe(true);
});
```

#### Test 4: エラーハンドリング

```typescript
// Property 4: エラーハンドリング
// Feature: buyer-data-recovery, Property 4
test('検証エラーがあってもプロセスは継続する', async () => {
  // 有効・無効が混在するランダムデータを生成
  const mixedRows = generateMixedValidityRows(100, 0.3); // 30%が無効
  
  // 復元実行
  const result = await recoveryService.recoverAll();
  
  // 有効なレコードは挿入され、無効なレコードはスキップされる
  expect(result.inserted).toBeGreaterThan(0);
  expect(result.skipped).toBeGreaterThan(0);
  expect(result.success).toBe(true);
});
```

#### Test 5: バッチ処理の冪等性

```typescript
// Property 5: バッチ処理の冪等性
// Feature: buyer-data-recovery, Property 5
test('同じバッチを複数回実行しても結果は同じ', async () => {
  // ランダムなバッチデータを生成
  const batchData = generateValidSpreadsheetRows(50);
  
  // 1回目の実行
  await recoveryService.recoverBatch(batchData);
  const count1 = await db.buyers.count();
  
  // 2回目の実行（upsert）
  await recoveryService.recoverBatch(batchData);
  const count2 = await db.buyers.count();
  
  // レコード数は変わらない
  expect(count1).toBe(count2);
});
```

#### Test 6: 進捗レポート精度

```typescript
// Property 6: 進捗レポート精度
// Feature: buyer-data-recovery, Property 6
test('進捗率は実際の処理状況を正確に反映する', async () => {
  const totalRows = 1000;
  const progressReports: number[] = [];
  
  // 進捗コールバックで進捗率を記録
  await recoveryService.recoverAll({
    onProgress: (progress) => {
      progressReports.push(progress.percentage);
    }
  });
  
  // 進捗率は単調増加する
  for (let i = 1; i < progressReports.length; i++) {
    expect(progressReports[i]).toBeGreaterThanOrEqual(progressReports[i - 1]);
  }
  
  // 最終的に100%になる
  expect(progressReports[progressReports.length - 1]).toBe(100);
});
```

#### Test 7: データ整合性検証

```typescript
// Property 7: データ整合性検証
// Feature: buyer-data-recovery, Property 7
test('復元後のレコード数はスプレッドシートの有効行数と一致する', async () => {
  // スプレッドシートの有効行数を取得
  const validRows = await getValidSpreadsheetRowCount();
  
  // 復元実行
  await recoveryService.recoverAll();
  
  // データベースのレコード数を確認
  const dbCount = await db.buyers.count();
  
  // 一致する
  expect(dbCount).toBe(validRows);
});
```

#### Test 8: バックアップとリストアの往復

```typescript
// Property 8: バックアップとリストアの往復
// Feature: buyer-data-recovery, Property 8
test('バックアップからリストアすると元の状態に戻る', async () => {
  // 初期データを挿入
  const initialData = generateValidSpreadsheetRows(100);
  await db.buyers.insertMany(initialData);
  
  // バックアップ作成
  const backup = await recoveryService.createBackup();
  
  // データを変更
  await db.buyers.deleteAll();
  
  // リストア
  await recoveryService.restoreFromBackup(backup.id);
  
  // 元のデータと一致する
  const restoredCount = await db.buyers.count();
  expect(restoredCount).toBe(100);
});
```

### Integration Tests

1. **完全復元フロー**
   - スプレッドシート読み取り → 検証 → 挿入 → 検証
   
2. **エラーリカバリー**
   - データベース接続エラー時のリトライ
   - トランザクションロールバック

3. **大量データ処理**
   - 10,000件以上のデータ復元
   - メモリ使用量の監視

### Test Configuration

- Property-based tests: 最低100回の反復
- Batch size: 50-100レコード
- Timeout: 各テスト最大60秒
- Test data: ランダム生成 + 実データサンプル

## Implementation Notes

### 既存コンポーネントの再利用

1. **BuyerSyncService**: 
   - `syncAll()`メソッドをベースに復元ロジックを構築
   - バッチ処理とエラーハンドリングを活用

2. **BuyerColumnMapper**:
   - スプレッドシートとDBのマッピングに使用
   - 型変換ロジックを活用

3. **GoogleSheetsClient**:
   - スプレッドシートデータの読み取りに使用
   - レート制限対応済み

### パフォーマンス最適化

1. **バッチ処理**: 100件ずつ処理（メモリ効率）
2. **並列処理**: 検証と挿入を並列化（可能な場合）
3. **インデックス**: 買主番号にインデックスを使用
4. **トランザクション**: バッチごとにトランザクション管理

### セキュリティ考慮事項

1. **暗号化データ**: 暗号化されたデータはそのまま保存
2. **アクセス制御**: サービスロールキーを使用
3. **ログ**: 個人情報をログに記録しない
4. **バックアップ**: バックアップデータも暗号化

## Deployment Considerations

### 実行環境

- Node.js 18+
- TypeScript 5+
- Supabase接続
- Google Sheets API認証

### 実行手順

```bash
# 1. ドライラン（検証のみ）
npx ts-node recover-buyer-data.ts --dry-run

# 2. バックアップ作成
npx ts-node recover-buyer-data.ts --create-backup

# 3. 実際の復元
npx ts-node recover-buyer-data.ts --recover

# 4. 検証
npx ts-node recover-buyer-data.ts --verify
```

### モニタリング

- 進捗状況のリアルタイム表示
- エラーログの記録
- 処理時間の測定
- メモリ使用量の監視

### ロールバック計画

1. バックアップからの復元
2. トランザクションロールバック
3. 手動でのデータ削除（最終手段）
