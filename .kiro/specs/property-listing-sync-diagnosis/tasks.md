# 物件リスト同期問題診断 - Tasks

## Overview

このタスクリストは、物件リスト同期が動作していない原因を診断し、修正するためのステップです。

---

## Phase 1: 現状診断（優先度: 最高）

### Task 1.1: 自動同期サービスの状態確認

**目的**: EnhancedAutoSyncServiceが正しく初期化されているか確認

**実装**:
```bash
cd backend
npx ts-node diagnose-auto-sync-service.ts
```

**確認項目**:
- [ ] AUTO_SYNC_ENABLED環境変数が`true`
- [ ] EnhancedAutoSyncServiceが初期化成功
- [ ] 定期同期マネージャーが実行中
- [ ] バックエンドサーバーが起動中

**期待される出力**:
```
✅ AUTO_SYNC_ENABLED: true
✅ EnhancedAutoSyncService: 初期化成功
❌ 定期同期マネージャー: 実行中 = いいえ  ← 問題
✅ バックエンドサーバー: 起動中
```

**所要時間**: 5分

---

### Task 1.2: AA13226の存在確認

**目的**: AA13226がスプレッドシートとデータベースのどこに存在するか確認

**実装**:
```bash
cd backend
npx ts-node diagnose-aa13226-sync.ts
```

**スクリプト作成**:
```typescript
// backend/diagnose-aa13226-sync.ts
import { createClient } from '@supabase/supabase-js';
import { GoogleSheetsClient } from './src/services/GoogleSheetsClient';

async function diagnoseAA13226() {
  console.log('🔍 Diagnosing AA13226 sync status...\n');
  
  // 1. スプレッドシートで検索
  const sheetsClient = new GoogleSheetsClient({
    spreadsheetId: '1tI_iXaiLuWBggs5y0RH7qzkbHs9wnLLdRekAmjkhcLY',
    sheetName: '物件',
    serviceAccountKeyPath: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH || './google-service-account.json',
  });
  
  await sheetsClient.authenticate();
  const allData = await sheetsClient.readAll();
  const aa13226 = allData.find(row => row['物件番号'] === 'AA13226');
  
  console.log('📊 Spreadsheet:');
  console.log(`  Status: ${aa13226 ? '✅ EXISTS' : '❌ NOT FOUND'}`);
  if (aa13226) {
    console.log(`  Data:`, {
      property_number: aa13226['物件番号'],
      seller_number: aa13226['売主番号'],
      address: aa13226['物件所在地'],
      atbb_status: aa13226['atbb成約済み/非公開'],
    });
  }
  
  // 2. データベースで検索
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );
  
  const { data: dbData, error } = await supabase
    .from('property_listings')
    .select('*')
    .eq('property_number', 'AA13226');
  
  console.log('\n💾 Database:');
  console.log(`  Status: ${dbData?.length ? '✅ EXISTS' : '❌ NOT FOUND'}`);
  if (dbData?.length) {
    console.log(`  Data:`, dbData[0]);
  }
  
  // 3. 結果を比較
  console.log('\n📋 Summary:');
  if (aa13226 && !dbData?.length) {
    console.log('❌ SYNC ISSUE: Property exists in spreadsheet but not in database');
    console.log('   Cause: New property addition sync is not running');
    console.log('   Solution: Restart backend server to start auto-sync');
  } else if (!aa13226 && !dbData?.length) {
    console.log('⚠️  Property does not exist in either location');
  } else if (aa13226 && dbData?.length) {
    console.log('✅ Property exists in both locations');
  }
}

diagnoseAA13226()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('❌ Error:', err);
    process.exit(1);
  });
```

**受入基準**:
- [ ] AA13226のスプレッドシート上の存在を確認
- [ ] AA13226のデータベース上の存在を確認
- [ ] 差分を明確に出力

**所要時間**: 10分

---

### Task 1.3: AA4885のATBB状況確認

**目的**: AA4885のATBB状況がスプレッドシートとデータベースで一致しているか確認

**実装**:
```bash
cd backend
npx ts-node check-aa4885-atbb-status.ts
```

**期待される出力**:
```
📊 Spreadsheet:
  ATBB Status: 非公開（一般）

💾 Database:
  ATBB Status: 一般・公開中
  Last Updated: 2025-12-17T05:05:04.964094+00:00 (21 days ago)

❌ MISMATCH: ATBB status is different
   Cause: Property listing update sync is not running
   Solution: Restart backend server to start auto-sync
```

