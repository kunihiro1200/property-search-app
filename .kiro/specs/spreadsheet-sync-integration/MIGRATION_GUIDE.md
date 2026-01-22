# 初回データ移行ガイド

このガイドでは、Googleスプレッドシートから Supabase への初回データ移行手順を説明します。

## 前提条件

1. Google Sheets API の設定が完了していること（SETUP_GUIDE.md 参照）
2. 環境変数が正しく設定されていること
3. Supabase データベースが稼働していること
4. マイグレーション 026, 027 が実行済みであること

## 移行手順

### ステップ1: 環境確認

```bash
# バックエンドディレクトリに移動
cd backend

# 環境変数を確認
cat .env | grep GOOGLE
cat .env | grep SUPABASE
```

必要な環境変数:
- `GOOGLE_SHEETS_SPREADSHEET_ID`
- `GOOGLE_SHEETS_SHEET_NAME`
- `GOOGLE_SERVICE_ACCOUNT_EMAIL`
- `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

### ステップ2: 接続テスト

```bash
# Google Sheets API 接続テスト
npx ts-node src/scripts/test-sheets-connection.ts
```

期待される出力:
```
✓ Google Sheets API 認証成功
✓ スプレッドシートへのアクセス成功
✓ シート '売主リスト' が見つかりました
✓ ヘッダー行を読み取りました: 売主番号, 氏名, 住所, ...
✓ データ行数: 10000
```

### ステップ3: ドライラン実行（テスト環境）

実際にデータを挿入せず、移行プロセスをシミュレートします。

```bash
# ドライランモードで移行スクリプトを実行
npx ts-node src/scripts/migrate-from-spreadsheet.ts --dry-run
```

確認事項:
- [ ] エラーが発生していないか
- [ ] バリデーションエラーの件数は許容範囲か
- [ ] 重複データの検出は正しいか
- [ ] 処理時間は5分以内か

### ステップ4: スナップショット作成

移行前に現在のデータのスナップショットを作成します（ロールバック用）。

```bash
# API経由でスナップショットを作成
curl -X POST http://localhost:3001/api/sync/snapshot \
  -H "Content-Type: application/json" \
  -d '{"description": "移行前スナップショット"}'
```

または、フロントエンドの「スプレッドシート同期管理」ページから作成できます。

### ステップ5: 本番移行実行

**注意**: この操作は本番データベースに影響します。必ずバックアップを取得してから実行してください。

```bash
# 本番移行を実行
npx ts-node src/scripts/migrate-from-spreadsheet.ts
```

移行中の出力例:
```
Starting migration from spreadsheet...
Batch 1/100: Processing rows 1-100...
Batch 1/100: 98 succeeded, 2 failed
Batch 2/100: Processing rows 101-200...
...
Migration completed!
Total rows: 10000
Success: 9950
Failures: 50
Duration: 4m 32s
```

### ステップ6: データ検証

移行後、データの整合性を確認します。

```bash
# 移行結果を検証
npx ts-node src/scripts/verify-migration.ts
```

確認項目:
- [ ] Supabase のレコード数がスプレッドシートと一致するか
- [ ] 売主番号の重複がないか
- [ ] 必須フィールドが正しく移行されているか
- [ ] 日付フィールドのフォーマットが正しいか

### ステップ7: 移行レポート確認

移行結果のレポートを確認します。

```bash
# 同期ログを確認
curl http://localhost:3001/api/sync/history?limit=10
```

または、フロントエンドの「同期履歴」タブで確認できます。

## トラブルシューティング

### エラー: 認証失敗

```
Error: Unable to authenticate with Google Sheets API
```

**解決策**:
1. サービスアカウントキーが正しいか確認
2. スプレッドシートにサービスアカウントが編集者として追加されているか確認
3. Google Sheets API が有効化されているか確認

### エラー: レート制限超過

```
Error: Rate limit exceeded
```

**解決策**:
1. バッチサイズを小さくする（デフォルト: 100）
2. リトライ間隔を長くする
3. 時間をおいて再実行

### エラー: バリデーションエラー

```
Validation error: Invalid phone number format
```

**解決策**:
1. エラーログを確認して該当レコードを特定
2. スプレッドシートのデータを修正
3. 再度移行を実行（重複チェックにより既存データはスキップされます）

### エラー: 重複データ

```
Error: Duplicate seller_number: AA123
```

**解決策**:
1. 重複している売主番号を確認
2. スプレッドシートで重複を解消
3. または、`--skip-duplicates` オプションを使用

## ロールバック手順

移行に問題があった場合、スナップショットからロールバックできます。

```bash
# スナップショット一覧を取得
curl http://localhost:3001/api/sync/snapshots

# ロールバックを実行
curl -X POST http://localhost:3001/api/sync/rollback \
  -H "Content-Type: application/json" \
  -d '{"snapshotId": "SNAPSHOT_ID"}'
```

または、フロントエンドの「スナップショット」タブから実行できます。

## 移行後の設定

### 自動同期の有効化

移行完了後、ブラウザでの編集を自動的にスプレッドシートに同期する設定を確認します。

1. `SellerService.supabase.ts` で `SyncQueue` が設定されていることを確認
2. バックエンドサーバーを再起動
3. テスト用の売主を作成して同期が動作することを確認

### 監視とアラート

1. 同期ステータスを定期的に確認
2. エラーログを監視
3. レート制限の使用状況を確認

## パフォーマンス最適化

### 大量データの移行

10,000行以上のデータを移行する場合:

1. バッチサイズを調整（推奨: 50-100）
2. 並列処理を有効化（オプション）
3. データベース接続プールを増やす

### 移行時間の短縮

- 不要なフィールドを除外
- インデックスを一時的に無効化（移行後に再作成）
- バッチ処理の最適化

## チェックリスト

移行前:
- [ ] Google Sheets API 設定完了
- [ ] 環境変数設定完了
- [ ] 接続テスト成功
- [ ] ドライラン実行成功
- [ ] スナップショット作成完了

移行中:
- [ ] 進行状況を監視
- [ ] エラーログを確認
- [ ] レート制限を監視

移行後:
- [ ] データ検証完了
- [ ] 移行レポート確認
- [ ] 自動同期テスト完了
- [ ] 監視設定完了

## サポート

問題が発生した場合:
1. エラーログを確認（`/api/sync/errors`）
2. 同期履歴を確認（`/api/sync/history`）
3. TROUBLESHOOTING.md を参照
4. 必要に応じてロールバックを実行
