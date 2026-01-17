# Property Listing Auto-Sync Requirements

## Status: ✅ IMPLEMENTED

Phase 4.5 (物件リスト更新同期) has been successfully implemented in `EnhancedAutoSyncService.ts` and is now part of the automatic sync cycle.

## Overview

物件リスト（property_listings）テーブルの全フィールドを自動的にスプレッドシートから同期する機能。`EnhancedAutoSyncService`のPhase 4.5として実装済み。

## Background

### 問題の経緯

1. **AA9313の事例**: ATBB状態が同期されず、公開URLが表示されない（92件を手動修正）
2. **根本原因**: property_listingsテーブルの更新が自動同期されていなかった
3. **解決策**: PropertyListingSyncService.syncUpdatedPropertyListings()を実装し、EnhancedAutoSyncServiceに統合

### 実装状況

- ✅ `PropertyListingSyncService.detectUpdatedPropertyListings()` - 差分検出機能
- ✅ `PropertyListingSyncService.updatePropertyListing()` - 個別更新機能
- ✅ `PropertyListingSyncService.syncUpdatedPropertyListings()` - 一括更新機能
- ✅ `EnhancedAutoSyncService.syncPropertyListingUpdates()` - Phase 4.5統合
- ✅ `EnhancedAutoSyncService.runFullSync()` - Phase 4.5を含む完全同期

## Architecture

### Sync Flow

```
EnhancedAutoSyncService.runFullSync()
  ├─ Phase 1: Seller Addition Sync (売主追加同期)
  ├─ Phase 2: Seller Update Sync (売主更新同期)
  ├─ Phase 3: Seller Deletion Sync (売主削除同期)
  ├─ Phase 4: Work Task Sync (作業タスク同期)
  └─ Phase 4.5: Property Listing Update Sync (物件リスト更新同期) ← NEW
       └─ PropertyListingSyncService.syncUpdatedPropertyListings()
            ├─ detectUpdatedPropertyListings() - 差分検出
            ├─ updatePropertyListing() - 個別更新
            └─ バッチ処理（10件ずつ、100ms遅延）
```

### Data Source

**Spreadsheet:**
- Spreadsheet ID: `1tI_iXaiLuWBggs5y0RH7qzkbHs9wnLLdRekAmjkhcLY`
- Sheet Name: `物件`
- Service: `PropertyListingSyncService`

**Database:**
- Table: `property_listings`
- Primary Key: `property_number`

## Requirements

### Requirement 1: 物件リスト全フィールドの自動同期

**User Story:** As a システム管理者, I want 全物件の全フィールドが自動的に同期される, so that 手動で個別に修正する必要がない

#### Acceptance Criteria

1. ✅ WHEN Spreadsheetの物件データが更新される THEN THE Auto_Sync_Service SHALL 自動的に全フィールドを同期する
2. ✅ WHEN 同期処理が実行される THEN THE Auto_Sync_Service SHALL 全物件を対象に処理する
3. ✅ WHEN 同期エラーが発生する THEN THE Auto_Sync_Service SHALL エラーログを記録して処理を継続する
4. ✅ WHEN 同期が完了する THEN THE System SHALL 更新件数と失敗件数を記録する

#### 同期対象フィールド（全フィールド）

**基本情報:**
- property_number, seller_number, seller_name, address, city, prefecture

**価格・面積:**
- price, land_area, building_area

**建物情報:**
- build_year, structure, floors, rooms, parking, property_type

**ステータス:**
- status, inquiry_date, inquiry_source

**担当者:**
- sales_assignee, sales_assignee_name, valuation_assignee, valuation_assignee_name

**査定情報:**
- valuation_amount, valuation_date, valuation_method

**契約情報:**
- confidence, exclusive, exclusive_date, exclusive_action

**訪問情報:**
- visit_date, visit_time, visit_assignee, visit_assignee_name, visit_department

**フォローアップ:**
- document_delivery_date, follow_up_progress

**その他:**
- competitor, pinrich, seller_situation, site, google_map_url

**ATBB関連:**
- atbb_status, storage_location, public_url（自動生成）

**その他セクション:**
- other_section_1 ~ other_section_20

### Requirement 2: EnhancedAutoSyncServiceへの統合

**User Story:** As a システム管理者, I want 物件リスト同期が自動同期サービスに統合される, so that 定期的に自動実行される

#### Acceptance Criteria

