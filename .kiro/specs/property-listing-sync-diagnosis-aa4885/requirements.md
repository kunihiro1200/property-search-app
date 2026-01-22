# AA4885 物件リスト同期問題 診断Spec

## 📋 概要

**Status**: 🔍 診断準備完了  
**作成日**: 2026-01-11  
**問題**: AA4885の物件リストのATBB状態がスプレッドシートと同期されていない  
**優先度**: 高（緊急）

## 🎯 目的

AA4885の物件リストのATBB状態が同期更新されていない問題を診断し、根本原因を特定して修正する。

## 問題の定義

### 症状

AA4885の物件リストで、スプレッドシートのATBB状態がデータベースに反映されていない。

**具体的な問題**:
- スプレッドシートでATBB状態を更新しても、データベースに反映されない
- 公開物件サイトで正しい状態が表示されない
- 手動修正が必要な状態が続いている

### 影響範囲

- AA4885だけでなく、他の物件にも同様の問題が存在する可能性がある
- 自動同期が正常に動作していない可能性がある
- データの整合性が保たれていない

## User Stories

### US-1: AA4885の同期状態診断

**As a** システム管理者  
**I want to** AA4885の現在の同期状態を詳細に診断したい  
**So that** 同期が失敗している原因を特定できる

**受入基準:**
- [x] AA4885のスプレッドシート上のATBB状態を取得できる
- [x] AA4885のデータベース上のATBB状態を取得できる
- [x] 両者の差分を明確に表示できる
- [x] 最終同期日時を確認できる
- [x] 同期エラーログを確認できる

**実装済み**: `backend/diagnose-specific-property-sync.ts`

### US-2: 自動同期の動作確認

**As a** システム管理者  
**I want to** 自動同期サービスが正常に動作しているか確認したい  
**So that** 自動同期の問題か、個別の物件の問題かを切り分けられる

**受入基準:**
- [ ] EnhancedAutoSyncServiceの初期化状態を確認できる
- [ ] 定期同期マネージャーの実行状態を確認できる
- [ ] 最後の同期実行時刻を確認できる
- [ ] sync_logsテーブルの内容を確認できる
- [ ] AUTO_SYNC_ENABLED環境変数の設定を確認できる

### US-3: AA4885の手動同期実行

**As a** システム管理者  
**I want to** AA4885を手動で同期実行できる  
**So that** 即座に最新状態に更新できる

**受入基準:**
- [ ] AA4885を指定して同期を実行できる
- [ ] 同期の進行状況を確認できる
- [ ] 同期完了後、結果を確認できる
- [ ] エラーが発生した場合、詳細なエラーメッセージを表示できる

### US-4: 全物件の同期状態チェック

**As a** システム管理者  
**I want to** AA4885以外にも同期問題がある物件を発見したい  
**So that** 全体的な同期の健全性を確認できる

**受入基準:**
- [ ] 全物件のスプレッドシートとデータベースの差分を検出できる
- [ ] 差分がある物件のリストを取得できる
- [ ] 差分の内容(どのフィールドが異なるか)を確認できる
- [ ] 一括で同期を実行できる

## Technical Requirements

### TR-1: AA4885診断スクリプト

**目的**: AA4885の現在の状態を詳細に診断する

**実装内容**:

