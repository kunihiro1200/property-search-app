# 売主自動同期のローカルテストガイド

## 概要

このガイドでは、Vercel Cron Jobで実行される売主自動同期処理をローカル環境でテストする方法を説明します。

---

## 前提条件

- Node.js がインストールされている
- `.env.local` ファイルが設定されている
- 以下の環境変数が設定されている:
  - `SUPABASE_URL`
  - `SUPABASE_SERVICE_KEY`
  - `GOOGLE_SHEETS_SPREADSHEET_ID`
  - `GOOGLE_SHEETS_SHEET_NAME`
  - `GOOGLE_SERVICE_ACCOUNT_KEY_PATH` または `GOOGLE_SERVICE_ACCOUNT_JSON`

---

## テスト方法

### 方法1: テストスクリプトを実行（推奨）

```bash
cd backend
npx ts-node test-cron-sync-sellers.ts
```

**このスクリプトは以下を実行します:**
1. EnhancedAutoSyncServiceを初期化
2. フル同期を実行（追加 + 更新 + 削除）
3. 同期結果を表示
4. AA13481の査定額を確認

**期待される出力:**
```
=== 売主自動同期のローカルテスト ===

📅 実行日時: 2026/1/27 15:30:00

✅ EnhancedAutoSyncService initialized

🔄 Starting full sync (addition + update + deletion)...

📥 Phase 1: Seller Addition Sync
✅ No missing sellers to sync

🔄 Phase 2: Seller Update Sync
🔄 Updating 1 existing sellers...
✅ AA13481: Updated
🎉 Update completed: 1 updated, 0 errors

🗑️  Phase 3: Seller Deletion Sync
✅ No deleted sellers to sync

=== 同期結果 ===

📊 ステータス: success
⏱️  処理時間: 5.23 秒

📥 追加・更新結果:
   処理件数: 1
   追加成功: 0
   更新成功: 1
   失敗: 0

🗑️  削除結果:
   検出件数: 0
   削除成功: 0
   削除失敗: 0
   手動確認必要: 0

=== AA13481の査定額確認 ===

売主番号: AA13481
査定額1: 1,510万円
査定額2: 1,810万円
査定額3: 2,160万円

✅ 査定額が正常に同期されています！

=== テスト完了 ===
```

---

### 方法2: 既存のテストスクリプトを実行

```bash
cd backend
npx ts-node test-sync-aa13481.ts
```

**このスクリプトは以下を実行します:**
1. AA13481のみを同期
2. 同期後のデータベースの査定額を確認

---

### 方法3: バックエンドサーバーを起動してcronエンドポイントを呼び出す

#### ステップ1: バックエンドサーバーを起動

```bash
cd backend
npm run dev
```

#### ステップ2: cronエンドポイントを呼び出す

別のターミナルで以下を実行:

```bash
curl http://localhost:3000/api/cron/sync-sellers
```

**期待されるレスポンス:**
```json
{
  "success": true,
  "status": "success",
  "additionResult": {
    "totalProcessed": 1,
    "successfullyAdded": 0,
    "successfullyUpdated": 1,
    "failed": 0
  },
  "deletionResult": {
    "totalDetected": 0,
    "successfullyDeleted": 0,
    "failedToDelete": 0,
    "requiresManualReview": 0
  },
  "duration": 5234,
  "syncedAt": "2026-01-27T06:30:00.000Z"
}
```

---

## 確認事項

### 1. AA13481の査定額が同期されているか確認

```bash
cd backend
npx ts-node check-aa13481-valuation.ts
```

**期待される出力:**
```
=== AA13481 査定額確認 ===

📊 データベースの査定額:
{
  "seller_number": "AA13481",
  "valuation_amount_1": 15100000,
  "valuation_amount_2": 18100000,
  "valuation_amount_3": 21600000
}

✅ 査定額が正常に同期されています！
```

### 2. 自動同期が定期的に実行されているか確認（本番環境）