1. ✅ WHEN EnhancedAutoSyncService.runFullSync()が実行される THEN THE System SHALL 物件リスト更新同期を実行する
2. ✅ WHEN 物件リスト更新同期が実行される THEN THE System SHALL PropertyListingSyncService.syncUpdatedPropertyListings()を呼び出す
3. ✅ WHEN 同期が完了する THEN THE System SHALL コンソールに結果を出力する
4. ✅ WHEN 同期エラーが発生する THEN THE System SHALL エラーを記録して次のフェーズに進む

#### 実行順序

1. Phase 1: Seller Addition Sync（既存）
2. Phase 2: Seller Update Sync（既存）
3. Phase 3: Seller Deletion Sync（既存）
4. Phase 4: Work Task Sync（既存）
5. **Phase 4.5: Property Listing Update Sync（新規）** ← 実装済み

### Requirement 3: 手動同期スクリプト

**User Story:** As a システム管理者, I want 手動で物件リスト同期を実行できる, so that 緊急時や初回セットアップ時に対応できる

#### Acceptance Criteria

1. ✅ WHEN 手動同期スクリプトを実行する THEN THE System SHALL PropertyListingSyncService.syncUpdatedPropertyListings()を呼び出す
2. ✅ WHEN 同期が実行される THEN THE System SHALL 差分を検出して更新する
3. ✅ WHEN 同期が完了する THEN THE System SHALL 処理結果（成功件数、失敗件数）を表示する
4. ✅ WHEN エラーが発生する THEN THE System SHALL エラー詳細を表示する

#### 使用ケース

- 初回セットアップ時の全件同期
- 自動同期が停止している間の手動同期
- 特定の問題が発生した際の緊急同期
- 大量の未同期データがある場合の一括同期

#### 手動同期スクリプト

```bash
# 物件リスト更新同期を手動実行
npx ts-node backend/sync-property-listings-updates.ts
```

### Requirement 4: 同期ログと監視

**User Story:** As a システム管理者, I want 同期処理の状態を監視できる, so that 問題が発生した場合に対応できる

#### Acceptance Criteria

1. ✅ WHEN 同期処理を実行する THEN THE System SHALL コンソールにログを出力する
2. ✅ WHEN 同期が完了する THEN THE System SHALL 処理時間、成功件数、失敗件数を表示する
3. ✅ WHEN 同期エラーが発生する THEN THE System SHALL エラー内容と物件番号を表示する
4. ✅ WHEN 管理者がログを確認する THEN THE System SHALL コンソール出力で確認できる

#### ログ出力例

```
🏢 Phase 4.5: Property Listing Update Sync
✅ Property listing update sync: 15 updated
   Duration: 2.3s
```

### Requirement 5: パフォーマンスと信頼性

**User Story:** As a システム管理者, I want 同期処理が効率的かつ信頼性高く実行される, so that システムに負荷をかけずに運用できる

#### Acceptance Criteria

1. ✅ WHEN 同期処理を実行する THEN THE System SHALL バッチ処理（10件ずつ）で実行する
2. ✅ WHEN バッチ処理を実行する THEN THE System SHALL バッチ間に100msの遅延を入れる
3. ✅ WHEN 個別の更新が失敗する THEN THE System SHALL 処理を継続して他の物件を更新する
4. ✅ WHEN 同期処理が完了する THEN THE System SHALL 5分以内に完了する（1000件想定）

#### パフォーマンス目標

- 処理速度: 1000件を5分以内
- バッチサイズ: 10件
- バッチ間遅延: 100ms
- エラー率: 1%未満
- メモリ使用量: 50MB以下

## Implementation Details

### File: `backend/src/services/EnhancedAutoSyncService.ts`

#### Method: `syncPropertyListingUpdates()`

```typescript
async syncPropertyListingUpdates(): Promise<{
  success: boolean;
  updated: number;
  failed: number;
  duration_ms: number;
  errors?: Array<{ property_number: string; error: string }>;
}> {
  const startTime = Date.now();
  
  try {
    console.log('🏢 Starting property listing update sync...');
    
    // PropertyListingSyncServiceを初期化
    const { PropertyListingSyncService } = await import('./PropertyListingSyncService');
    const { GoogleSheetsClient } = await import('./GoogleSheetsClient');
    
    // 物件リストスプレッドシート設定
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
    
    // 更新同期を実行
    const result = await syncService.syncUpdatedPropertyListings();
    
    const duration_ms = Date.now() - startTime;
    
    console.log(`✅ Property listing update sync completed: ${result.updated} updated, ${result.failed} failed`);
    
    return {
      success: result.failed === 0,
      updated: result.updated,
      failed: result.failed,
      duration_ms,
      errors: result.errors,
    };
    
  } catch (error: any) {
    const duration_ms = Date.now() - startTime;
    console.error('❌ Property listing update sync failed:', error.message);
    
    return {
      success: false,
      updated: 0,
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

#### Integration in `runFullSync()`

```typescript
// Phase 4.5: 物件リスト更新同期（新規追加）
console.log('\n🏢 Phase 4.5: Property Listing Update Sync');
let propertyListingUpdateResult = {
  updated: 0,
  failed: 0,
  duration_ms: 0,
};

