# Phase 4 Task 4.3: マイグレーションスクリプト

**日付:** 2025-01-09  
**ステータス:** ✅ 完了  
**優先度:** High  
**実装時間:** 1日

## 📋 概要

既存の物件リスト同期システムから新しいREST API同期システムへの移行を安全に実行するためのマイグレーションスクリプトとガイドです。

## 🎯 目的

- 既存システムから新システムへのスムーズな移行
- データ整合性の保証
- ロールバック機能の提供
- 移行プロセスの監視とログ記録

## 📦 マイグレーションスクリプト

### 1. データ整合性チェックスクリプト

**ファイル:** `backend/migrations/verify-property-listing-sync-migration.ts`

このスクリプトは、マイグレーション前にデータベースの状態を検証します。

**主な機能:**
- 物件リストの総数確認
- 同期状態テーブルの存在確認
- 重複レコードのチェック
- 必須フィールドのチェック
- 最終同期時刻の確認

**実行方法:**
```bash
cd backend
npm run ts-node migrations/verify-property-listing-sync-migration.ts
```

**期待される出力:**
```
🔍 物件リスト同期システム マイグレーション前チェック開始...

📊 データ整合性チェック結果:
================================
総レコード数: 1000
同期済み: 950
保留中: 45
エラー: 5
================================

✅ データ整合性チェック: 合格
```

### 2. マイグレーション実行スクリプト

**ファイル:** `backend/migrations/migrate-to-rest-sync.ts`

このスクリプトは、実際のマイグレーションを実行します。

**主な機能:**
- バックアップ作成
- 既存の同期状態のクリーンアップ
- 新しい同期状態の初期化
- 初回同期の実行
- 検証

**実行モード:**

#### ドライランモード（推奨）
```bash
npm run ts-node migrations/migrate-to-rest-sync.ts -- --dry-run
```

#### 本番実行（バックアップ付き）
```bash
npm run ts-node migrations/migrate-to-rest-sync.ts
```

#### 本番実行（バックアップなし - 非推奨）
```bash
npm run ts-node migrations/migrate-to-rest-sync.ts -- --skip-backup
```

#### カスタムバッチサイズ
```bash
npm run ts-node migrations/migrate-to-rest-sync.ts -- --batch-size=50
```

**期待される出力:**
```
🚀 マイグレーション開始...
モード: 本番実行
バッチサイズ: 100

📦 バックアップ作成中...
✅ バックアップ作成完了: property_listings_backup_2025-01-09T12-00-00

🧹 古い同期状態をクリーンアップ中...
✅ クリーンアップ完了

🔧 新しい同期状態を初期化中...
  1000 件の物件リストを処理中...
  進捗: 100/1000
  進捗: 200/1000
  ...
✅ 同期状態初期化完了

🔄 初回同期を実行中...
✅ 初回同期完了

🔍 マイグレーション検証中...

📊 マイグレーション結果:
================================
完了: 995
保留: 0
失敗: 5
================================

✅ マイグレーション完了!
```

### 3. ロールバックスクリプト

**ファイル:** `backend/migrations/rollback-rest-sync.ts`

このスクリプトは、問題が発生した場合にマイグレーションをロールバックします。

**主な機能:**
- バックアップテーブルの検索
- 現在のデータのクリア
- バックアップからのデータ復元
- 同期状態のクリーンアップ

**実行方法:**

#### ドライランモード
```bash
npm run ts-node migrations/rollback-rest-sync.ts -- --dry-run
```

#### 本番実行（最新のバックアップから復元）
```bash
npm run ts-node migrations/rollback-rest-sync.ts
```

#### 特定のバックアップから復元
```bash
npm run ts-node migrations/rollback-rest-sync.ts -- --backup-table=property_listings_backup_2025-01-09T12-00-00
```

**期待される出力:**
```
🔙 ロールバック開始...
モード: 本番実行

📦 バックアップテーブル: property_listings_backup_2025-01-09T12-00-00

🧹 現在のデータをクリア中...
✅ データクリア完了

📥 バックアップからデータを復元中...
✅ データ復元完了

🧹 同期状態をクリーンアップ中...
✅ クリーンアップ完了

✅ ロールバック完了!
```

## 📝 実行手順

### ステップ1: マイグレーション前チェック

```bash
cd backend
npm run ts-node migrations/verify-property-listing-sync-migration.ts
```

**確認事項:**
- ✅ データ整合性チェックが合格
- ✅ 警告がある場合は内容を確認
- ✅ 問題がある場合は解決してから次へ

### ステップ2: ドライラン実行

```bash
npm run ts-node migrations/migrate-to-rest-sync.ts -- --dry-run
```

**確認事項:**
- ✅ エラーが発生しない
- ✅ 処理時間が許容範囲内
- ✅ ログに異常がない

### ステップ3: 本番マイグレーション実行