```typescript
// backend/diagnose-aa4885-property-listing-sync.ts

import { createClient } from '@supabase/supabase-js';
import { GoogleSheetsClient } from './src/services/GoogleSheetsClient';

async function diagnoseAA4885() {
  console.log('=== AA4885 物件リスト同期診断 ===\n');
  
  const propertyNumber = 'AA4885';
  
  // 1. スプレッドシートのデータ取得
  console.log('1. スプレッドシートのデータ');
  const sheetsClient = new GoogleSheetsClient({
    spreadsheetId: '1tI_iXaiLuWBggs5y0RH7qzkbHs9wnLLdRekAmjkhcLY',
    sheetName: '物件',
    serviceAccountKeyPath: './google-service-account.json',
  });
  
  await sheetsClient.authenticate();
  const allData = await sheetsClient.readAll();
  const sheetRow = allData.find(row => row['物件番号'] === propertyNumber);
  
  if (!sheetRow) {
    console.log('❌ スプレッドシートに存在しません');
    return;
  }
  
  console.log('✅ スプレッドシートに存在');
  console.log(`   ATBB状況: "${sheetRow['atbb成約済み/非公開']}"`);
  console.log(`   状況: "${sheetRow['状況']}"`);
  console.log(`   格納先URL: "${sheetRow['格納先URL']}"`);
  console.log('');
  
  // 2. データベースのデータ取得
  console.log('2. データベースのデータ');
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );
  
  const { data: dbData, error } = await supabase
    .from('property_listings')
    .select('*')
    .eq('property_number', propertyNumber)
    .single();
  
  if (error || !dbData) {
    console.log('❌ データベースに存在しません');
    console.log(`   エラー: ${error?.message}`);
    return;
  }
  
  console.log('✅ データベースに存在');
  console.log(`   ATBB状況: "${dbData.atbb_status}"`);
  console.log(`   状況: "${dbData.status}"`);
  console.log(`   格納先URL: "${dbData.storage_location}"`);
  console.log(`   最終更新: ${dbData.updated_at}`);
  console.log('');
  
  // 3. 差分の確認
  console.log('3. 差分の確認');
  const differences = [];
  
  if (sheetRow['atbb成約済み/非公開'] !== dbData.atbb_status) {
    differences.push({
      field: 'ATBB状況',
      sheet: sheetRow['atbb成約済み/非公開'],
      db: dbData.atbb_status
    });
  }
  
  if (sheetRow['状況'] !== dbData.status) {
    differences.push({
      field: '状況',
      sheet: sheetRow['状況'],
      db: dbData.status
    });
  }
  
  if (sheetRow['格納先URL'] !== dbData.storage_location) {
    differences.push({
      field: '格納先URL',
      sheet: sheetRow['格納先URL'],
      db: dbData.storage_location
    });
  }
  
  if (differences.length === 0) {
    console.log('✅ 差分なし - データは一致しています');
  } else {
    console.log(`❌ ${differences.length}件の差分が見つかりました:`);
    differences.forEach(diff => {
      console.log(`\n   ${diff.field}:`);
      console.log(`   スプレッドシート: "${diff.sheet}"`);
      console.log(`   データベース: "${diff.db}"`);
    });
  }
  console.log('');
  
  // 4. 同期ログの確認
  console.log('4. 同期ログの確認');
  const { data: logs } = await supabase
    .from('sync_logs')
    .select('*')
    .eq('sync_type', 'property_listing_update')
    .order('started_at', { ascending: false })
    .limit(5);
  
  if (!logs || logs.length === 0) {
    console.log('❌ 同期ログが見つかりません');
    console.log('   → 自動同期が一度も実行されていない可能性があります');
  } else {
    console.log(`✅ 同期ログ: ${logs.length}件`);
    console.log(`   最終実行: ${logs[0].started_at}`);
    console.log(`   ステータス: ${logs[0].status}`);
    if (logs[0].properties_updated) {
      console.log(`   更新件数: ${logs[0].properties_updated}`);
    }
  }
  console.log('');
  
  // 5. 診断結果のサマリー
  console.log('=== 診断結果サマリー ===');
  
  if (differences.length > 0) {
    console.log('❌ AA4885のデータに不一致があります');
    console.log('');
    console.log('推奨される対応:');
    console.log('1. 手動で即座に同期する場合:');
    console.log('   npx ts-node backend/force-sync-property.ts AA4885');
    console.log('');
    console.log('2. 自動同期を確認する場合:');
    console.log('   npx ts-node backend/diagnose-auto-sync-service.ts');
    console.log('');
  } else {
    console.log('✅ AA4885のデータは一致しています');
  }
}

diagnoseAA4885().catch(console.error);
```

### TR-2: 自動同期サービス診断スクリプト

**目的**: 自動同期サービスの動作状態を確認する

**実装内容**:

