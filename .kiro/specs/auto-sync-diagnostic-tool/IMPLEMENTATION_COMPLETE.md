# 自動同期診断ツール - 実装完了

## 概要

自動同期システムの健全性を診断するコマンドラインツールを実装しました。このツールは同期ログ、データの鮮度、エラー状況、環境変数を確認し、問題の特定と解決策を提示します。

## 実装内容

### 1. 診断スクリプト
**ファイル:** `backend/diagnose-auto-sync-status.ts`

以下の診断項目を実装:
- ✅ 同期ログの確認（最新10件）
- ✅ 物件リストの最終更新確認
- ✅ 買主リストの最終更新確認
- ✅ データ件数の確認
- ✅ エラーログの分析（最新5件）
- ✅ 環境変数の確認
- ✅ 推奨アクションの提示

### 2. npm スクリプト
**ファイル:** `backend/package.json`

追加したスクリプト:
```json
{
  "scripts": {
    "diagnose-sync": "ts-node diagnose-auto-sync-status.ts"
  }
}
```

### 3. ユーザーガイド
**ファイル:** `backend/AUTO_SYNC_DIAGNOSTIC_GUIDE.md`

以下の内容を含む:
- 実行方法
- 診断項目の説明
- 出力例（正常時・異常時）
- トラブルシューティング
- 定期的な診断の推奨

### 4. Spec ドキュメント
**ディレクトリ:** `.kiro/specs/auto-sync-diagnostic-tool/`

作成したファイル:
- `requirements.md` - 要件定義
- `design.md` - 設計ドキュメント
- `tasks.md` - タスク一覧

## 使用方法

### 基本的な実行
```bash
cd backend
npm run diagnose-sync
```

### 直接実行
```bash
cd backend
npx ts-node diagnose-auto-sync-status.ts
```

## 診断項目の詳細

### 1. 同期ログの確認
- sync_logsテーブルから最新10件を取得
- 最新の同期のタイプ、ステータス、時刻、メッセージを表示
- ログが存在しない場合は警告

### 2. データの鮮度チェック
- property_listingsとbuyersテーブルの最終更新日時を確認
- 現在時刻との差分を計算（時間単位）
- 24時間以上更新されていない場合は警告

### 3. データ件数の確認
- property_listingsとbuyersテーブルの総レコード数を表示
- データの存在を確認

### 4. エラーログの分析
- sync_logsテーブルからstatus='error'のレコードを最新5件取得
- エラーのタイプ、時刻、メッセージを表示
- エラーがない場合は成功メッセージ

### 5. 環境変数の確認
以下の環境変数の設定状況を確認:
- `GOOGLE_SHEETS_SPREADSHEET_ID`
- `GOOGLE_SERVICE_ACCOUNT_EMAIL`
- `GOOGLE_PRIVATE_KEY`

### 6. 推奨アクションの提示
診断結果に基づいて以下のアクションを提示:
1. 同期ログが古い場合 → 自動同期の停止を疑う
2. エラーログがある場合 → エラー内容を確認
3. 環境変数が未設定の場合 → .envファイルを確認
4. 手動同期の実行方法を提示

## 出力例

### 正常な状態
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
```

### 問題がある状態
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
⚠️ 最近のエラー 2 件:

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

## トラブルシューティング

### 同期ログが見つからない
**原因:** 自動同期が一度も実行されていない、またはsync_logsテーブルが存在しない

**解決策:**
1. 手動同期を実行: `npm run sync-property-listings`
2. マイグレーションの実行状況を確認

### 24時間以上更新されていない
**原因:** 自動同期が停止している、またはスプレッドシートに新しいデータがない

**解決策:**
1. バックエンドサーバーが起動しているか確認
2. `AUTO_SYNC_ENABLED=true` が設定されているか確認
3. 手動同期で問題を特定

### 環境変数が未設定
**原因:** .envファイルに必要な変数が記載されていない

**解決策:**
1. `backend/.env` ファイルを確認
2. 必要な環境変数を追加
3. バックエンドサーバーを再起動

## 定期的な診断の推奨

以下のタイミングで診断を実行することを推奨:
- 新しいデータが反映されない場合
- 週に1回の定期チェック
- デプロイ後の動作確認
- エラー報告があった場合

## 関連ファイル

### 実装ファイル
- `backend/diagnose-auto-sync-status.ts` - 診断スクリプト本体
- `backend/package.json` - npm スクリプト定義
- `backend/AUTO_SYNC_DIAGNOSTIC_GUIDE.md` - ユーザーガイド

### Spec ファイル
- `.kiro/specs/auto-sync-diagnostic-tool/requirements.md` - 要件定義
- `.kiro/specs/auto-sync-diagnostic-tool/design.md` - 設計ドキュメント
- `.kiro/specs/auto-sync-diagnostic-tool/tasks.md` - タスク一覧
- `.kiro/specs/auto-sync-diagnostic-tool/IMPLEMENTATION_COMPLETE.md` - このファイル

## 次のステップ

1. ✅ 診断スクリプトの作成
2. ✅ npm スクリプトの追加
3. ✅ ユーザーガイドの作成
4. ✅ Spec ドキュメントの作成
5. ⏳ 実際の環境でテスト実行
6. ⏳ 問題が見つかった場合の修正

## テスト方法

### 正常系テスト
```bash
# 1. バックエンドサーバーを起動
cd backend
npm run dev

# 2. 別のターミナルで診断を実行
npm run diagnose-sync
```

### 異常系テスト
```bash
# 1. 環境変数を一時的に削除してテスト
# .envファイルから一部の変数をコメントアウト

# 2. 診断を実行
npm run diagnose-sync

# 3. 警告メッセージが表示されることを確認
```

## まとめ

自動同期診断ツールの実装が完了しました。このツールにより、自動同期システムの問題を迅速に特定し、適切な対処を行うことができます。

定期的に診断を実行することで、データの鮮度を保ち、システムの健全性を維持できます。