```bash
# バックアップ付きで実行（推奨）
npm run ts-node migrations/migrate-to-rest-sync.ts

# または、カスタムバッチサイズで実行
npm run ts-node migrations/migrate-to-rest-sync.ts -- --batch-size=50
```

**確認事項:**
- ✅ バックアップが作成される
- ✅ 進捗が表示される
- ✅ エラーが最小限
- ✅ 完了メッセージが表示される

### ステップ4: 検証

マイグレーション後、以下を確認します:

```bash
# 同期状態を確認
npm run ts-node migrations/verify-property-listing-sync-migration.ts

# 新しい同期システムをテスト
npm run ts-node test-new-sync-system.ts
```

### ステップ5: ロールバック（必要な場合）

問題が発生した場合:

```bash
# ドライランで確認
npm run ts-node migrations/rollback-rest-sync.ts -- --dry-run

# 本番実行
npm run ts-node migrations/rollback-rest-sync.ts
```

## 🔍 検証項目

### マイグレーション前

- [ ] データベース接続の確認
- [ ] 同期状態テーブルの存在確認
- [ ] 物件リストの総数確認
- [ ] 重複レコードのチェック
- [ ] 必須フィールドのチェック

### マイグレーション後

- [ ] すべての物件リストが同期されたか
- [ ] 同期状態が正しく記録されているか
- [ ] エラーが発生した物件リストの確認
- [ ] データ整合性の確認
- [ ] パフォーマンスの確認

## 📊 監視とログ

### ログファイル

マイグレーション実行時、以下のログファイルが生成されます:

- `logs/migration-{timestamp}.log` - マイグレーションログ
- `logs/migration-errors-{timestamp}.log` - エラーログ

### 監視項目

- 同期完了率
- エラー発生率
- 平均同期時間
- リソース使用率（CPU、メモリ）

## 🚨 トラブルシューティング

### 問題: マイグレーションが途中で停止する

**原因:** ネットワークエラーまたはタイムアウト

**解決策:**
1. ネットワーク接続を確認
2. バッチサイズを小さくして再実行
   ```bash
   npm run ts-node migrations/migrate-to-rest-sync.ts -- --batch-size=50
   ```
3. タイムアウト設定を増やす（環境変数で設定）

### 問題: 一部の物件リストが同期されない

**原因:** データ形式の問題またはバリデーションエラー

**解決策:**
1. エラーログを確認
   ```bash
   cat logs/migration-errors-{timestamp}.log
   ```
2. 該当する物件リストのデータを修正
3. 個別に再同期を実行
   ```bash
   npm run ts-node sync-specific-properties.ts -- AA12345 AA12346
   ```

### 問題: ロールバックが失敗する

**原因:** バックアップテーブルが見つからない

**解決策:**
1. バックアップテーブルの存在を確認
   ```bash
   npm run ts-node check-backup-tables.ts
   ```
2. 手動でバックアップテーブルを指定
   ```bash
   npm run ts-node migrations/rollback-rest-sync.ts -- --backup-table=property_listings_backup_2025-01-09T12-00-00
   ```
3. データベースの手動復元を検討

### 問題: パフォーマンスが低下する

**原因:** バッチサイズが大きすぎる、またはレート制限

**解決策:**
1. バッチサイズを調整
   ```bash
   npm run ts-node migrations/migrate-to-rest-sync.ts -- --batch-size=25
   ```
2. レート制限の設定を確認（環境変数）
3. 同時実行数を減らす

## 📚 関連ドキュメント

- [Phase 4 要件](./PHASE_4_REQUIREMENTS.md)
- [統合テスト](./PHASE_4_TASK_4.1_INTEGRATION_TESTS.md)
- [ロードテスト](./PHASE_4_TASK_4.2_LOAD_TESTS.md)
- [API ドキュメント](./API_DOCUMENTATION.md)

## ✅ 完了基準

- [ ] マイグレーション前チェックスクリプトが正常に動作する
- [ ] マイグレーション実行スクリプトが正常に動作する
- [ ] ロールバックスクリプトが正常に動作する
- [ ] すべての検証項目をパスする
- [ ] ドキュメントが完成している
- [ ] 実行手順が明確である

## 🎯 次のステップ

1. **マイグレーションスクリプトの実装**
   - `verify-property-listing-sync-migration.ts` の作成
   - `migrate-to-rest-sync.ts` の作成
   - `rollback-rest-sync.ts` の作成

2. **テスト実行**
   - ドライランモードでテスト
   - 小規模データセットでテスト
   - 本番環境でテスト

3. **ドキュメント更新**
   - 実行結果を記録
   - トラブルシューティングガイドを更新
   - ベストプラクティスを追加

---

**作成日:** 2025-01-09  
**最終更新:** 2025-01-09  
**ステータス:** 📋 実装ガイド作成完了  
**次のタスク:** マイグレーションスクリプトの実装