**受入基準**:
- [ ] AA4885のスプレッドシート上のATBB状況を確認
- [ ] AA4885のデータベース上のATBB状況を確認
- [ ] 不一致の場合、その内容を出力
- [ ] 最終更新日時を表示

**所要時間**: 5分

---

### Task 1.4: sync_logsテーブルの確認

**目的**: 自動同期が実行された履歴があるか確認

**実装**:
```bash
cd backend
npx ts-node check-property-listing-auto-sync-status.ts
```

**確認項目**:
- [ ] sync_logsテーブルが存在する
- [ ] property_listing_updateの記録がある
- [ ] 最後の同期実行時刻を確認
- [ ] エラーログを確認

**期待される出力**:
```
📊 Recent Sync Logs (property_listing_update):
  ❌ No records found

📋 Summary:
  Total syncs: 0
  Last sync: Never
  Status: Auto-sync has never run
```

**受入基準**:
- [ ] sync_logsテーブルの内容を表示
- [ ] 最近の同期ログを表示（最大10件）
- [ ] エラーがある場合、その内容を表示

**所要時間**: 5分

---

## Phase 2: 根本原因の特定（優先度: 高）

### Task 2.1: バックエンドサーバーの起動状態確認

**目的**: バックエンドサーバーが正しく起動し、定期同期マネージャーが開始されているか確認

**確認方法**:
```bash
# バックエンドのログを確認
cd backend
npm run dev

# 起動ログで以下を確認:
# ✅ EnhancedAutoSyncService initialized
# 📊 Enhanced periodic auto-sync enabled (interval: 5 minutes)
```

**確認項目**:
- [ ] バックエンドサーバーが起動している
- [ ] EnhancedAutoSyncServiceが初期化されている
- [ ] 定期同期マネージャーが開始されている
- [ ] 5秒後に初回同期が実行される

**問題の特定**:
- 起動ログに定期同期マネージャーの開始メッセージがない場合
  → バックエンドサーバーが再起動されていない
  → **これが最も可能性が高い根本原因**

**所要時間**: 10分

---

### Task 2.2: 新規物件追加機能の確認

**目的**: PropertyListingSyncServiceに新規物件を追加する機能があるか確認

**調査内容**:
```typescript
// backend/src/services/PropertyListingSyncService.ts を確認

// 既存のメソッド:
// ✅ syncUpdatedPropertyListings() - 既存物件の更新
// ❓ syncNewPropertyListings() - 新規物件の追加（存在するか？）
```

**確認項目**:
- [ ] PropertyListingSyncServiceに新規物件追加メソッドがあるか
- [ ] EnhancedAutoSyncServiceのどのフェーズで新規物件を追加するか
- [ ] Phase 4.5は「更新同期」のみか、「新規追加」も含むか

**可能性**:
1. **Phase 4.5は更新のみ**: 新規物件追加は別のフェーズで処理される
2. **新規追加機能が不足**: 実装が必要

**所要時間**: 15分

---

### Task 2.3: スプレッドシート構造の検証

**目的**: スプレッドシートの列構造が期待通りか確認

**実装**:
```bash
cd backend
npx ts-node verify-spreadsheet-structure.ts
```

**スクリプト作成**:
```typescript
// backend/verify-spreadsheet-structure.ts
import { GoogleSheetsClient } from './src/services/GoogleSheetsClient';

async function verifySpreadsheetStructure() {
  const sheetsClient = new GoogleSheetsClient({
    spreadsheetId: '1tI_iXaiLuWBggs5y0RH7qzkbHs9wnLLdRekAmjkhcLY',
    sheetName: '物件',
    serviceAccountKeyPath: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH || './google-service-account.json',
  });
  
  await sheetsClient.authenticate();
  const allData = await sheetsClient.readAll();
  
  if (allData.length === 0) {
    console.log('❌ No data found in spreadsheet');
    return;
  }
  
  const headers = Object.keys(allData[0]);
  console.log('📊 Spreadsheet Headers:');
  headers.forEach(header => console.log(`  - ${header}`));
  
  const expectedHeaders = [
    '物件番号',
    'atbb成約済み/非公開',
    '格納先',
    // ... 他の必須列
  ];
  
  const missingHeaders = expectedHeaders.filter(h => !headers.includes(h));
  
  if (missingHeaders.length > 0) {
    console.log('\n❌ Missing Headers:');
    missingHeaders.forEach(h => console.log(`  - ${h}`));
  } else {
    console.log('\n✅ All expected headers are present');
  }
}

verifySpreadsheetStructure();
```

**受入基準**:
- [ ] スプレッドシートの列構造を確認
- [ ] 不足している列があれば報告
- [ ] 列名が正しいか確認

