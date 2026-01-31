# 自動同期のタイミング（完全ガイド）

## ⚠️ 重要：2つの同期方向

このシステムには**2つの独立した同期方向**があります：

1. **データベース → スプレッドシート**（即時同期）
2. **スプレッドシート → データベース**（定期同期）

---

## 📊 同期方向1：データベース → スプレッドシート（即時同期）

### トリガー

**売主データの作成・更新時に即座に実行**されます。

### 実装

**サービス**: `SyncQueue`（`backend/src/services/SyncQueue.ts`）

**トリガーポイント**:
1. **売主作成時**: `SellerService.createSeller()`
   ```typescript
   // backend/src/services/SellerService.supabase.ts
   async createSeller(data: any) {
     // 売主をDBに作成
     const seller = await this.supabase.from('sellers').insert(data);
     
     // 即座にスプレッドシートに同期をキュー
     await this.syncQueue.enqueue({
       type: 'create',
       sellerId: seller.id,
     });
   }
   ```

2. **売主更新時**: `SellerService.updateSeller()`
   ```typescript
   // backend/src/services/SellerService.supabase.ts
   async updateSeller(id: string, data: any) {
     // 売主をDBで更新
     await this.supabase.from('sellers').update(data).eq('id', id);
     
     // 即座にスプレッドシートに同期をキュー
     await this.syncQueue.enqueue({
       type: 'update',
       sellerId: id,
     });
   }
   ```

### 同期フロー

```
ユーザーがブラウザで売主データを編集
  ↓
フロントエンドがAPIを呼び出し
  ↓
SellerService.updateSeller()がDBを更新
  ↓
SyncQueue.enqueue()が同期をキューに追加
  ↓
SyncQueue.process()がキューを順次処理
  ↓
SpreadsheetSyncService.syncToSpreadsheet()がスプレッドシートを更新
  ↓
完了（数秒以内）
```

### タイミング

- **即時**: ユーザーが保存ボタンを押してから**数秒以内**にスプレッドシートに反映
- **キュー処理**: 複数の更新が同時に発生した場合、順次処理される
- **リトライ**: 失敗した場合、最大3回まで自動リトライ（Exponential backoff）

### リトライ設定

```typescript
// backend/src/services/SyncQueue.ts
const retryConfig = {
  maxRetries: 3,              // 最大リトライ回数
  initialDelay: 1000,         // 初回リトライ遅延（1秒）
  maxDelay: 10000,            // 最大リトライ遅延（10秒）
  backoffMultiplier: 2,       // 遅延の倍率
};
```

**リトライ遅延の計算**:
- 1回目: 1秒
- 2回目: 2秒
- 3回目: 4秒

---

## 📥 同期方向2：スプレッドシート → データベース（定期同期）

### トリガー

**定期的に自動実行**されます。

### 実装

**サービス**: `EnhancedPeriodicSyncManager`（`backend/src/services/EnhancedAutoSyncService.ts`）

**デフォルト設定**:
- **同期間隔**: **5分ごと**
- **自動起動**: サーバー起動時に自動的に開始
- **エラー時**: エラーが発生しても次回スケジュールは継続

### 同期間隔の設定

**環境変数**:
```bash
AUTO_SYNC_INTERVAL_MINUTES=5  # デフォルト: 5分
```

**コード**:
```typescript
// backend/src/services/EnhancedAutoSyncService.ts
export class EnhancedPeriodicSyncManager {
  constructor(intervalMinutes: number = 5) {
    this.intervalMinutes = intervalMinutes;
  }
}
```

### 同期フロー

```
サーバー起動
  ↓
EnhancedPeriodicSyncManager.start()
  ↓
初回同期を即座に実行
  ↓
5分ごとに定期実行
  ↓
EnhancedAutoSyncService.runFullSync()
  ↓
Phase 1: 追加同期（スプレッドシートにあってDBにない売主を追加）
  ↓
Phase 2: 更新同期（既存売主のデータを更新）
  ↓
Phase 3: 削除同期（DBにあってスプレッドシートにない売主を削除）
  ↓
Phase 4.5: 物件リスト更新同期
  ↓
Phase 4.6: 新規物件追加同期
  ↓
Phase 4.7: property_details同期
  ↓
完了
```

### 同期の詳細フェーズ

#### Phase 1: 追加同期

**目的**: スプレッドシートにあってDBにない売主を検出して追加

**処理**:
1. スプレッドシートから全売主番号を取得（キャッシュ対応）
2. DBから全売主番号を取得（ページネーション対応）
3. 差分を計算（スプレッドシートにあってDBにないもの）
4. 不足している売主をDBに追加

