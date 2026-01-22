# Design Document

## Architecture Overview

物件リスト（property_listings）の全フィールドを自動同期するシステムを設計します。既存の`PropertyListingSyncService`のUPDATE機能（`syncUpdatedPropertyListings()`）を`EnhancedAutoSyncService`に統合し、定期的な自動同期を実現します。

## Key Design Decisions

### 1. 既存機能の活用

`PropertyListingSyncService`には既に以下の機能が実装されています：

- `detectUpdatedPropertyListings()` - スプレッドシートとDBの差分検出
- `updatePropertyListing()` - 個別物件の更新
- `syncUpdatedPropertyListings()` - 全物件の一括更新（バッチ処理）

**設計方針**: これらの既存機能をそのまま活用し、`EnhancedAutoSyncService`に統合するだけで自動同期を実現します。

### 2. 統合ポイント

`EnhancedAutoSyncService.runFullSync()`の実行フローに、Phase 4.5として物件リスト更新同期を追加します：

```
Phase 1-3: Seller sync (既存)
Phase 4: Property listing creation sync (既存)
Phase 4.5: Property listing update sync (新規) ← ここに追加
Phase 5-6: Other syncs (既存)
```

### 3. 全フィールド同期

ATBB状態だけでなく、property_listingsテーブルの**全フィールド**を同期対象とします：

- 基本情報、価格、面積、建物情報
- ステータス、担当者、査定情報
- 契約情報、訪問情報、フォローアップ
- ATBB関連（atbb_status, storage_location, public_url）
- その他セクション（other_section_1 ~ 20）

## System Components

### 1. PropertyListingSyncService (既存)

**役割**: 物件リストの同期処理を担当

**既存機能（そのまま使用）**:
- `detectUpdatedPropertyListings()` - スプレッドシートとDBの差分検出（全フィールド対象）
- `updatePropertyListing()` - 個別物件の更新
- `syncUpdatedPropertyListings()` - 全物件の一括更新（バッチ処理、sync_logsへの記録含む）
- `detectChanges()` - フィールド単位の差分検出
- `normalizeValue()` - 値の正規化（null処理、trim）
- `logSyncResult()` - sync_logsへの記録

**変更不要**: 既存実装で全フィールドの同期に対応済み

### 2. EnhancedAutoSyncService (既存)

**役割**: 自動同期のオーケストレーション

**統合ポイント（新規追加）**:
```typescript
// Phase 4.5: Property Listing Update Sync (新規追加)
async syncPropertyListingUpdates() {
  console.log('\n🔄 Phase 4.5: Property Listing Update Sync');
  
  // PropertyListingSyncServiceを初期化（GoogleSheetsClient付き）
  const sheetsClient = new GoogleSheetsClient({
    spreadsheetId: process.env.PROPERTY_LIST_SPREADSHEET_ID!,
    sheetName: '物件',
    serviceAccountKeyPath: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH!
  });
  
  await sheetsClient.authenticate();
  
  const propertyListingSyncService = new PropertyListingSyncService(sheetsClient);
  
  // 既存のsyncUpdatedPropertyListings()を呼び出すだけ
  const result = await propertyListingSyncService.syncUpdatedPropertyListings();
  
  console.log(`✅ Property listing update sync: ${result.updated} updated, ${result.failed} failed`);
  
  return result;
}
```

**runFullSync()への統合**:
```typescript
async runFullSync(triggeredBy: 'scheduled' | 'manual' = 'scheduled'): Promise<CompleteSyncResult> {
  // ... Phase 1-3: Seller sync ...
  
  // Phase 4: Property listing creation sync (既存)
  // ... 既存のコード ...
  
  // Phase 4.5: Property listing update sync (新規追加)
  await this.syncPropertyListingUpdates();
  
  // Phase 5-6: Other syncs (既存)
  // ... 既存のコード ...
}
```

**実行順序**:
1. Phase 1-3: Seller sync（既存）
2. Phase 4: Property listing creation sync（既存）
3. **Phase 4.5: Property listing update sync（新規）** ← ここに追加
4. Phase 5-6: Other syncs（既存）

### 3. Manual Sync Script (新規)

**ファイル**: `backend/sync-property-listings-updates.ts`（既存）

**役割**: 手動で物件リスト更新同期を実行

**既存実装**: 既に実装済み。そのまま使用可能。

**使用ケース**:
- 初回セットアップ時の全件同期
- 自動同期が停止している間の手動同期
- 特定の問題が発生した際の緊急同期
- 大量の未同期データがある場合の一括同期