**所要時間**: 10分

---

## Phase 3: 修正の実施（優先度: 高）

### Task 3.1: バックエンドサーバーの再起動

**目的**: 定期同期マネージャーを起動する

**実装**:
```bash
cd backend

# 既存のプロセスを停止（Ctrl+C）

# 再起動
npm run dev
```

**期待される起動ログ**:
```
✅ EnhancedAutoSyncService initialized
📊 Enhanced periodic auto-sync enabled (interval: 5 minutes)
   Using full comparison mode - all missing sellers will be detected

# 5秒後
🔄 Starting full sync (triggered by: scheduled)
🏢 Phase 4.5: Property Listing Update Sync
✅ Property listing update sync: X updated
```

**受入基準**:
- [ ] バックエンドサーバーが正常に起動
- [ ] 定期同期マネージャーが開始される
- [ ] 5秒後に初回同期が実行される
- [ ] Phase 4.5のログが表示される

**所要時間**: 5分

---

### Task 3.2: 手動同期の実行（検証用）

**目的**: AA13226とAA4885を手動で同期して、機能が正常に動作するか確認

**実装**:
```bash
cd backend

# 物件リスト更新同期を手動実行
npx ts-node sync-property-listings-updates.ts
```

**期待される出力**:
```
🔄 Starting property listing update sync...
📊 Detected 8 properties with changes
✅ Property listing update sync completed: 8 updated, 0 failed
   Duration: 2.3s
```

**受入基準**:
- [ ] 手動同期が正常に実行される
- [ ] AA4885のATBB状況が更新される
- [ ] エラーが発生しない

**注意**: AA13226は「新規物件」なので、この手動同期では追加されない可能性がある。

**所要時間**: 5分

---

### Task 3.3: 新規物件追加機能の実装（必要な場合）

**目的**: AA13226のような新規物件を自動的に追加する機能を実装

**条件**: Task 2.2で新規物件追加機能が不足していることが判明した場合のみ実施

**実装**:
```typescript
// backend/src/services/PropertyListingSyncService.ts

async syncNewPropertyListings(): Promise<{
  added: number;
  failed: number;
  errors?: Array<{ property_number: string; error: string }>;
}> {
  // 1. スプレッドシートから全物件を取得
  const sheetData = await this.sheetsClient.readAll();
  
  // 2. データベースから全物件番号を取得
  const { data: dbProperties } = await this.supabase
    .from('property_listings')
    .select('property_number');
  
  const dbPropertyNumbers = new Set(
    dbProperties?.map(p => p.property_number) || []
  );
  
  // 3. スプレッドシートにあってDBにない物件を検出
  const newProperties = sheetData.filter(
    row => row['物件番号'] && !dbPropertyNumbers.has(row['物件番号'])
  );
  
  // 4. 新規物件を追加
  let added = 0;
  let failed = 0;
  const errors: Array<{ property_number: string; error: string }> = [];
  
  for (const row of newProperties) {
    try {
      await this.addPropertyListing(row);
      added++;
    } catch (error: any) {
      failed++;
      errors.push({
        property_number: row['物件番号'],
        error: error.message,
      });
    }
  }
  
  return { added, failed, errors };
}
```

**EnhancedAutoSyncServiceへの統合**:
```typescript
// backend/src/services/EnhancedAutoSyncService.ts

// Phase 4.6: 物件リスト新規追加同期（新規追加）
async syncPropertyListingAdditions(): Promise<{...}> {
  const syncService = new PropertyListingSyncService(sheetsClient);
  const result = await syncService.syncNewPropertyListings();
  return result;
}

// runFullSync()に追加
// Phase 4.6: 物件リスト新規追加同期
console.log('\n🏢 Phase 4.6: Property Listing Addition Sync');
const plAddResult = await this.syncPropertyListingAdditions();
```

**受入基準**:
- [ ] syncNewPropertyListings()メソッドを実装
- [ ] EnhancedAutoSyncServiceに統合（Phase 4.6）
- [ ] 手動テストで動作確認
- [ ] AA13226が追加されることを確認

**所要時間**: 2時間（実装が必要な場合）

---

## Phase 4: 検証（優先度: 高）

### Task 4.1: 自動同期の動作確認

**目的**: バックエンドサーバー再起動後、自動同期が正常に動作するか確認

**手順**:
1. バックエンドサーバーを再起動（Task 3.1）
2. 5分待機
3. sync_logsテーブルを確認

**実装**:
```bash
# 5分待機後
cd backend
npx ts-node check-property-listing-auto-sync-status.ts
```

