# 物件リスト同期問題診断 - Design Document

## Overview

このドキュメントは、物件リスト同期が動作していない問題の診断アプローチと、解決策の設計を説明します。

---

## Problem Statement

### 症状

1. **新規物件の同期失敗**
   - AA13226等の物件がスプレッドシートには存在する
   - しかしデータベースには存在しない

2. **既存物件の更新同期失敗**
   - AA4885はデータベースに存在する
   - しかしATBB状況の更新が21日間反映されていない

### 既知の事実

- ✅ Phase 4.5 (物件リスト更新同期) は実装済み
- ✅ 手動実行スクリプトは正常に動作（8件更新確認済み）
- ❌ 定期同期マネージャーが起動していない
- ❌ sync_logsテーブルに記録が0件

---

## Root Cause Analysis

### 仮説1: バックエンドサーバーが再起動されていない（最も可能性が高い）

**証拠**:
- sync_logsに記録が0件
- 定期同期マネージャーが実行中でない
- 手動実行は成功する

**原因**:
`backend/src/index.ts` で定期同期マネージャーを起動するコードは実装済みだが、バックエンドサーバーが再起動されていないため、起動処理が実行されていない。

**解決策**:
バックエンドサーバーを再起動する。

**確信度**: 95%

---

### 仮説2: 新規物件追加機能が不足している

**証拠**:
- AA13226がスプレッドシートに存在するがDBに存在しない
- Phase 4.5は「更新同期」であり「新規追加」ではない

**原因**:
PropertyListingSyncServiceに新規物件を追加する機能が実装されていない可能性。

**解決策**:
- PropertyListingSyncService.syncNewPropertyListings()を実装
- EnhancedAutoSyncServiceにPhase 4.6として統合

**確信度**: 60%

---

### 仮説3: sync_logsテーブルが存在しない

**証拠**:
- sync_logsテーブルへのアクセスでエラーが発生する可能性

**原因**:
Migration 039が実行されていない。

**解決策**:
```bash
npx ts-node backend/migrations/run-039-migration.ts
```

**確信度**: 20%

---

## Architecture

### Current Implementation

```
┌─────────────────────────────────────────────────────────────┐
│                  EnhancedAutoSyncService                     │
│                                                              │
│  runFullSync()                                               │
│    ├─ Phase 1: Seller Addition Sync                         │
│    ├─ Phase 2: Seller Update Sync                           │
│    ├─ Phase 3: Seller Deletion Sync                         │
│    ├─ Phase 4: Work Task Sync                               │
│    └─ Phase 4.5: Property Listing Update Sync ✅            │
│         └─ syncPropertyListingUpdates()                     │
│              │                                               │
│              └─ PropertyListingSyncService                  │
│                   └─ syncUpdatedPropertyListings()          │
│                        ├─ Detect changes                    │
│                        └─ Update existing properties        │
└──────────────────────────────────────────────────────────────┘
```

### Problem: Missing New Property Addition

```
❌ Phase 4.6: Property Listing Addition Sync (NOT IMPLEMENTED)
     └─ syncPropertyListingAdditions()
          └─ PropertyListingSyncService
               └─ syncNewPropertyListings()
                    ├─ Detect new properties
                    └─ Add new properties
```

---

## Diagnostic Flow

```
開始
  ↓
[Task 1.1] 自動同期サービスの状態確認
  ↓
定期同期マネージャーが実行中?
  ├─ Yes → [Task 1.4] sync_logsを確認
  │         ↓
  │       記録がある?
  │         ├─ Yes → 別の問題（詳細調査）
  │         └─ No → バックエンド再起動が必要
  │
  └─ No → [Task 2.1] バックエンドサーバーの起動状態確認
            ↓
          バックエンドが起動している?
            ├─ No → バックエンドを起動
            └─ Yes → バックエンドを再起動
                      ↓
                    [Task 3.1] バックエンドサーバーの再起動
                      ↓
                    [Task 4.1] 自動同期の動作確認
                      ↓
                    5分待機
                      ↓
                    sync_logsに記録がある?
                      ├─ Yes → ✅ 解決
                      └─ No → 別の問題（詳細調査）
```

---

## Solution Design

### Solution 1: Restart Backend Server (Immediate)

