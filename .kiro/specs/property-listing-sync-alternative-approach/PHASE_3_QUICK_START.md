# Phase 3: Sync State Management - クイックスタートガイド

## 🚀 今すぐ実行できる手順

Phase 3で実装した同期状態管理機能を今すぐ使い始めるための手順です。

## ⚡ 5分でセットアップ

### ステップ1: マイグレーションの実行（2分）

```bash
cd backend
npx ts-node migrations/run-082-migration.ts
```

**期待される出力:**
```
🚀 Starting Migration 082: Add Property Listing Sync State Tables

📄 Migration file loaded successfully
📊 Executing migration...

✅ Migration executed successfully

🔍 Verifying migration...

✅ property_listing_sync_state table verified
✅ property_listing_sync_errors table verified

🧪 Testing table operations...

✅ Test insert successful
✅ Test cleanup successful

============================================================
✅ Migration 082 completed successfully!
============================================================
```

### ステップ2: マイグレーションの検証（1分）

```bash
npx ts-node migrations/verify-082-migration.ts
```

**期待される出力:**
```
🔍 Verifying Migration 082: Property Listing Sync State Tables

1️⃣  Checking property_listing_sync_state table...
   ✅ Table exists and is accessible

2️⃣  Checking property_listing_sync_errors table...
   ✅ Table exists and is accessible

3️⃣  Testing insert operations...
   ✅ Insert operation successful
   ✅ Update operation successful
   ✅ Error tracking insert successful
   ✅ Test data cleaned up

4️⃣  Checking property_listing_sync_statistics view...
   ✅ Statistics view exists and is accessible

============================================================
📊 Verification Summary
============================================================
Sync State Table:     ✅
Sync Errors Table:    ✅
Statistics View:      ✅
============================================================

✅ All verification checks passed!
```

### ステップ3: テストの実行（2分）

```bash
# SyncStateServiceのテスト
npm test -- SyncStateService.test.ts

# API Routesのテスト
npm test -- propertyListingSync.test.ts
```

**期待される結果:**
- ✅ 全テストがパスする
- ✅ カバレッジ > 80%

## 🎯 基本的な使い方

### 1. バックエンドの起動

```bash
cd backend
npm run dev
```

### 2. APIの動作確認

#### ヘルス状態の確認
```bash
curl http://localhost:3000/api/property-listing-sync/health
```

**期待されるレスポンス:**
```json
{
  "status": "healthy",
  "lastSync": null,
  "errorRate": 0,
  "avgSyncDuration": 0,
  "queueSize": 0,
  "circuitBreakerState": "closed",
  "recentErrors": 0
}
```

#### 手動同期のトリガー
```bash
curl -X POST http://localhost:3000/api/property-listing-sync/manual \
  -H "Content-Type: application/json" \
  -d '{}'
```

**期待されるレスポンス:**
```json
{
  "syncId": "uuid",
  "status": "queued",
  "startedAt": "2025-01-10T00:00:00Z",
  "message": "Sync operation started successfully"
}
```

#### 同期ステータスの確認
```bash
# syncIdを上記のレスポンスから取得
curl http://localhost:3000/api/property-listing-sync/status/{syncId}
```

#### 統計情報の取得
```bash
curl http://localhost:3000/api/property-listing-sync/statistics
```

#### 同期履歴の取得
```bash
curl http://localhost:3000/api/property-listing-sync/history
```

## 💻 コードでの使用例

### TypeScriptでの使用

```typescript
import { SyncStateService } from './services/SyncStateService';
import { createClient } from '@supabase/supabase-js';

// 初期化
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
const syncStateService = new SyncStateService(supabase);

// 同期の作成と実行
async function runSync() {
  // 1. 同期レコードを作成
  const syncId = await syncStateService.createSync('manual', {
    triggeredBy: 'admin@example.com'
  });
  console.log('同期ID:', syncId);

  try {
    // 2. 同期を開始
    await syncStateService.startSync(syncId, 100);
    console.log('同期を開始しました');

    // 3. 同期処理（実際の処理はここに実装）
    // ...

    // 4. 同期を完了
    await syncStateService.completeSync(syncId, {
      success: 95,
      failed: 5,
      skipped: 0
    });
    console.log('同期が完了しました');

  } catch (error) {
    // エラー時は失敗をマーク
    await syncStateService.failSync(syncId, error);
    console.error('同期が失敗しました:', error);
  }

  // 5. 統計を確認
  const stats = await syncStateService.getStatistics();
  console.log('エラー率:', (stats.errorRate * 100).toFixed(2) + '%');
  console.log('平均実行時間:', stats.avgDuration.toFixed(0) + '秒');
}

runSync();
```

