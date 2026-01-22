# Design Document: Auto-Sync Diagnostic Tool

## Overview

自動同期システムの健全性を診断するコマンドラインツールを実装します。同期ログ、データの鮮度、エラー状況、環境変数を確認し、問題の特定と解決策を提示します。

## Architecture

```
┌─────────────────────────────────────────┐
│   Diagnostic Script                     │
│   (diagnose-auto-sync-status.ts)        │
└─────────────────────────────────────────┘
                  │
                  ├─→ Supabase Client
                  │   ├─→ sync_logs table
                  │   ├─→ property_listings table
                  │   └─→ buyers table
                  │
                  └─→ Environment Variables
                      ├─→ GOOGLE_SHEETS_SPREADSHEET_ID
                      ├─→ GOOGLE_SERVICE_ACCOUNT_EMAIL
                      └─→ GOOGLE_PRIVATE_KEY
```

## Components and Interfaces

### Diagnostic Script Structure

```typescript
async function diagnoseAutoSyncStatus() {
  console.log('\n=== 自動同期状況診断 ===\n');

  // 1. 同期ログの確認
  await checkSyncLogs();

  // 2. 物件リストの最終更新確認
  await checkPropertyListingsFreshness();

  // 3. 買主リストの最終更新確認
  await checkBuyersFreshness();

  // 4. データ件数確認
  await checkDataCounts();

  // 5. エラーログの確認
  await checkErrorLogs();

  // 6. 環境変数の確認
  await checkEnvironmentVariables();

  // 7. 推奨アクションの表示
  displayRecommendations();
}
```

### Check Functions

#### 1. checkSyncLogs()
```typescript
const { data: syncLogs } = await supabase
  .from('sync_logs')
  .select('*')
  .order('created_at', { ascending: false })
  .limit(10);
```

#### 2. checkPropertyListingsFreshness()
```typescript
const { data: latestProperty } = await supabase
  .from('property_listings')
  .select('property_number, updated_at')
  .order('updated_at', { ascending: false })
  .limit(1);

const hoursSinceUpdate = calculateHoursSince(latestProperty.updated_at);
if (hoursSinceUpdate > 24) {
  console.log('⚠️ 24時間以上更新されていません');
}
```

#### 3. checkErrorLogs()
```typescript
const { data: errorLogs } = await supabase
  .from('sync_logs')
  .select('*')
  .eq('status', 'error')
  .order('created_at', { ascending: false })
  .limit(5);
```

#### 4. checkEnvironmentVariables()
```typescript
const requiredEnvVars = [
  'GOOGLE_SHEETS_SPREADSHEET_ID',
  'GOOGLE_SERVICE_ACCOUNT_EMAIL',
  'GOOGLE_PRIVATE_KEY'
];

requiredEnvVars.forEach(varName => {
  if (process.env[varName]) {
    console.log(`✅ ${varName}: 設定済み`);
  } else {
    console.log(`❌ ${varName}: 未設定`);
  }
});
```

## Output Format

### Success Case
```
=== 自動同期状況診断 ===

1. 同期ログの確認...
✅ 最新の同期ログ 10 件を取得

最新の同期:
  - タイプ: property_listings
  - ステータス: success
  - 時刻: 2026-01-06T10:30:00Z
  - メッセージ: Synced 5 new properties

2. 物件リストの最終更新確認...
✅ 最新の物件更新: AA13245
   更新日時: 2026-01-06T10:30:00Z
   経過時間: 2.5 時間

3. 買主リストの最終更新確認...
✅ 最新の買主更新: 6670
   更新日時: 2026-01-06T09:15:00Z
   経過時間: 3.8 時間

4. 物件リストの件数確認...
✅ 物件総数: 1,234 件

5. 買主リストの件数確認...
✅ 買主総数: 567 件

6. 同期エラーログの確認...
✅ 最近のエラーはありません

7. 環境変数の確認...
✅ GOOGLE_SHEETS_SPREADSHEET_ID: 設定済み
✅ GOOGLE_SERVICE_ACCOUNT_EMAIL: 設定済み
✅ GOOGLE_PRIVATE_KEY: 設定済み

=== 診断完了 ===

推奨アクション:
✅ すべて正常です
```

### Error Case
```
=== 自動同期状況診断 ===

1. 同期ログの確認...
⚠️ 同期ログが見つかりません

2. 物件リストの最終更新確認...
✅ 最新の物件更新: AA13200
   更新日時: 2026-01-04T15:00:00Z
   経過時間: 43.5 時間
⚠️ 24時間以上更新されていません

6. 同期エラーログの確認...
⚠️ 最近のエラー 3 件:

  1. property_listings
     時刻: 2026-01-05T08:00:00Z
     エラー: Authentication failed

7. 環境変数の確認...
✅ GOOGLE_SHEETS_SPREADSHEET_ID: 設定済み
❌ GOOGLE_SERVICE_ACCOUNT_EMAIL: 未設定
❌ GOOGLE_PRIVATE_KEY: 未設定

=== 診断完了 ===

推奨アクション:
1. 同期ログが24時間以上更新されていない場合 → 自動同期が停止している可能性
2. エラーログがある場合 → エラー内容を確認して修正
3. 環境変数が未設定の場合 → .envファイルを確認
4. 手動同期を試す: npm run sync-property-listings または npm run sync-buyers
```

## Error Handling

- テーブルが存在しない場合は適切なエラーメッセージを表示
- 接続エラーの場合は診断を中断せず、可能な範囲で診断を継続
- 各チェックは独立して実行し、1つが失敗しても他のチェックは継続

## Testing Strategy

### Manual Testing
1. 正常な状態で実行し、すべてのチェックが成功することを確認
2. sync_logsテーブルが空の状態で実行し、適切な警告が表示されることを確認
3. 環境変数を削除して実行し、未設定の警告が表示されることを確認
4. 古いデータの状態で実行し、24時間警告が表示されることを確認

### Execution
```bash
cd backend
npx ts-node diagnose-auto-sync-status.ts
```