**目的**: 定期同期マネージャーを起動する

**実装**:
```bash
cd backend
npm run dev
```

**期待される動作**:
1. バックエンドサーバーが起動
2. 5秒後に定期同期マネージャーが開始
3. 初回同期が実行される
4. 5分ごとに自動同期が実行される

**影響範囲**:
- バックエンドサーバーの再起動（数秒のダウンタイム）
- 既存データへの影響なし

**リスク**: 低

---

### Solution 2: Implement New Property Addition (If Needed)

**目的**: 新規物件を自動的に追加する機能を実装

**実装**:

#### Step 1: PropertyListingSyncService に新規追加メソッドを追加

```typescript
// backend/src/services/PropertyListingSyncService.ts

async syncNewPropertyListings(): Promise<{
  added: number;
  failed: number;
  errors?: Array<{ property_number: string; error: string }>;
}> {
  console.log('🔍 Detecting new property listings...');
  
  // 1. スプレッドシートから全物件を取得
  const sheetData = await this.sheetsClient.readAll();
  const sheetPropertyNumbers = new Set(
    sheetData
      .map(row => row['物件番号'])
      .filter(Boolean)
  );
  
  // 2. データベースから全物件番号を取得
  const { data: dbProperties } = await this.supabase
    .from('property_listings')
    .select('property_number');
  
  const dbPropertyNumbers = new Set(
    dbProperties?.map(p => p.property_number) || []
  );
  
  // 3. スプレッドシートにあってDBにない物件を検出
  const newPropertyNumbers = Array.from(sheetPropertyNumbers)
    .filter(pn => !dbPropertyNumbers.has(pn));
  
  console.log(`📊 Found ${newPropertyNumbers.length} new properties to add`);
  
  if (newPropertyNumbers.length === 0) {
    return { added: 0, failed: 0 };
  }
  
  // 4. 新規物件を追加
  let added = 0;
  let failed = 0;
  const errors: Array<{ property_number: string; error: string }> = [];
  
  // バッチ処理（10件ずつ）
  const BATCH_SIZE = 10;
  for (let i = 0; i < newPropertyNumbers.length; i += BATCH_SIZE) {
    const batch = newPropertyNumbers.slice(i, i + BATCH_SIZE);
    
    for (const propertyNumber of batch) {
      try {
        // スプレッドシートから該当物件のデータを取得
        const sheetRow = sheetData.find(
          row => row['物件番号'] === propertyNumber
        );
        
        if (!sheetRow) {
          throw new Error('Property not found in spreadsheet');
        }
        
        // データベースに追加
        await this.addPropertyListing(sheetRow);
        added++;
        console.log(`✅ ${propertyNumber}: Added`);
      } catch (error: any) {
        failed++;
        errors.push({
          property_number: propertyNumber,
          error: error.message,
        });
        console.error(`❌ ${propertyNumber}: ${error.message}`);
      }
    }
    
    // バッチ間の遅延（100ms）
    if (i + BATCH_SIZE < newPropertyNumbers.length) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  
  console.log(`✅ New property addition completed: ${added} added, ${failed} failed`);
  
  return { added, failed, errors };
}

private async addPropertyListing(sheetRow: any): Promise<void> {
  // PropertyListingColumnMapperを使用してデータを変換
  const mappedData = this.columnMapper.mapRowToDatabase(sheetRow);
  
  // public_urlを生成
  if (mappedData.property_number) {
    mappedData.public_url = `https://your-domain.com/properties/${mappedData.property_number}`;
  }
  
  // データベースに挿入
  const { error } = await this.supabase
    .from('property_listings')
    .insert(mappedData);
  
  if (error) {
    throw new Error(`Database insert failed: ${error.message}`);
  }
}
```

#### Step 2: EnhancedAutoSyncService に Phase 4.6 を追加

```typescript
// backend/src/services/EnhancedAutoSyncService.ts