**実装内容**:
```typescript
// backend/sync-property-listings-updates.ts (既存)
import { PropertyListingSyncService } from './src/services/PropertyListingSyncService';
import { GoogleSheetsClient } from './src/services/GoogleSheetsClient';

async function main() {
  const sheetsClient = new GoogleSheetsClient({
    spreadsheetId: process.env.PROPERTY_LIST_SPREADSHEET_ID!,
    sheetName: '物件',
    serviceAccountKeyPath: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH!
  });
  
  await sheetsClient.authenticate();
  
  const syncService = new PropertyListingSyncService(sheetsClient);
  const result = await syncService.syncUpdatedPropertyListings();
  
  console.log('Sync completed:', result);
}

main();
```

## Data Flow

### 1. 自動同期フロー

```
┌─────────────────────────────────────────────────────────────┐
│ EnhancedAutoSyncService (定期実行)                           │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│ PropertyListingSyncService.syncATBBStatus()                 │
│                                                             │
│ 1. detectUpdatedPropertyListings()                          │
│    - スプレッドシートから全物件データ取得                      │
│    - DBから全物件データ取得                                   │
│    - ATBB関連フィールドの差分検出                             │
│                                                             │
│ 2. validateAndFixStorageLocations()                         │
│    - 格納先URLの形式検証                                      │
│    - 不正な場合はスプレッドシートから再取得                     │
│                                                             │
│ 3. updatePropertyListings()                                 │
│    - バッチ処理で更新実行                                     │
│    - 公開URL自動生成                                          │
│                                                             │
│ 4. logResults()                                             │
│    - sync_logsに記録                                         │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│ Supabase (property_listings テーブル)                        │
│                                                             │
│ 更新されるフィールド:                                          │
│ - atbb_status                                               │
│ - storage_location                                          │
│ - public_url (自動生成)                                      │
│ - updated_at                                                │
└─────────────────────────────────────────────────────────────┘
```

### 2. バッチ同期フロー

```
┌─────────────────────────────────────────────────────────────┐
│ sync-all-atbb-status.ts (手動実行)                           │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│ PropertyListingSyncService.syncAllATBBStatus()              │
│                                                             │
│ 1. getAllPropertyNumbers()                                  │
│    - DBから全物件番号取得                                     │
│                                                             │
│ 2. processBatch() (10件ずつ)                                │
│    - スプレッドシートからデータ取得                            │
│    - 格納先URL検証・修正                                      │
│    - ATBB状態更新                                            │
│    - 公開URL生成                                             │
│                                                             │
│ 3. reportProgress()                                         │
│    - 進捗状況をコンソール出力                                 │
│    - エラー詳細を記録                                         │
└─────────────────────────────────────────────────────────────┘
```

## Database Schema

### property_listings テーブル (既存)

ATBB状態同期に関連するカラム:

```sql
-- ATBB状態関連
atbb_status TEXT,              -- アットホーム公開フォルダ状態
storage_location TEXT,         -- Google Drive格納先URL
public_url TEXT,               -- 公開物件サイトURL (自動生成)

-- メタデータ
updated_at TIMESTAMP,          -- 最終更新日時
last_synced_at TIMESTAMP,      -- 最終同期日時 (新規追加)
```

### sync_logs テーブル (既存)

ATBB状態同期のログ記録:

```sql
INSERT INTO sync_logs (
  sync_type,                   -- 'property_listing_atbb_status'
  started_at,
  completed_at,
  status,                      -- 'success' | 'partial_success' | 'error'
  properties_updated,          -- 更新成功件数
  properties_failed,           -- 更新失敗件数
  duration_ms,
  error_details                -- エラー詳細 (JSON)
);
```

## API Design

### PropertyListingSyncService 新規メソッド

#### 1. syncATBBStatus()

```typescript
/**
 * ATBB状態の自動同期
 * 
 * スプレッドシートとDBを比較し、ATBB関連フィールドの差分を同期する。
 * 格納先URLの検証・修正、公開URLの自動生成も行う。
 * 
 * @returns 同期結果サマリー
 */
async syncATBBStatus(): Promise<ATBBSyncResult> {
  // 1. ATBB関連フィールドの差分検出
  const updates = await this.detectATBBUpdates();
  
  // 2. 格納先URLの検証と修正
  const validated = await this.validateStorageLocations(updates);
  
  // 3. バッチ更新実行
  const results = await this.applyATBBUpdates(validated);
  
  // 4. 結果集計
  return this.summarizeResults(results);
}
```

