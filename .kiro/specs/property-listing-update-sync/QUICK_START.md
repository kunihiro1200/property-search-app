# 物件リスト更新同期 - クイックスタートガイド

## ✅ 実装完了

物件リスト更新同期機能は `EnhancedAutoSyncService` の **Phase 4.5** として実装完了しています。

## 概要

この機能により、スプレッドシートで更新された物件リストデータが自動的にデータベースに同期されます。

### 同期対象
- **スプレッドシート:** `1tI_iXaiLuWBggs5y0RH7qzkbHs9wnLLdRekAmjkhcLY` (物件シート)
- **データベース:** `property_listings` テーブル
- **同期フィールド:** 全フィールド（ATBB状況、格納先URL、その他すべて）

## 自動同期の使い方

### 1. 環境変数の確認

`backend/.env` ファイルで以下が設定されていることを確認:

```env
AUTO_SYNC_ENABLED=true
AUTO_SYNC_INTERVAL_MINUTES=5
```

### 2. バックエンドサーバーの起動

```bash
cd backend
npm run dev
```

または:

```bash
start-dev.bat
```

### 3. 起動ログの確認

以下のメッセージが表示されることを確認:

```
✅ EnhancedAutoSyncService initialized
📊 Enhanced periodic auto-sync enabled (interval: 5 minutes)
🔄 Starting initial sync in 5 seconds...
```

### 4. 初回同期の確認（5秒後）

```
🔄 Starting property listing update sync...
🏢 Phase 4.5: Property Listing Update Sync
✅ Property listing update sync: X updated
```

### 5. 定期同期

5分ごとに自動的に実行されます。

## 手動同期の使い方

緊急時や初回セットアップ時に手動で同期を実行できます。

### 手動同期スクリプトの実行

```bash
npx ts-node backend/sync-property-listings-updates.ts
```

### 出力例

```
🔄 Starting property listing update sync...
📊 Detected 15 property listings with updates
✅ Updated AA9313: atbb_status changed
✅ Updated AA13154: storage_location changed
...
✅ Property listing update sync completed
   - Updated: 15
   - Failed: 0
   - Duration: 2.3s
```

## 特定物件の確認

### AA4885の状態確認

```bash
npx ts-node backend/check-aa4885-atbb-status.ts
```

### 出力例

```
📊 AA4885 Current Status:
   - Database: atbb成約済み/非公開
   - Spreadsheet: atbb成約済み/非公開
   - Status: ✅ Synchronized
```

## トラブルシューティング

### 問題: 起動ログに「Phase 4.5」が表示されない

**原因:** 環境変数が正しく設定されていない

**解決策:**
1. `backend/.env` で `AUTO_SYNC_ENABLED=true` を確認
2. バックエンドサーバーを再起動

### 問題: 同期が実行されない

**原因:** Google Sheets APIの認証エラー

**解決策:**
1. `google-service-account.json` が正しい場所にあるか確認
2. サービスアカウントがスプレッドシートへのアクセス権を持っているか確認
3. コンソールログでエラーメッセージを確認

### 問題: 特定の物件が更新されない

**原因:** データ形式の不一致またはマッピングエラー

**解決策:**
1. スプレッドシートで該当物件のデータを確認
2. 手動同期スクリプトを実行してエラーログを確認
3. `property-listing-column-mapping.json` でマッピングを確認

### 問題: 同期が遅い

**原因:** 大量のデータまたはネットワーク遅延

**解決策:**
1. バッチサイズを調整（現在: 10件ずつ）
2. 同期間隔を調整（現在: 5分）
3. ネットワーク接続を確認

## 同期フロー

```
EnhancedAutoSyncService.runFullSync()
  ├─ Phase 1: Seller Addition Sync
  ├─ Phase 2: Seller Update Sync
  ├─ Phase 3: Seller Deletion Sync
  ├─ Phase 4: Work Task Sync
  └─ Phase 4.5: Property Listing Update Sync ← 物件リスト更新同期
       └─ PropertyListingSyncService.syncUpdatedPropertyListings()
            ├─ detectUpdatedPropertyListings() - 差分検出
            ├─ updatePropertyListing() - 個別更新
            └─ バッチ処理（10件ずつ、100ms遅延）
```

## パフォーマンス

- **処理速度:** 約100件/分
- **バッチサイズ:** 10件
- **バッチ間遅延:** 100ms
- **推定時間:** 1000件で約10分

## 監視

### コンソールログ

同期状況はコンソールログで確認できます:

```
🏢 Phase 4.5: Property Listing Update Sync
✅ Property listing update sync: 15 updated
   Duration: 2.3s
```

### エラーログ

エラーが発生した場合:

```
❌ Property listing update sync failed: [error message]
⚠️  Failed to update AA9313: [error details]
```

## 関連ドキュメント

- **実行ガイド:** `今すぐ実行_物件リスト更新同期修正.md`
- **完了レポート:** `PROPERTY_LISTING_UPDATE_SYNC_COMPLETE.md`
- **統合ドキュメント:** `.kiro/specs/property-listing-auto-sync/requirements.md`
- **タスク一覧:** `.kiro/specs/property-listing-update-sync/tasks.md`
- **要件定義:** `.kiro/specs/property-listing-update-sync/requirements.md`

## よくある質問

### Q: 手動で更新したデータは上書きされますか？

A: はい、スプレッドシートのデータが優先されます。手動で更新したデータを保持したい場合は、スプレッドシートも更新してください。

### Q: 同期間隔を変更できますか？

A: はい、`backend/.env` の `AUTO_SYNC_INTERVAL_MINUTES` を変更してください。

### Q: 特定のフィールドだけ同期できますか？

A: 現在は全フィールドが同期対象です。特定フィールドのみの同期が必要な場合は、カスタムスクリプトを作成してください。

### Q: 同期履歴を確認できますか？

A: 現在はコンソールログのみです。将来的に `sync_logs` テーブルへの記録機能を追加予定です。

## サポート

問題が解決しない場合は、以下の情報を含めて報告してください:

1. エラーメッセージ（コンソールログ）
2. 該当物件番号
3. スプレッドシートのデータ
4. データベースのデータ
5. 実行したコマンド

---

**最終更新:** 2025-01-11  
**バージョン:** 1.0  
**ステータス:** ✅ 実装完了