async syncPropertyListingAdditions(): Promise<{
  success: boolean;
  added: number;
  failed: number;
  duration_ms: number;
  errors?: Array<{ property_number: string; error: string }>;
}> {
  const startTime = Date.now();
  
  try {
    console.log('🏢 Starting property listing addition sync...');
    
    // PropertyListingSyncServiceを初期化
    const { PropertyListingSyncService } = await import('./PropertyListingSyncService');
    const { GoogleSheetsClient } = await import('./GoogleSheetsClient');
    
    const PROPERTY_LIST_SPREADSHEET_ID = '1tI_iXaiLuWBggs5y0RH7qzkbHs9wnLLdRekAmjkhcLY';
    const PROPERTY_LIST_SHEET_NAME = '物件';
    
    const sheetsConfig = {
      spreadsheetId: PROPERTY_LIST_SPREADSHEET_ID,
      sheetName: PROPERTY_LIST_SHEET_NAME,
      serviceAccountKeyPath: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH || './google-service-account.json',
    };
    
    const sheetsClient = new GoogleSheetsClient(sheetsConfig);
    await sheetsClient.authenticate();
    
    const syncService = new PropertyListingSyncService(sheetsClient);
    
    // 新規追加同期を実行
    const result = await syncService.syncNewPropertyListings();
    
    const duration_ms = Date.now() - startTime;
    
    console.log(`✅ Property listing addition sync completed: ${result.added} added, ${result.failed} failed`);
    
    return {
      success: result.failed === 0,
      added: result.added,
      failed: result.failed,
      duration_ms,
      errors: result.errors,
    };
    
  } catch (error: any) {
    const duration_ms = Date.now() - startTime;
    console.error('❌ Property listing addition sync failed:', error.message);
    
    return {
      success: false,
      added: 0,
      failed: 1,
      duration_ms,
      errors: [{
        property_number: 'SYSTEM',
        error: error.message,
      }],
    };
  }
}
```

#### Step 3: runFullSync() に Phase 4.6 を統合

```typescript
// backend/src/services/EnhancedAutoSyncService.ts

async runFullSync(trigger: string = 'scheduled'): Promise<SyncResult> {
  // ... 既存のフェーズ ...
  
  // Phase 4.5: 物件リスト更新同期
  console.log('\n🏢 Phase 4.5: Property Listing Update Sync');
  let propertyListingUpdateResult = {
    updated: 0,
    failed: 0,
    duration_ms: 0,
  };
  
  try {
    const plUpdateResult = await this.syncPropertyListingUpdates();
    propertyListingUpdateResult = {
      updated: plUpdateResult.updated,
      failed: plUpdateResult.failed,
      duration_ms: plUpdateResult.duration_ms,
    };
    
    if (plUpdateResult.updated > 0) {
      console.log(`✅ Property listing update sync: ${plUpdateResult.updated} updated`);
    } else {
      console.log('✅ No property listings to update');
    }
  } catch (error: any) {
    console.error('⚠️  Property listing update sync error:', error.message);
    propertyListingUpdateResult.failed = 1;
  }
  
  // Phase 4.6: 物件リスト新規追加同期（新規追加）
  console.log('\n🏢 Phase 4.6: Property Listing Addition Sync');
  let propertyListingAdditionResult = {
    added: 0,
    failed: 0,
    duration_ms: 0,
  };
  
  try {
    const plAddResult = await this.syncPropertyListingAdditions();
    propertyListingAdditionResult = {
      added: plAddResult.added,
      failed: plAddResult.failed,
      duration_ms: plAddResult.duration_ms,
    };
    
    if (plAddResult.added > 0) {
      console.log(`✅ Property listing addition sync: ${plAddResult.added} added`);
    } else {
      console.log('✅ No new property listings to add');
    }
  } catch (error: any) {
    console.error('⚠️  Property listing addition sync error:', error.message);
    propertyListingAdditionResult.failed = 1;
  }
  
  // ... 残りのフェーズ ...
}
```

**影響範囲**:
- PropertyListingSyncService: 新規メソッド追加
- EnhancedAutoSyncService: Phase 4.6追加
- 既存の機能への影響なし

**リスク**: 低

---

## Testing Strategy

### Unit Testing

```typescript
// backend/src/services/__tests__/PropertyListingSyncService.newAddition.test.ts