#### 2. detectATBBUpdates()

```typescript
/**
 * ATBB関連フィールドの差分検出
 * 
 * スプレッドシートとDBを比較し、以下のフィールドの変更を検出:
 * - atbb_status
 * - storage_location
 * 
 * @returns 更新が必要な物件リスト
 */
private async detectATBBUpdates(): Promise<ATBBUpdate[]> {
  const spreadsheetData = await this.sheetsClient.readAll();
  const { data: dbData } = await this.supabase
    .from('property_listings')
    .select('property_number, atbb_status, storage_location');
  
  const updates: ATBBUpdate[] = [];
  
  for (const row of spreadsheetData) {
    const propertyNumber = row['物件番号'];
    const dbProperty = dbData.find(p => p.property_number === propertyNumber);
    
    if (!dbProperty) continue;
    
    const changes = this.detectATBBChanges(row, dbProperty);
    
    if (Object.keys(changes).length > 0) {
      updates.push({
        property_number: propertyNumber,
        changes,
        spreadsheet_data: row
      });
    }
  }
  
  return updates;
}
```

#### 3. validateStorageLocations()

```typescript
/**
 * 格納先URLの検証と修正
 * 
 * 格納先URLが以下の条件を満たすか検証:
 * - 空でない
 * - Google DriveのURL形式
 * - フォルダIDが抽出可能
 * 
 * 不正な場合はスプレッドシートから再取得して修正。
 * 
 * @param updates 更新対象物件リスト
 * @returns 検証済み更新リスト
 */
private async validateStorageLocations(
  updates: ATBBUpdate[]
): Promise<ATBBUpdate[]> {
  const validated: ATBBUpdate[] = [];
  
  for (const update of updates) {
    const storageLocation = update.changes.storage_location?.new;
    
    if (!storageLocation || !this.isValidDriveURL(storageLocation)) {
      // スプレッドシートから正しいURLを取得
      const correctURL = await this.fetchStorageLocationFromSheet(
        update.property_number
      );
      
      if (correctURL) {
        update.changes.storage_location = {
          old: storageLocation,
          new: correctURL
        };
      }
    }
    
    validated.push(update);
  }
  
  return validated;
}
```

#### 4. applyATBBUpdates()

```typescript
/**
 * ATBB状態の更新を適用
 * 
 * バッチ処理で更新を実行。公開URLも自動生成。
 * 
 * @param updates 更新対象物件リスト
 * @returns 更新結果リスト
 */
private async applyATBBUpdates(
  updates: ATBBUpdate[]
): Promise<UpdateResult[]> {
  const BATCH_SIZE = 10;
  const results: UpdateResult[] = [];
  
  for (let i = 0; i < updates.length; i += BATCH_SIZE) {
    const batch = updates.slice(i, i + BATCH_SIZE);
    
    const batchResults = await Promise.all(
      batch.map(async (update) => {
        try {
          // 公開URL生成
          const publicURL = this.generatePublicURL(
            update.changes.storage_location?.new
          );
          
          // 更新データ準備
          const updateData: any = {};
          
          if (update.changes.atbb_status) {
            updateData.atbb_status = update.changes.atbb_status.new;
          }
          
          if (update.changes.storage_location) {
            updateData.storage_location = update.changes.storage_location.new;
          }
          
          if (publicURL) {
            updateData.public_url = publicURL;
          }
          
          updateData.last_synced_at = new Date().toISOString();
          updateData.updated_at = new Date().toISOString();
          
          // DB更新
          const { error } = await this.supabase
            .from('property_listings')
            .update(updateData)
            .eq('property_number', update.property_number);
          
          if (error) throw error;
          
          return {
            success: true,
            property_number: update.property_number,
            fields_updated: Object.keys(updateData)
          };
          
        } catch (error: any) {
          return {
            success: false,
            property_number: update.property_number,
            error: error.message
          };
        }
      })
    );
    
    results.push(...batchResults);
    
    // レート制限対策
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  return results;
}
```

#### 5. generatePublicURL()