```typescript
// backend/diagnose-auto-sync-service.ts

async function diagnoseAutoSync() {
  console.log('=== 自動同期サービス診断 ===\n');
  
  // 1. 環境変数の確認
  console.log('1. 環境変数の確認');
  console.log(`AUTO_SYNC_ENABLED: ${process.env.AUTO_SYNC_ENABLED}`);
  console.log(`SUPABASE_URL: ${process.env.SUPABASE_URL ? '設定済み' : '未設定'}`);
  console.log(`GOOGLE_SERVICE_ACCOUNT_KEY_PATH: ${process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH ? '設定済み' : '未設定'}`);
  console.log('');
  
  // 2. バックエンドプロセスの確認
  console.log('2. バックエンドプロセスの確認');
  console.log('   ※ 手動で確認してください:');
  console.log('   - バックエンドサーバーが起動しているか');
  console.log('   - 起動ログに "EnhancedAutoSyncService initialized" が表示されているか');
  console.log('   - 起動ログに "Enhanced periodic auto-sync enabled" が表示されているか');
  console.log('');
  
  // 3. sync_logsテーブルの確認
  console.log('3. 同期ログの確認');
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );
  
  const { data: logs } = await supabase
    .from('sync_logs')
    .select('*')
    .order('started_at', { ascending: false })
    .limit(10);
  
  if (!logs || logs.length === 0) {
    console.log('❌ 同期ログが見つかりません');
    console.log('   → 自動同期が一度も実行されていない可能性があります');
  } else {
    console.log(`✅ 同期ログ: ${logs.length}件`);
    
    // 各同期タイプの最終実行時刻を表示
    const syncTypes = ['seller_addition', 'seller_update', 'seller_deletion', 'work_task', 'property_listing_update'];
    
    syncTypes.forEach(syncType => {
      const log = logs.find(l => l.sync_type === syncType);
      if (log) {
        console.log(`   ${syncType}: ${log.started_at} (${log.status})`);
      } else {
        console.log(`   ${syncType}: ログなし`);
      }
    });
  }
  console.log('');
  
  // 4. 診断結果のサマリー
  console.log('=== 診断結果サマリー ===');
  
  if (!logs || logs.length === 0) {
    console.log('❌ 自動同期が実行されていません');
    console.log('');
    console.log('推奨される対応:');
    console.log('1. バックエンドサーバーを再起動してください');
    console.log('   cd backend && npm run dev');
    console.log('');
    console.log('2. 起動ログで以下を確認してください:');
    console.log('   ✅ EnhancedAutoSyncService initialized');
    console.log('   📊 Enhanced periodic auto-sync enabled');
    console.log('');
  } else {
    const lastSync = new Date(logs[0].started_at);
    const now = new Date();
    const minutesSinceLastSync = Math.floor((now.getTime() - lastSync.getTime()) / 60000);
    
    if (minutesSinceLastSync > 10) {
      console.log(`⚠️  最後の同期から${minutesSinceLastSync}分経過しています`);
      console.log('   通常は5分ごとに実行されるはずです');
      console.log('');
      console.log('推奨される対応:');
      console.log('- バックエンドサーバーを再起動してください');
    } else {
      console.log('✅ 自動同期は正常に動作しています');
    }
  }
}

diagnoseAutoSync().catch(console.error);
```

### TR-3: AA4885手動同期スクリプト

**目的**: AA4885を手動で同期する

**実装内容**:

```typescript
// backend/force-sync-aa4885.ts

import { PropertyListingSyncService } from './src/services/PropertyListingSyncService';
import { GoogleSheetsClient } from './src/services/GoogleSheetsClient';

async function forceSyncAA4885() {
  console.log('=== AA4885 手動同期実行 ===\n');
  
  const propertyNumber = 'AA4885';
  
  try {
    // PropertyListingSyncServiceを初期化
    const sheetsClient = new GoogleSheetsClient({
      spreadsheetId: '1tI_iXaiLuWBggs5y0RH7qzkbHs9wnLLdRekAmjkhcLY',
      sheetName: '物件',
      serviceAccountKeyPath: './google-service-account.json',
    });
    
    await sheetsClient.authenticate();
    const syncService = new PropertyListingSyncService(sheetsClient);
    
    console.log(`🔄 ${propertyNumber}の同期を開始します...`);
    
    // 特定の物件を同期
    const result = await syncService.syncSpecificProperty(propertyNumber);
    
    if (result.success) {
      console.log(`✅ ${propertyNumber}の同期が完了しました`);
      console.log(`   更新されたフィールド: ${result.updatedFields?.join(', ')}`);
    } else {
      console.log(`❌ ${propertyNumber}の同期に失敗しました`);
      console.log(`   エラー: ${result.error}`);
    }
    
  } catch (error: any) {
    console.error('❌ 同期処理中にエラーが発生しました:', error.message);
  }
}

forceSyncAA4885().catch(console.error);
```

### TR-4: 全物件同期状態チェックスクリプト

**目的**: AA4885以外にも同期問題がある物件を発見する

**実装内容**:

