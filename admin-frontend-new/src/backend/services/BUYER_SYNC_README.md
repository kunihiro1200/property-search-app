# BuyerSyncService

買主データをGoogle Sheetsからデータベースに同期するサービス。

## 同期方式

**全件同期方式**を採用しています。`last_synced_at`と`updated_at`カラムは記録されますが、フィルタリングには使用されません。これはPostgRESTのスキーマキャッシュ問題の回避策です。

### なぜ全件同期？

Supabaseの`last_synced_at`と`updated_at`カラムがPostgRESTのスキーマキャッシュ問題により認識されないため、差分同期が機能しません。全件同期により、この問題を回避しつつ、データの一貫性を保証します。

## 使用方法

### 基本的な同期

```typescript
import { BuyerSyncService } from './services/BuyerSyncService';

const syncService = new BuyerSyncService();
const result = await syncService.syncAll();

console.log(`Synced ${result.created + result.updated} buyers`);
console.log(`Success rate: ${result.successRate}%`);
```

### 進捗レポート付き同期

```typescript
const result = await syncService.syncAllWithProgress((progress) => {
  console.log(`Progress: ${progress.percentage}%`);
  console.log(`ETA: ${Math.round(progress.estimatedTimeRemaining / 1000)}s`);
});
```

### 買主の検証

```typescript
import { BuyerVerificationService } from './services/BuyerVerificationService';

const verificationService = new BuyerVerificationService();
const result = await verificationService.verifyBuyer('6648');

if (!result.dataMatches) {
  console.log('Data mismatch detected:', result.mismatches);
}
```

## パフォーマンス

- **4000買主の同期**: 約6-7分
- **バッチサイズ**: 50買主/バッチ
- **成功率目標**: 95%以上

### パフォーマンス最適化

1. **バッチサイズ調整**: 50件/バッチで最適化済み
2. **進捗レポート**: リアルタイムで進捗を確認可能
3. **エラー分離**: 個別エラーが全体の同期を妨げない

## 同期統計

同期操作は`buyer_sync_logs`テーブルに記録されます：

```typescript
import { BuyerSyncLogger } from './services/BuyerSyncLogger';

const logger = new BuyerSyncLogger();
const recentSyncs = await logger.getRecentSyncs(10);

for (const sync of recentSyncs) {
  console.log(`Sync at ${sync.sync_started_at}`);
  console.log(`  Created: ${sync.created_count}`);
  console.log(`  Updated: ${sync.updated_count}`);
  console.log(`  Failed: ${sync.failed_count}`);
  console.log(`  Success rate: ${sync.success_rate}%`);
}
```

## エラーハンドリング

### エラーカテゴリ

1. **NETWORK_ERROR**: Google Sheets API接続エラー
2. **DATABASE_ERROR**: Supabase接続エラー
3. **VALIDATION_ERROR**: データ検証エラー
4. **SCHEMA_ERROR**: スキーマ不整合エラー
5. **UNKNOWN_ERROR**: その他のエラー

### エラーログ

```typescript
const result = await syncService.syncAll();

if (result.errors.length > 0) {
  console.log('Errors occurred during sync:');
  for (const error of result.errors) {
    console.log(`Row ${error.row}: ${error.message}`);
    console.log(`Type: ${error.errorType}`);
    console.log(`Timestamp: ${error.timestamp}`);
  }
}
```

## コマンドラインツール

### 全件同期

```bash
npm run sync:buyers
```

### 買主検証

```bash
# 特定の買主を検証
npm run verify:buyer -- 6648

# または
ts-node backend/verify-buyer-6648.ts 6648
```

## トラブルシューティング

問題が発生した場合は、[BUYER_SYNC_TROUBLESHOOTING.md](../../BUYER_SYNC_TROUBLESHOOTING.md)を参照してください。

## アーキテクチャ

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
│  - buyer_sync_logs      │
└─────────────────────────┘
```

## 関連サービス

- **BuyerSyncLogger**: 同期ログの記録と取得
- **BuyerVerificationService**: データ整合性の検証
- **BuyerColumnMapper**: スプレッドシートとDBのマッピング