**キャッシュ**:
- スプレッドシートデータは**15分間キャッシュ**される
- Google Sheets APIクォータ対策

#### Phase 2: 更新同期

**目的**: 既存売主のデータを更新

**処理**:
1. スプレッドシートとDBのデータを比較
2. 重要なフィールド（`status`, `contract_year_month`, `visit_assignee`など）が異なる売主を検出
3. 変更があった売主をDBで更新

#### Phase 3: 削除同期

**目的**: DBにあってスプレッドシートにない売主を削除（ソフトデリート）

**処理**:
1. DBにあってスプレッドシートにない売主を検出
2. バリデーション（アクティブな契約、最近のアクティビティをチェック）
3. ソフトデリート（`deleted_at`を設定）
4. 監査ログに記録

**有効化**:
```bash
DELETION_SYNC_ENABLED=true  # デフォルト: true
```

#### Phase 4.5: 物件リスト更新同期

**目的**: 物件リストスプレッドシートの更新をDBに反映

**処理**:
1. 物件リストスプレッドシートから全物件データを取得
2. DBの`property_listings`テーブルと比較
3. 変更があった物件を更新

#### Phase 4.6: 新規物件追加同期

**目的**: 物件リストスプレッドシートの新規物件をDBに追加

**処理**:
1. 物件リストスプレッドシートから全物件番号を取得
2. DBの`property_listings`テーブルと比較
3. 新規物件をDBに追加

#### Phase 4.7: property_details同期

**目的**: `property_listings`に存在するが`property_details`に存在しない物件のコメントデータを同期

**処理**:
1. `property_listings`から全物件番号を取得
2. `property_details`から全物件番号を取得
3. 差分を計算（`property_listings`にあって`property_details`にないもの）
4. 個別物件スプレッドシートの`athome`シートからコメントデータを取得
5. `property_details`テーブルに保存

---

## 🔄 スプレッドシートキャッシュ

### 目的

Google Sheets APIのクォータ制限を回避するため、スプレッドシートデータをキャッシュします。

### 設定

**キャッシュTTL**: **5分**

```typescript
// backend/src/services/EnhancedAutoSyncService.ts
private readonly SPREADSHEET_CACHE_TTL = 5 * 60 * 1000; // 5分間キャッシュ
```

### 動作

1. **初回取得**: スプレッドシートからデータを取得してキャッシュ
2. **キャッシュ有効**: 5分以内は、キャッシュからデータを取得
3. **キャッシュ無効**: 5分経過後、スプレッドシートから再取得
4. **手動同期時**: キャッシュを自動的にクリアして最新データを取得

**ログ例**:
```
📦 Using cached spreadsheet data (valid for 247 seconds)
```

または

```
🔄 Fetching fresh spreadsheet data...
✅ Spreadsheet data cached (1234 rows, valid for 5 minutes)
```

---

## ⏰ 同期タイミングのまとめ

### データベース → スプレッドシート

| 項目 | 値 |
|------|-----|
| **トリガー** | 売主作成・更新時 |
| **タイミング** | 即時（数秒以内） |
| **実装** | `SyncQueue` |
| **リトライ** | 最大3回（Exponential backoff） |

### スプレッドシート → データベース

| 項目 | 値 |
|------|-----|
| **トリガー** | 定期実行 |
| **同期間隔** | **5分ごと**（デフォルト） |
| **初回実行** | サーバー起動時に即座に実行 |
| **実装** | `EnhancedPeriodicSyncManager` |
| **キャッシュTTL** | 15分 |
| **エラー時** | 次回スケジュールは継続 |

---

## 🛠️ 手動同期

### 方法1: APIエンドポイント

**エンドポイント**: `/api/sync/manual`

**実行**:
```bash
curl -X POST http://localhost:3000/api/sync/manual
```

### 方法2: スクリプト実行

**スクリプト**: `backend/run-full-sync-once.ts`

**実行**:
```bash
npx ts-node backend/run-full-sync-once.ts
```

---

## 📊 同期ステータスの確認

### ヘルスチェック

**エンドポイント**: `/api/sync/health`

**レスポンス例**:
```json
{
  "isHealthy": true,
  "lastSyncTime": "2026-01-30T12:00:00.000Z",
  "lastSyncSuccess": true,
  "pendingMissingSellers": 0,
  "syncIntervalMinutes": 5,
  "nextScheduledSync": "2026-01-30T12:05:00.000Z",
  "consecutiveFailures": 0
}
```

### ログ確認

**ログファイル**: `backend/logs/sync.log`