```typescript
// backend/check-all-property-sync-status.ts

async function checkAllPropertySyncStatus() {
  console.log('=== 全物件同期状態チェック ===\n');
  
  // スプレッドシートから全データを取得
  const sheetsClient = new GoogleSheetsClient({
    spreadsheetId: '1tI_iXaiLuWBggs5y0RH7qzkbHs9wnLLdRekAmjkhcLY',
    sheetName: '物件',
    serviceAccountKeyPath: './google-service-account.json',
  });
  
  await sheetsClient.authenticate();
  const sheetData = await sheetsClient.readAll();
  
  console.log(`📊 スプレッドシート: ${sheetData.length}件の物件`);
  
  // データベースから全データを取得
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );
  
  const { data: dbData } = await supabase
    .from('property_listings')
    .select('property_number, atbb_status, status, storage_location, updated_at');
  
  console.log(`💾 データベース: ${dbData?.length || 0}件の物件`);
  console.log('');
  
  // 差分をチェック
  console.log('🔍 差分チェック中...');
  const mismatches = [];
  
  for (const row of sheetData) {
    const propertyNumber = row['物件番号'];
    if (!propertyNumber) continue;
    
    const dbRow = dbData?.find(d => d.property_number === propertyNumber);
    if (!dbRow) {
      mismatches.push({
        propertyNumber,
        issue: 'データベースに存在しない',
      });
      continue;
    }
    
    const sheetAtbb = row['atbb成約済み/非公開'];
    const dbAtbb = dbRow.atbb_status;
    
    if (sheetAtbb !== dbAtbb) {
      mismatches.push({
        propertyNumber,
        issue: 'ATBB状況が不一致',
        sheet: sheetAtbb,
        db: dbAtbb,
      });
    }
  }
  
  console.log('');
  console.log('=== チェック結果 ===');
  
  if (mismatches.length === 0) {
    console.log('✅ すべての物件が一致しています');
  } else {
    console.log(`❌ ${mismatches.length}件の不一致が見つかりました:`);
    console.log('');
    
    mismatches.slice(0, 10).forEach(m => {
      console.log(`   ${m.propertyNumber}: ${m.issue}`);
      if (m.sheet !== undefined) {
        console.log(`      スプレッドシート: "${m.sheet}"`);
        console.log(`      データベース: "${m.db}"`);
      }
    });
    
    if (mismatches.length > 10) {
      console.log(`   ... 他 ${mismatches.length - 10}件`);
    }
    
    console.log('');
    console.log('推奨される対応:');
    console.log('1. 全物件を一括同期する場合:');
    console.log('   npx ts-node backend/sync-property-listings-updates.ts');
    console.log('');
    console.log('2. 自動同期を有効にする場合:');
    console.log('   バックエンドサーバーを起動してください');
  }
}

checkAllPropertySyncStatus().catch(console.error);
```

## Implementation Plan

### Phase 1: 診断スクリプトの作成（30分）

**タスク:**
1. AA4885診断スクリプトを作成
2. 自動同期サービス診断スクリプトを作成
3. 手動同期スクリプトを作成
4. 全物件チェックスクリプトを作成

**成果物:**
- `backend/diagnose-aa4885-property-listing-sync.ts`
- `backend/diagnose-auto-sync-service.ts`
- `backend/force-sync-aa4885.ts`
- `backend/check-all-property-sync-status.ts`

### Phase 2: 診断の実行（15分）

**タスク:**
1. AA4885の診断を実行
2. 自動同期サービスの診断を実行
3. 全物件の同期状態をチェック
4. 根本原因を特定

**成果物:**
- 診断結果レポート
- 根本原因の特定

### Phase 3: 修正の実行（15分）

**タスク:**
1. 根本原因に基づいた修正を実行
2. AA4885を手動で同期
3. 自動同期サービスを修正（必要な場合）
4. 修正後の検証

**成果物:**
- 修正完了レポート
- 検証結果

### Phase 4: 全物件の同期（30分）

**タスク:**
1. 全物件の同期状態を再チェック
2. 不一致がある物件を一括同期
3. 最終検証
4. ドキュメント更新

**成果物:**
- 全物件同期完了レポート
- 更新されたドキュメント

## Success Criteria

- [ ] AA4885のATBB状態がスプレッドシートと一致している
- [ ] 自動同期が正常に動作している
- [ ] 同期失敗時のアラート機能が実装されている（オプション）
- [ ] 全物件の同期状態が正常である
- [ ] ドキュメントが更新されている

## Dependencies

- `backend/src/services/PropertyListingSyncService.ts`
- `backend/src/services/EnhancedAutoSyncService.ts`
- `backend/src/services/GoogleSheetsClient.ts`
- Google Sheets API
- Supabase Database
- sync_logsテーブル（Migration 039）

## Related Specs

- `.kiro/specs/property-listing-auto-sync/` - 自動同期の実装spec
- `.kiro/specs/property-listing-update-sync-diagnosis/` - 更新同期診断spec
- `.kiro/specs/property-listing-atbb-status-auto-sync/` - ATBB状態自動同期spec

## Notes

- この問題は緊急性が高いため、Phase 1とPhase 2を優先的に実施する
- 自動同期の修正は、AA4885の問題解決後に実施する
- 全物件チェックは、自動同期が安定してから実施する
- 診断結果に基づいて、実装計画を調整する可能性がある

## Timeline

**合計時間**: 約1.5時間

- Phase 1: 診断スクリプトの作成（30分）
- Phase 2: 診断の実行（15分）
- Phase 3: 修正の実行（15分）
- Phase 4: 全物件の同期（30分）

## Conclusion

このspecは、AA4885の物件リスト同期問題を診断し、根本原因を特定して修正するためのものです。診断結果に基づいて、適切な修正を実行し、全物件の同期状態を正常化します。