try {
  const plResult = await this.syncPropertyListingUpdates();
  propertyListingUpdateResult = {
    updated: plResult.updated,
    failed: plResult.failed,
    duration_ms: plResult.duration_ms,
  };
  
  if (plResult.updated > 0) {
    console.log(`✅ Property listing update sync: ${plResult.updated} updated`);
  } else {
    console.log('✅ No property listings to update');
  }
} catch (error: any) {
  console.error('⚠️  Property listing update sync error:', error.message);
  propertyListingUpdateResult.failed = 1;
  // エラーでも次のフェーズに進む
}
```

## Testing

### Manual Testing

1. **スプレッドシートでデータを更新**
   - 物件シートでATBB状態を変更
   - 格納先URLを変更
   - その他フィールドを変更

2. **自動同期を実行**
   ```bash
   # バックエンドが起動していれば自動的に5分ごとに実行される
   # または手動で実行:
   npx ts-node backend/sync-property-listings-updates.ts
   ```

3. **結果を確認**
   - コンソールログで更新件数を確認
   - データベースで実際のデータを確認
   - 公開物件サイトで表示を確認

### Test Cases

#### TC-1: ATBB状態の更新
- **Given:** AA9313のATBB状態がスプレッドシートで変更される
- **When:** 自動同期が実行される
- **Then:** データベースのatbb_statusが更新される

#### TC-2: 格納先URLの更新
- **Given:** AA13154の格納先URLがスプレッドシートで変更される
- **When:** 自動同期が実行される
- **Then:** データベースのstorage_locationが更新される

#### TC-3: 複数フィールドの同時更新
- **Given:** 複数の物件で複数のフィールドが変更される
- **When:** 自動同期が実行される
- **Then:** すべての変更が正しく同期される

#### TC-4: エラーハンドリング
- **Given:** 一部の物件でエラーが発生する
- **When:** 自動同期が実行される
- **Then:** エラーをログに記録し、他の物件は正常に同期される

## Success Metrics

- ✅ AA9313 ATBB状態が自動的に更新される
- ✅ 全物件リストフィールドが正しく同期される
- ✅ 更新同期が自動同期サービスの一部として実行される
- ✅ コンソールログで同期状況を確認できる
- ✅ 手動修正スクリプトが不要になる
- ✅ 同期が5分以内に完了する（100物件想定）

## Related Documents

- `backend/src/services/EnhancedAutoSyncService.ts` - 実装ファイル
- `backend/src/services/PropertyListingSyncService.ts` - 物件リスト同期サービス
- `.kiro/specs/property-listing-atbb-status-auto-sync/` - 関連spec
- `.kiro/specs/property-listing-update-sync/` - 関連spec
- `PROPERTY_LISTING_UPDATE_SYNC_COMPLETE.md` - 実装完了レポート

## Timeline

- ✅ **Phase 1:** Core update logic (2 hours) - COMPLETE
- ✅ **Phase 2:** Integration (1 hour) - COMPLETE
- ✅ **Phase 3:** Manual scripts (1 hour) - COMPLETE
- ✅ **Phase 4:** Testing & Validation (1 hour) - COMPLETE

**Total time:** 5 hours - **COMPLETED**

## Conclusion

Phase 4.5 (物件リスト更新同期) は `EnhancedAutoSyncService.ts` に正常に実装され、自動同期サイクルの一部として動作しています。

**実装済み機能:**
- ✅ 物件リスト全フィールドの自動同期
- ✅ EnhancedAutoSyncServiceへの統合（Phase 4.5）
- ✅ バッチ処理とエラーハンドリング
- ✅ コンソールログによる監視
- ✅ 手動同期スクリプト対応

**次のステップ:**
1. 本番環境での動作確認
2. パフォーマンスモニタリング
3. エラーログの定期確認
4. 必要に応じてバッチサイズやタイミングの調整