**期待される出力**:
```
📊 Recent Sync Logs (property_listing_update):
  1. 2026-01-08 10:05:00 - SUCCESS - 8 updated, 0 failed
  2. 2026-01-08 10:00:00 - SUCCESS - 0 updated, 0 failed

📋 Summary:
  Total syncs: 2
  Last sync: 5 minutes ago
  Status: ✅ Auto-sync is working
```

**受入基準**:
- [ ] sync_logsに新しい記録が追加される
- [ ] 5分ごとに同期が実行される
- [ ] エラーが発生しない

**所要時間**: 10分（待機時間含む）

---

### Task 4.2: AA4885の更新確認

**目的**: AA4885のATBB状況が正しく更新されたか確認

**実装**:
```bash
cd backend
npx ts-node check-aa4885-atbb-status.ts
```

**期待される出力**:
```
📊 Spreadsheet:
  ATBB Status: 非公開（一般）

💾 Database:
  ATBB Status: 非公開（一般）  ← 更新された！
  Last Updated: 2026-01-08T10:05:00.000000+00:00 (just now)

✅ MATCH: ATBB status is synchronized
```

**受入基準**:
- [ ] AA4885のatbb_statusが「非公開（一般）」に更新される
- [ ] updated_atが最新の日時になる
- [ ] スプレッドシートとDBが一致する

**所要時間**: 5分

---

### Task 4.3: AA13226の追加確認（新規追加機能がある場合）

**目的**: AA13226がデータベースに追加されたか確認

**実装**:
```bash
cd backend
npx ts-node diagnose-aa13226-sync.ts
```

**期待される出力**:
```
📊 Spreadsheet:
  Status: ✅ EXISTS

💾 Database:
  Status: ✅ EXISTS  ← 追加された！

✅ Property exists in both locations
```

**受入基準**:
- [ ] AA13226がデータベースに存在する
- [ ] 全フィールドが正しく同期されている
- [ ] スプレッドシートとDBが一致する

**所要時間**: 5分

---

## Phase 5: ドキュメント更新（優先度: 中）

### Task 5.1: 診断結果のドキュメント化

**目的**: 診断結果と解決策を文書化

**実装**:
- 診断結果をまとめたレポートを作成
- 根本原因を明確に記載
- 解決策を詳細に記載
- 今後の予防策を提案

**成果物**:
- `PROPERTY_LISTING_SYNC_DIAGNOSIS_COMPLETE.md`

**所要時間**: 30分

---

### Task 5.2: 既存specの更新

**目的**: 既存のspecファイルを最新の状態に更新

**更新対象**:
- `.kiro/specs/property-listing-auto-sync/requirements.md`
- `.kiro/specs/property-listing-auto-sync/tasks.md`

**更新内容**:
- 新規物件追加機能の追加（実装した場合）
- Phase 4.6の追加（実装した場合）
- トラブルシューティングセクションの追加

**所要時間**: 30分

---

## 実行順序

### 今すぐ実行（Phase 1 & 2）
1. Task 1.1: 自動同期サービスの状態確認
2. Task 1.2: AA13226の存在確認
3. Task 1.3: AA4885のATBB状況確認
4. Task 1.4: sync_logsテーブルの確認
5. Task 2.1: バックエンドサーバーの起動状態確認
6. Task 2.2: 新規物件追加機能の確認

### 診断結果に基づいて実行（Phase 3）
7. Task 3.1: バックエンドサーバーの再起動（最も可能性が高い）
8. Task 3.2: 手動同期の実行（検証用）
9. Task 3.3: 新規物件追加機能の実装（必要な場合のみ）

### 修正後に実行（Phase 4）
10. Task 4.1: 自動同期の動作確認
11. Task 4.2: AA4885の更新確認
12. Task 4.3: AA13226の追加確認

### 最後に実行（Phase 5）
13. Task 5.1: 診断結果のドキュメント化
14. Task 5.2: 既存specの更新

---

## 推定時間

- **Phase 1 (診断)**: 35分
- **Phase 2 (根本原因特定)**: 35分
- **Phase 3 (修正)**: 15分〜2時間15分（新規追加機能の実装が必要な場合）
- **Phase 4 (検証)**: 20分
- **Phase 5 (ドキュメント)**: 1時間

**合計**: 約2時間45分〜4時間45分

---

## Success Metrics

- [ ] 自動同期サービスが正常に動作している
- [ ] AA4885のATBB状況が自動的に更新される
- [ ] AA13226がデータベースに追加される（新規追加機能がある場合）
- [ ] sync_logsに定期的に記録が追加される
- [ ] 今後、手動修正が不要になる
