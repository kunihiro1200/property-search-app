# パフォーマンス最適化ガイド

## 概要

このドキュメントでは、スプレッドシート同期機能のパフォーマンス最適化について説明します。

## レート制限管理

### Google Sheets APIの制限

- **制限**: 100リクエスト/100秒
- **実装**: トークンバケットアルゴリズム
- **自動管理**: すべてのAPIリクエストは自動的にレート制限内に収まるように制御されます

### レート制限の監視

#### APIエンドポイント

```bash
# 現在の使用状況を確認
GET /api/sync/rate-limit
```

レスポンス例:
```json
{
  "success": true,
  "data": {
    "availableTokens": 85,
    "maxTokens": 100,
    "usagePercentage": 15,
    "queueLength": 0,
    "isNearLimit": false,
    "warning": null
  }
}
```

#### 使用状況の確認

```typescript
import { sheetsRateLimiter } from '../services/RateLimiter';

// 現在の使用状況を取得
const usage = sheetsRateLimiter.getUsage();
console.log(`利用可能トークン: ${usage.availableTokens}/${usage.maxTokens}`);
console.log(`使用率: ${usage.usagePercentage.toFixed(2)}%`);

// レート制限に近づいているか確認
if (sheetsRateLimiter.isNearLimit(0.8)) {
  console.warn('⚠️ レート制限の80%に達しています');
}
```

## バッチ処理の最適化

### バッチサイズの推奨

- **初回移行**: 100件/バッチ
- **通常同期**: 50件/バッチ
- **高頻度同期**: 20件/バッチ

### バッチ更新の使用

単一の更新を複数回実行するのではなく、`batchUpdate`を使用します。

```typescript
// ❌ 非効率: 複数の単一更新
for (const seller of sellers) {
  await sheetsClient.updateRow(seller.rowIndex, seller.data);
}

// ✅ 効率的: バッチ更新
const updates = sellers.map(seller => ({
  rowIndex: seller.rowIndex,
  values: seller.data,
}));
await sheetsClient.batchUpdate(updates);
```

## キャッシング戦略

### ヘッダーキャッシュ

GoogleSheetsClientは自動的にヘッダー行をキャッシュします。

```typescript
// ヘッダーキャッシュをクリア（カラム構造が変更された場合）
sheetsClient.clearHeaderCache();
```

### Supabaseキャッシュ

SellerServiceは既にRedisキャッシュを使用しています。

- **売主詳細**: 5分間キャッシュ
- **売主リスト**: 2分間キャッシュ

## 接続プーリング

### Supabase接続

Supabaseクライアントは自動的に接続プーリングを管理します。

### Google Sheets認証

認証トークンは再利用され、有効期限まで保持されます。

## パフォーマンス目標

### 達成目標

- ✅ **初回移行**: 10,000行を5分以内
- ✅ **単一レコード同期**: 2秒以内
- ✅ **バッチ同期（100件）**: 10秒以内
- ✅ **API応答時間**: 500ms以内（同期は非同期）

### 測定方法

```typescript
import { SyncLogger } from '../services/SyncLogger';

const logger = new SyncLogger(supabase);

// 統計情報を取得
const stats = await logger.getSyncStats(7); // 過去7日間

console.log(`総同期数: ${stats.totalSyncs}`);
console.log(`成功率: ${(stats.successCount / stats.totalSyncs * 100).toFixed(2)}%`);
console.log(`平均処理時間: ${stats.averageDuration.toFixed(2)}ms`);
```

## 最適化のベストプラクティス

### 1. バッチ処理を優先

```typescript
// 複数の売主を同期する場合
const sellerIds = ['id1', 'id2', 'id3', ...];
await syncService.syncBatchToSpreadsheet(sellerIds);
```

### 2. 非同期処理を活用

```typescript
// ユーザーをブロックしない
await syncQueue.enqueue({
  type: 'update',
  sellerId: seller.id,
});
// すぐに応答を返す
```

### 3. エラーハンドリングとリトライ

```typescript
// SyncQueueは自動的にリトライします
// - 最大3回まで
// - Exponential backoff
// - 失敗した操作は記録される
```

### 4. レート制限の監視