### エラーの記録

```typescript
// 個別のエラーを記録
await syncStateService.recordError(
  syncId,
  'AA12345',
  new Error('Invalid data format'),
  2 // リトライ回数
);

// エラー一覧を取得
const errors = await syncStateService.getSyncErrors(syncId);
errors.forEach(error => {
  console.log(`${error.property_number}: ${error.error_message}`);
});
```

### ヘルス状態の監視

```typescript
// ヘルス状態を定期的にチェック
setInterval(async () => {
  const health = await syncStateService.getHealth();
  
  if (health.status === 'unhealthy') {
    console.error('⚠️ 同期システムが不健全です');
    console.error('エラー率:', (health.errorRate * 100).toFixed(2) + '%');
    console.error('最近のエラー数:', health.recentErrors);
    // アラートを送信...
  }
}, 60000); // 1分ごと
```

## 🔧 トラブルシューティング

### マイグレーションが失敗する場合

**エラー:** `Missing required environment variables`

**解決策:**
```bash
# .envファイルを確認
cat backend/.env

# 必要な環境変数が設定されているか確認
echo $SUPABASE_URL
echo $SUPABASE_SERVICE_ROLE_KEY
```

**手動実行:**
1. Supabaseダッシュボードを開く
2. SQL Editorに移動
3. `backend/migrations/082_add_property_listing_sync_state_tables.sql`の内容をコピー
4. 実行

### APIが404を返す場合

**原因:** ルーターが登録されていない

**解決策:**
```typescript
// backend/src/index.ts に追加
import propertyListingSyncRouter from './routes/propertyListingSync';

app.use('/api/property-listing-sync', propertyListingSyncRouter);
```

### テストが失敗する場合

**原因:** モックの設定が不足

**解決策:**
```bash
# 依存関係を再インストール
npm install

# キャッシュをクリア
npm test -- --clearCache

# テストを再実行
npm test
```

## 📊 モニタリング

### Supabaseダッシュボードでの確認

1. **テーブルの確認**
   - Table Editor → `property_listing_sync_state`
   - 同期レコードが作成されているか確認

2. **統計の確認**
   - SQL Editor → 以下のクエリを実行
   ```sql
   SELECT * FROM property_listing_sync_statistics
   ORDER BY sync_date DESC
   LIMIT 7;
   ```

3. **エラーの確認**
   - Table Editor → `property_listing_sync_errors`
   - 最近のエラーを確認

### ログでの確認

```bash
# バックエンドのログを監視
cd backend
npm run dev | grep "sync"
```

**期待されるログ:**
```
📥 Manual sync request received: { force: false, propertyCount: 'all' }
✅ Sync initiated: { syncId: 'uuid', status: 'queued' }
```

## 🎯 次のステップ

### 今すぐできること
1. ✅ マイグレーションを実行
2. ✅ APIの動作を確認
3. ✅ テストを実行
4. ✅ 統計情報を確認

### 次に実装すること
1. ⏳ フロントエンドダッシュボード（Task 3.4）
2. ⏳ リアルタイム更新機能
3. ⏳ グラフ・チャート表示

### Phase 4への準備
1. ⏳ 統合テストの実装
2. ⏳ ロードテストの実施
3. ⏳ マイグレーションスクリプトの作成

## 📚 参考資料

- [PHASE_3_COMPLETE.md](./PHASE_3_COMPLETE.md) - Phase 3完了報告
- [PHASE_3_TASK_3.1_COMPLETE.md](./PHASE_3_TASK_3.1_COMPLETE.md) - テーブル作成
- [PHASE_3_TASK_3.2_COMPLETE.md](./PHASE_3_TASK_3.2_COMPLETE.md) - サービス実装
- [PHASE_3_TASK_3.3_COMPLETE.md](./PHASE_3_TASK_3.3_COMPLETE.md) - API実装

## 💡 ヒント

### パフォーマンス最適化
- 統計クエリは過去24時間に限定
- インデックスを活用した高速検索
- 古いレコードは定期的にクリーンアップ

### セキュリティ
- Service roleキーは環境変数で管理
- RLSポリシーでアクセス制御
- 認証ミドルウェアの追加を推奨

### 運用
- ヘルス状態を定期的に監視
- エラー率が5%を超えたらアラート
- 同期履歴は30日間保持

---

**作成日:** 2025-01-10  
**最終更新:** 2025-01-10  
**ステータス:** ✅ 実行可能