```typescript
/**
 * 公開URLの自動生成
 * 
 * 格納先URLから公開物件サイトのURLを生成。
 * 
 * @param storageLocation Google Drive格納先URL
 * @returns 公開URL (生成できない場合はnull)
 */
private generatePublicURL(storageLocation: string | null): string | null {
  if (!storageLocation) return null;
  
  // Google DriveのフォルダIDを抽出
  const folderIdMatch = storageLocation.match(/folders\/([a-zA-Z0-9_-]+)/);
  
  if (!folderIdMatch) return null;
  
  const folderId = folderIdMatch[1];
  
  // 公開URLを生成
  return `${process.env.FRONTEND_URL}/public/properties/${folderId}`;
}
```

### バッチ同期スクリプト

#### sync-all-atbb-status.ts

```typescript
/**
 * 全物件のATBB状態を一括同期
 * 
 * 使用方法:
 *   npx ts-node sync-all-atbb-status.ts
 * 
 * オプション:
 *   --dry-run    実際の更新は行わず、差分のみ表示
 *   --limit N    処理する物件数を制限
 */

import * as dotenv from 'dotenv';
dotenv.config();

import { PropertyListingSyncService } from './src/services/PropertyListingSyncService';
import { GoogleSheetsClient } from './src/services/GoogleSheetsClient';

async function syncAllATBBStatus() {
  console.log('🔄 全物件ATBB状態同期\n');
  console.log('='.repeat(80));
  
  const dryRun = process.argv.includes('--dry-run');
  const limitIndex = process.argv.indexOf('--limit');
  const limit = limitIndex >= 0 ? parseInt(process.argv[limitIndex + 1]) : undefined;
  
  if (dryRun) {
    console.log('⚠️  DRY RUN MODE: 実際の更新は行いません\n');
  }
  
  if (limit) {
    console.log(`⚠️  LIMIT: ${limit}件のみ処理します\n`);
  }
  
  try {
    // 1. サービス初期化
    const sheetsClient = new GoogleSheetsClient({
      spreadsheetId: process.env.PROPERTY_LIST_SPREADSHEET_ID!,
      sheetName: '物件',
      serviceAccountKeyPath: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH!
    });
    
    await sheetsClient.authenticate();
    
    const syncService = new PropertyListingSyncService(sheetsClient);
    
    // 2. ATBB状態同期実行
    const result = await syncService.syncATBBStatus({
      dryRun,
      limit
    });
    
    // 3. 結果表示
    console.log('\n📊 同期結果:');
    console.log(`  対象物件数: ${result.total}`);
    console.log(`  更新成功: ${result.updated}`);
    console.log(`  更新失敗: ${result.failed}`);
    console.log(`  処理時間: ${(result.duration_ms / 1000).toFixed(2)}秒`);
    
    if (result.failed > 0 && result.errors) {
      console.log('\n❌ 失敗した物件:');
      result.errors.forEach(err => {
        console.log(`  - ${err.property_number}: ${err.error}`);
      });
    }
    
    if (dryRun) {
      console.log('\n✅ DRY RUN完了 (実際の更新は行われていません)');
    } else {
      console.log('\n✅ 同期完了');
    }
    
  } catch (error: any) {
    console.error('\n❌ 同期失敗:', error.message);
    throw error;
  }
}

syncAllATBBStatus()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
```

## Error Handling

### エラーの種類と対処

1. **スプレッドシート読み取りエラー**
   - 原因: API制限、認証エラー
   - 対処: リトライ (exponential backoff)
   - ログ: エラー詳細を記録

2. **DB更新エラー**
   - 原因: 接続エラー、制約違反
   - 対処: 個別にスキップして処理継続
   - ログ: 失敗した物件番号とエラー内容

3. **格納先URL検証エラー**
   - 原因: 不正な形式、空値
   - 対処: スプレッドシートから再取得
   - ログ: 修正前後のURL

4. **公開URL生成エラー**
   - 原因: フォルダID抽出失敗
   - 対処: 公開URLをnullに設定
   - ログ: 警告レベルで記録

### リトライ戦略

```typescript
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3
): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      
      const delay = Math.pow(2, i) * 1000; // 1s, 2s, 4s
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw new Error('Max retries exceeded');
}
```

## Performance Considerations

### バッチ処理

- **バッチサイズ**: 10件
- **バッチ間遅延**: 100ms
- **理由**: Supabase API制限対策

### 差分検出の最適化