```typescript
// 定期的に使用状況を確認
setInterval(() => {
  const usage = sheetsRateLimiter.getUsage();
  if (usage.usagePercentage > 80) {
    console.warn('⚠️ レート制限に近づいています');
    // アラートを送信
  }
}, 60000); // 1分ごと
```

### 5. 差分同期の使用

```typescript
// 未同期の売主のみを同期
const unsyncedSellers = await syncService.getUnsyncedSellers(100);
if (unsyncedSellers.length > 0) {
  await syncService.syncBatchToSpreadsheet(unsyncedSellers);
}
```

## パフォーマンステスト

### テストスクリプト

```typescript
// backend/src/scripts/performance-test.ts
import { GoogleSheetsClient } from '../services/GoogleSheetsClient';
import { SpreadsheetSyncService } from '../services/SpreadsheetSyncService';

async function runPerformanceTest() {
  const startTime = Date.now();
  
  // 100件のバッチ同期をテスト
  const sellerIds = generateTestSellerIds(100);
  await syncService.syncBatchToSpreadsheet(sellerIds);
  
  const duration = Date.now() - startTime;
  console.log(`100件の同期完了: ${duration}ms`);
  
  if (duration > 10000) {
    console.warn('⚠️ 目標時間（10秒）を超えています');
  } else {
    console.log('✅ パフォーマンス目標を達成');
  }
}
```

### 負荷テスト

```bash
# Apache Benchを使用
ab -n 100 -c 10 http://localhost:3000/api/integration/inquiry-email

# 結果の確認
# - Requests per second
# - Time per request
# - Failed requests
```

## トラブルシューティング

### 問題: レート制限エラー

**症状**: `Rate limit exceeded` エラー

**解決策**:
1. レート制限の使用状況を確認
2. バッチサイズを小さくする
3. リクエスト間隔を広げる

```typescript
// レート制限をリセット（緊急時のみ）
await axios.post('http://localhost:3000/api/sync/rate-limit/reset');
```

### 問題: 同期が遅い

**症状**: 同期に時間がかかりすぎる

**解決策**:
1. バッチ処理を使用
2. 並列処理を避ける（レート制限のため）
3. キャッシュを活用

```typescript
// 統計情報を確認
const stats = await logger.getSyncStats(7);
console.log(`平均処理時間: ${stats.averageDuration}ms`);
```

### 問題: メモリ使用量が高い

**症状**: メモリ不足エラー

**解決策**:
1. バッチサイズを小さくする
2. ストリーミング処理を検討
3. 定期的にガベージコレクションを実行

## モニタリングとアラート

### 監視すべきメトリクス

1. **レート制限使用率**: 80%を超えたらアラート
2. **同期成功率**: 95%を下回ったらアラート
3. **平均処理時間**: 目標の2倍を超えたらアラート
4. **キュー長**: 100を超えたらアラート

### アラート設定例

```typescript
// 定期的な監視
setInterval(async () => {
  const usage = sheetsRateLimiter.getUsage();
  const stats = await logger.getSyncStats(1); // 過去1日
  
  // レート制限アラート
  if (usage.usagePercentage > 80) {
    await sendAlert('Rate limit warning', usage);
  }
  
  // 成功率アラート
  const successRate = stats.successCount / stats.totalSyncs;
  if (successRate < 0.95) {
    await sendAlert('Low success rate', { successRate });
  }
  
  // 処理時間アラート
  if (stats.averageDuration > 4000) { // 2秒の2倍
    await sendAlert('Slow sync performance', { averageDuration: stats.averageDuration });
  }
}, 300000); // 5分ごと
```

## 将来の最適化

### 検討中の改善

1. **接続プーリング**: Google Sheets API接続の再利用
2. **圧縮**: 大量データの圧縮転送
3. **並列処理**: 複数のスプレッドシートへの同時書き込み
4. **キャッシュ戦略**: より高度なキャッシュ戦略
5. **差分同期**: 変更されたフィールドのみを同期

### パフォーマンス改善の提案

パフォーマンスに関する提案や問題がある場合は、以下の情報を含めて報告してください：

- 現在のパフォーマンス指標
- 期待されるパフォーマンス
- 再現手順
- エラーログ