Vercel Dashboardで確認:
1. https://vercel.com/kunihiro1200s-projects/property-site-frontend/deployments
2. Functions → `/api/cron/sync-sellers`
3. ログを確認

**期待されるログ:**
```
[Cron] Starting seller sync job...
[Cron] Running full sync (addition + update + deletion)...
[Cron] Seller sync job completed: {
  status: 'success',
  added: 0,
  updated: 1,
  deleted: 0,
  duration: 5234
}
```

---

## トラブルシューティング

### 問題1: 環境変数が設定されていない

**エラー:**
```
❌ 環境変数が設定されていません
   SUPABASE_URL: ❌
   SUPABASE_SERVICE_KEY: ❌
```

**解決策:**
1. `backend/.env.local`ファイルを確認
2. 以下の環境変数が設定されているか確認:
   ```
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_SERVICE_KEY=your-service-key
   GOOGLE_SHEETS_SPREADSHEET_ID=1wKBRLWbT6pSKa9IlTDabjhjTnfs_GxX6Rn6M6kbio1I
   GOOGLE_SHEETS_SHEET_NAME=売主リスト
   GOOGLE_SERVICE_ACCOUNT_KEY_PATH=./google-service-account.json
   ```

### 問題2: Google Sheets APIの認証エラー

**エラー:**
```
❌ EnhancedAutoSyncService initialization failed: Authentication failed
```

**解決策:**
1. `backend/google-service-account.json`ファイルが存在するか確認
2. サービスアカウントに適切な権限があるか確認
3. スプレッドシートがサービスアカウントと共有されているか確認

### 問題3: 査定額が同期されない

**原因:**
- スプレッドシートのカラム名が間違っている
- データ形式が間違っている（例：「1510万円」ではなく「1510」）

**確認方法:**
```bash
cd backend
npx ts-node check-aa13481-valuation.ts
```

**解決策:**
1. スプレッドシートのカラム名を確認:
   - `査定額1（自動計算）v`
   - `査定額2（自動計算）v`
   - `査定額3（自動計算）v`
2. データ形式を確認（数値のみ、単位なし）

---

## 本番環境へのデプロイ

ローカルテストが成功したら、本番環境にデプロイします。

### ステップ1: GitHubにプッシュ

```bash
git add backend/api/index.ts vercel.json
git commit -m "Add: Seller auto-sync cron job (runs every 15 minutes)"
git push
```

### ステップ2: Vercelで自動デプロイ

Vercelが自動的にデプロイします（約2-3分）。

### ステップ3: Vercel Dashboardで確認

1. https://vercel.com/kunihiro1200s-projects/property-site-frontend/deployments
2. 最新のデプロイメントをクリック
3. Functions → `/api/cron/sync-sellers`
4. ログを確認

### ステップ4: Cron Jobが実行されるまで待つ

Cron Jobは15分ごとに実行されます（`*/15 * * * *`）。

次回の実行時刻を確認:
- 現在時刻が14:07の場合 → 次回は14:15
- 現在時刻が14:18の場合 → 次回は14:30

---

## まとめ

### 実装完了

- ✅ `/api/cron/sync-sellers`エンドポイントが実装されている
- ✅ `vercel.json`にCron Job設定が追加されている（15分ごと）
- ✅ `EnhancedAutoSyncService.runFullSync()`が実装されている

### ローカルテスト方法

1. **推奨**: `npx ts-node test-cron-sync-sellers.ts`
2. **代替**: `npx ts-node test-sync-aa13481.ts`
3. **代替**: バックエンドサーバーを起動して`curl http://localhost:3000/api/cron/sync-sellers`

### 本番環境デプロイ

1. GitHubにプッシュ
2. Vercelが自動デプロイ
3. 15分ごとに自動実行される

---

**最終更新日**: 2026年1月27日  
**ステータス**: ✅ 実装完了・ローカルテスト待ち