```typescript
// 全フィールド比較ではなく、ATBB関連フィールドのみ比較
const ATBB_FIELDS = ['atbb_status', 'storage_location'];

function detectATBBChanges(spreadsheetRow: any, dbProperty: any) {
  const changes: any = {};
  
  for (const field of ATBB_FIELDS) {
    const spreadsheetValue = normalizeValue(spreadsheetRow[field]);
    const dbValue = normalizeValue(dbProperty[field]);
    
    if (spreadsheetValue !== dbValue) {
      changes[field] = {
        old: dbValue,
        new: spreadsheetValue
      };
    }
  }
  
  return changes;
}
```

### メモリ使用量

- スプレッドシートデータは一度に全件読み込み
- DBデータも一度に全件読み込み
- 想定: 1000件 × 50フィールド = 約5MB
- 問題なし

## Security Considerations

### 認証・認可

- Google Sheets API: サービスアカウント認証
- Supabase: サービスキー使用
- 環境変数で管理

### データ検証

```typescript
function isValidDriveURL(url: string): boolean {
  // Google DriveのURL形式を検証
  const pattern = /^https:\/\/drive\.google\.com\/drive\/folders\/[a-zA-Z0-9_-]+/;
  return pattern.test(url);
}

function sanitizePropertyNumber(propertyNumber: string): string {
  // 物件番号のサニタイズ
  return propertyNumber.trim().toUpperCase();
}
```

## Monitoring & Logging

### ログレベル

- **INFO**: 同期開始・完了、処理件数
- **WARN**: 格納先URL修正、公開URL生成失敗
- **ERROR**: DB更新失敗、API呼び出し失敗

### メトリクス

```typescript
interface ATBBSyncMetrics {
  total_properties: number;
  properties_updated: number;
  properties_failed: number;
  storage_locations_fixed: number;
  public_urls_generated: number;
  duration_ms: number;
  errors: Array<{
    property_number: string;
    error: string;
  }>;
}
```

### ダッシュボード表示

- 最終同期日時
- 同期成功率
- 平均処理時間
- エラー発生件数

## Testing Strategy

### Unit Tests

```typescript
describe('PropertyListingSyncService - ATBB Sync', () => {
  describe('detectATBBUpdates', () => {
    it('should detect atbb_status changes', async () => {
      // テストケース
    });
    
    it('should detect storage_location changes', async () => {
      // テストケース
    });
    
    it('should ignore unchanged properties', async () => {
      // テストケース
    });
  });
  
  describe('validateStorageLocations', () => {
    it('should validate correct Drive URLs', () => {
      // テストケース
    });
    
    it('should fix invalid Drive URLs', async () => {
      // テストケース
    });
  });
  
  describe('generatePublicURL', () => {
    it('should generate public URL from storage location', () => {
      // テストケース
    });
    
    it('should return null for invalid storage location', () => {
      // テストケース
    });
  });
});
```

### Integration Tests

```typescript
describe('ATBB Sync Integration', () => {
  it('should sync AA9313 ATBB status', async () => {
    // AA9313の実データでテスト
  });
  
  it('should handle batch sync of 100 properties', async () => {
    // 大量データでのテスト
  });
  
  it('should integrate with EnhancedAutoSyncService', async () => {
    // 自動同期との統合テスト
  });
});
```

## Deployment Plan

### Phase 1: 実装 (2時間)

1. `PropertyListingSyncService`に新規メソッド追加
2. バッチ同期スクリプト作成
3. Unit tests作成

### Phase 2: テスト (1時間)

1. AA9313でテスト
2. 複数物件でテスト
3. エラーケースのテスト

### Phase 3: 統合 (1時間)

1. `EnhancedAutoSyncService`に統合
2. 自動同期のテスト
3. ログ・モニタリング確認

### Phase 4: 本番適用 (30分)

1. バッチ同期スクリプトで全物件同期
2. 結果確認
3. 自動同期有効化

## Rollback Plan

問題が発生した場合:

1. 自動同期を無効化
2. `sync_logs`から最終成功時刻を確認
3. 必要に応じてDBをロールバック
4. 原因調査・修正
5. 再度テスト後に有効化

## Success Criteria

- ✅ AA9313の公開URLがブラウザに表示される
- ✅ 全物件のATBB状態が自動同期される
- ✅ 格納先URLが正しく設定される
- ✅ 公開URLが自動生成される
- ✅ バックエンドの大量リクエストが解消される
- ✅ 同期処理が5分以内に完了する
- ✅ エラー率が1%未満

## Related Documents

- `requirements.md` - 要件定義
- `tasks.md` - タスク一覧 (次に作成)
- `backend/PROPERTY_LISTING_UPDATE_IMPLEMENTATION_PLAN.md` - 既存の実装計画