**ログ例**:
```
🔄 Starting full sync (triggered by: scheduled)
📥 Phase 1: Seller Addition Sync
📊 Spreadsheet sellers: 1234
📊 Database sellers: 1230
🆕 Missing sellers: 4
✅ AA13501: Created
✅ AA13502: Created
✅ AA13503: Created
✅ AA13504: Created
🎉 Sync completed: 4 new, 0 errors

🔄 Phase 2: Seller Update Sync
📊 Total sellers checked: 1234
🔄 Updated sellers: 2
✅ AA13505: Updated
✅ AA13506: Updated
🎉 Update completed: 2 updated, 0 errors

🗑️  Phase 3: Seller Deletion Sync
📊 Spreadsheet sellers: 1234
📊 Active database sellers: 1234
🗑️  Deleted sellers: 0
✅ No deleted sellers to sync

📊 Complete Sync Summary:
   Status: success
   Sellers Added: 4
   Sellers Updated: 2
   Sellers Deleted: 0
   Duration: 12.34s
```

---

## 🚨 トラブルシューティング

### 問題1: 同期が実行されない

**確認事項**:
1. サーバーが起動しているか？
2. 環境変数`AUTO_SYNC_ENABLED`が`false`になっていないか？
3. ログにエラーが出ていないか？

**解決策**:
```bash
# 環境変数を確認
echo $AUTO_SYNC_ENABLED

# サーバーを再起動
npm run dev
```

### 問題2: 同期が遅い

**原因**: スプレッドシートのデータ量が多い

**解決策**:
1. キャッシュTTLを延長（15分 → 30分）
2. 同期間隔を延長（5分 → 10分）

```bash
# 環境変数を設定
AUTO_SYNC_INTERVAL_MINUTES=10
```

### 問題3: Google Sheets APIクォータエラー

**原因**: キャッシュが無効化されている、または同期間隔が短すぎる

**解決策**:
1. キャッシュTTLを確認（15分が推奨）
2. 同期間隔を延長（5分 → 10分）
3. Google Cloud Consoleでクォータを確認

---

## 📝 環境変数一覧

### 自動同期設定

| 環境変数 | デフォルト | 説明 |
|---------|----------|------|
| `AUTO_SYNC_ENABLED` | `true` | 自動同期の有効化 |
| `AUTO_SYNC_INTERVAL_MINUTES` | `5` | 同期間隔（分） |

### 削除同期設定

| 環境変数 | デフォルト | 説明 |
|---------|----------|------|
| `DELETION_SYNC_ENABLED` | `true` | 削除同期の有効化 |
| `DELETION_VALIDATION_STRICT` | `true` | 厳格なバリデーション |
| `DELETION_RECENT_ACTIVITY_DAYS` | `7` | 最近のアクティビティ日数 |
| `DELETION_MAX_PER_SYNC` | `100` | 1回の同期で削除する最大数 |

### Google Sheets設定

| 環境変数 | 説明 |
|---------|------|
| `GOOGLE_SHEETS_SPREADSHEET_ID` | 売主リストスプレッドシートID |
| `GOOGLE_SHEETS_SHEET_NAME` | シート名（デフォルト: `売主リスト`） |
| `GOOGLE_SERVICE_ACCOUNT_KEY_PATH` | サービスアカウントキーのパス |

---

## 🎯 ベストプラクティス

### 1. デフォルト設定を使用する

**推奨設定**:
- 同期間隔: **5分**
- キャッシュTTL: **15分**
- 自動同期: **有効**

### 2. ログを定期的に確認する

**確認項目**:
- 同期エラーの有無
- 同期時間の長さ
- 追加・更新・削除の件数

### 3. 手動同期は必要最小限に

**理由**:
- 自動同期が5分ごとに実行されるため、手動同期は通常不要
- 緊急時のみ手動同期を実行

### 4. Google Sheets APIクォータを監視する

**確認方法**:
- Google Cloud Consoleでクォータ使用状況を確認
- クォータエラーが発生した場合、同期間隔を延長

---

## まとめ

**自動同期のタイミング**:

1. **データベース → スプレッドシート**: **即時**（数秒以内）
2. **スプレッドシート → データベース**: **5分ごと**（定期実行）

**キャッシュ**:
- スプレッドシートデータは**15分間キャッシュ**される

**手動同期**:
- APIエンドポイント: `/api/sync/manual`
- スクリプト: `npx ts-node backend/run-full-sync-once.ts`

**このタイミングを理解することで、データの同期状態を正確に把握できます。**

---

**最終更新日**: 2026年1月30日  
**作成理由**: 自動同期のタイミングを明確化し、ユーザーの疑問を解消するため