describe('PropertyListingSyncService - New Property Addition', () => {
  it('should detect new properties', async () => {
    // スプレッドシートにAA13226が存在
    // データベースにAA13226が存在しない
    // → AA13226が検出される
  });
  
  it('should add new properties to database', async () => {
    // AA13226を追加
    // → データベースに存在することを確認
  });
  
  it('should handle errors gracefully', async () => {
    // 一部の物件でエラーが発生
    // → エラーをログに記録し、他の物件は正常に追加
  });
});
```

### Integration Testing

```bash
# 手動テスト
cd backend
npx ts-node test-new-property-addition.ts

# 期待される出力:
# 🔍 Detecting new property listings...
# 📊 Found 1 new properties to add
# ✅ AA13226: Added
# ✅ New property addition completed: 1 added, 0 failed
```

### End-to-End Testing

1. スプレッドシートに新規物件を追加
2. バックエンドサーバーを起動
3. 5分待機
4. データベースに新規物件が追加されることを確認

---

## Monitoring and Logging

### Console Logs

```
🔄 Starting full sync (triggered by: scheduled)
🏢 Phase 4.5: Property Listing Update Sync
✅ Property listing update sync: 8 updated
🏢 Phase 4.6: Property Listing Addition Sync
✅ Property listing addition sync: 1 added
```

### sync_logs Table

```sql
INSERT INTO sync_logs (
  sync_type,
  started_at,
  completed_at,
  status,
  properties_updated,
  properties_failed,
  error_details
) VALUES (
  'property_listing_addition',
  NOW(),
  NOW(),
  'success',
  1,
  0,
  NULL
);
```

---

## Performance Considerations

### Batch Processing

- バッチサイズ: 10件
- バッチ間遅延: 100ms
- 推定処理時間: 1000件で約5分

### Memory Usage

- スプレッドシートデータ: ~10MB
- データベースクエリ: ~5MB
- 合計: ~15MB

### API Rate Limits

- Google Sheets API: 100 requests/100 seconds
- Supabase: 無制限（サービスキー使用時）

---

## Rollback Plan

### If Backend Restart Fails

1. バックエンドサーバーを停止
2. ログを確認してエラーを特定
3. 問題を修正
4. 再度起動

### If New Property Addition Causes Issues

1. Phase 4.6を一時的に無効化
   ```typescript
   // EnhancedAutoSyncService.ts
   // Phase 4.6をコメントアウト
   ```
2. バックエンドサーバーを再起動
3. 問題を修正
4. Phase 4.6を再度有効化

---

## Security Considerations

### Data Validation

- 物件番号の形式を検証（AA + 数字）
- 必須フィールドの存在を確認
- SQLインジェクション対策（Supabaseクライアント使用）

### Authentication

- Google Sheets API: サービスアカウント認証
- Supabase: サービスキー認証
- 認証情報は環境変数で管理

---

## Deployment Checklist

### Before Deployment

- [ ] バックエンドサーバーが停止していることを確認
- [ ] 環境変数が正しく設定されていることを確認
- [ ] Google認証ファイルが存在することを確認

### During Deployment

- [ ] バックエンドサーバーを起動
- [ ] 起動ログで定期同期マネージャーの起動を確認
- [ ] 5秒後に初回同期が実行されることを確認

### After Deployment

- [ ] sync_logsテーブルに記録が追加されることを確認
- [ ] AA4885のATBB状況が更新されることを確認
- [ ] AA13226がデータベースに追加されることを確認（新規追加機能がある場合）

---

## Conclusion

### Recommended Approach

1. **まずバックエンドサーバーを再起動**（Solution 1）
   - 最も可能性が高い原因
   - 実装不要
   - リスクが低い

2. **5分待機して動作確認**
   - sync_logsに記録が追加されるか確認
   - AA4885が更新されるか確認

3. **AA13226が追加されない場合**
   - 新規物件追加機能を実装（Solution 2）
   - Phase 4.6として統合
   - テストして動作確認

### Expected Outcome

- ✅ 自動同期が5分ごとに実行される
- ✅ AA4885のATBB状況が自動的に更新される
- ✅ AA13226がデータベースに追加される（新規追加機能がある場合）
- ✅ 今後、手動修正が不要になる

### Timeline

- **Solution 1 (バックエンド再起動)**: 5分
- **Solution 2 (新規追加機能実装)**: 2時間（必要な場合のみ）
- **検証**: 20分

**合計**: 25分〜2時間25分
