# トラブルシューティングガイド

スプレッドシート同期機能で発生する可能性のある問題と解決方法を説明します。

## 目次

1. [認証関連の問題](#認証関連の問題)
2. [同期関連の問題](#同期関連の問題)
3. [パフォーマンス関連の問題](#パフォーマンス関連の問題)
4. [データ関連の問題](#データ関連の問題)
5. [API関連の問題](#api関連の問題)

---

## 認証関連の問題

### 問題: "Unable to authenticate with Google Sheets API"

**症状**:
- 接続テストが失敗する
- すべての同期操作が失敗する
- エラーログに `error_type: auth` が記録される

**原因**:
1. サービスアカウントキーが無効または期限切れ
2. 環境変数が正しく設定されていない
3. Google Sheets API が無効化されている

**解決方法**:

1. **環境変数を確認**:
   ```bash
   cd backend
   cat .env | grep GOOGLE
   ```
   
   必要な変数:
   - `GOOGLE_SERVICE_ACCOUNT_EMAIL`
   - `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY`
   - `GOOGLE_SHEETS_SPREADSHEET_ID`
   - `GOOGLE_SHEETS_SHEET_NAME`

2. **サービスアカウントキーを確認**:
   - Google Cloud Console にアクセス
   - IAM & Admin > Service Accounts
   - サービスアカウントが存在し、有効であることを確認
   - 必要に応じて新しいキーを作成

3. **Google Sheets API を確認**:
   - Google Cloud Console > APIs & Services > Library
   - "Google Sheets API" を検索
   - 有効化されていることを確認

4. **接続テストを実行**:
   ```bash
   npx ts-node src/scripts/test-sheets-connection.ts
   ```

### 問題: "Permission denied"

**症状**:
- スプレッドシートの読み取りまたは書き込みが失敗する
- エラーメッセージに "403" または "Permission denied" が含まれる

**原因**:
- スプレッドシートにサービスアカウントが追加されていない
- サービスアカウントの権限が不足している

**解決方法**:

1. **スプレッドシートの共有設定を確認**:
   - Google Sheets でスプレッドシートを開く
   - 右上の「共有」ボタンをクリック
   - サービスアカウントのメールアドレスが「編集者」として追加されているか確認

2. **サービスアカウントを追加**:
   - サービスアカウントのメールアドレスをコピー（例: `xxx@xxx.iam.gserviceaccount.com`）
   - スプレッドシートの共有設定で追加
   - 権限を「編集者」に設定

---

## 同期関連の問題

### 問題: "Sync is already running"

**症状**:
- 手動同期を開始しようとすると "Sync is already running" エラーが表示される
- 実際には同期が実行されていないように見える

**原因**:
- 前回の同期が正常に終了しなかった
- サーバーがクラッシュした

**解決方法**:

1. **進行状況を確認**:
   ```bash
   curl http://localhost:3001/api/sync/manual/progress
   ```

2. **バックエンドサーバーを再起動**:
   ```bash
   # Windows
   taskkill /F /IM node.exe
   npm run dev
   
   # または start-dev.bat を使用
   ```

3. **再度同期を試行**

### 問題: 同期が途中で停止する

**症状**:
- 進行状況が途中で止まる
- エラーログに記録がない

**原因**:
- ネットワークタイムアウト
- メモリ不足
- レート制限

**解決方法**:

1. **エラーログを確認**:
   ```bash
   curl http://localhost:3001/api/sync/errors?limit=10
   ```

2. **レート制限を確認**:
   ```bash
   curl http://localhost:3001/api/sync/rate-limit
   ```

3. **バッチサイズを小さくする**:
   - `ManualSyncService.ts` の `batchSize` を 100 → 50 に変更
   - サーバーを再起動

4. **メモリを確認**:
   ```bash
   # Windows
   tasklist /FI "IMAGENAME eq node.exe"
   ```

### 問題: 一部のレコードが同期されない

**症状**:
- 同期は成功するが、一部のレコードがスプレッドシートに反映されない
- エラーログに特定のレコードのエラーが記録される

**原因**:
- データ検証エラー
- 売主番号の重複
- 必須フィールドの欠落

**解決方法**:

1. **エラーログを確認**:
   ```bash
   curl http://localhost:3001/api/sync/errors?errorType=validation
   ```

2. **該当レコードを特定**:
   - エラーログから `seller_id` を取得
   - Supabase でレコードを確認

3. **データを修正**:
   - 必須フィールドを入力
   - データ形式を修正
   - 重複を解消

4. **差分同期を実行**

---

## パフォーマンス関連の問題

### 問題: 同期が非常に遅い

**症状**:
- 単一レコードの同期に5秒以上かかる
- 全データ同期に10分以上かかる

**原因**:
- ネットワーク遅延
- レート制限に達している
- データベースのパフォーマンス低下

**解決方法**:

1. **レート制限を確認**:
   ```bash
   curl http://localhost:3001/api/sync/rate-limit
   ```
   
   使用率が80%を超えている場合:
   - 手動同期を一時停止
   - バッチサイズを小さくする

2. **ネットワーク接続を確認**:
   ```bash
   ping sheets.googleapis.com
   ```

3. **データベースのパフォーマンスを確認**:
   - Supabase ダッシュボードでクエリのパフォーマンスを確認
   - インデックスが適切に設定されているか確認

4. **バッチ処理を最適化**:
   - `batchUpdate` を使用していることを確認
   - 不要なフィールドを除外

### 問題: "Rate limit exceeded"

**症状**:
- エラーログに `error_type: rate_limit` が記録される
- 同期が頻繁に失敗する

**原因**:
- Google Sheets API のレート制限（100リクエスト/100秒）を超過

**解決方法**:

1. **レート制限をリセット**:
   ```bash
   curl -X POST http://localhost:3001/api/sync/rate-limit/reset
   ```

2. **100秒待機**:
   - レート制限は100秒ごとにリセットされます

3. **バッチサイズを調整**:
   - デフォルト: 100 → 50 に変更
   - または、同期頻度を減らす

4. **再度同期を実行**

---

## データ関連の問題

### 問題: データの不整合

**症状**:
- Supabase とスプレッドシートのデータが一致しない
- 一部のフィールドが空になっている

**原因**:
- 同期の失敗
- カラムマッピングの誤り
- データ型の不一致

**解決方法**:

1. **検証スクリプトを実行**:
   ```bash
   cd backend
   npx ts-node src/scripts/verify-migration.ts
   ```

2. **カラムマッピングを確認**:
   - `backend/src/config/column-mapping.json` を確認
   - スプレッドシートのヘッダー名と一致しているか確認

3. **全データ同期を実行**:
   - フロントエンドから「全データ同期」を実行
   - または API 経由:
     ```bash
     curl -X POST http://localhost:3001/api/sync/manual \
       -H "Content-Type: application/json" \
       -d '{"mode": "full"}'
     ```

### 問題: 売主番号の重複

**症状**:
- エラーログに `error_type: conflict` が記録される
- 同じ売主番号が複数存在する

**原因**:
- 手動でのデータ入力ミス
- 移行時の重複チェック漏れ

**解決方法**:

1. **重複を検出**:
   ```sql
   SELECT seller_number, COUNT(*)
   FROM sellers
   GROUP BY seller_number
   HAVING COUNT(*) > 1;
   ```

2. **重複を解消**:
   - 片方のレコードを削除
   - または、売主番号を変更

3. **差分同期を実行**

### 問題: 日付フィールドが正しく表示されない

**症状**:
- 日付が "Invalid Date" と表示される
- 日付フォーマットが異なる

**原因**:
- 日付フォーマットの不一致
- タイムゾーンの問題

**解決方法**:

1. **カラムマッピングを確認**:
   - `column-mapping.json` の日付フィールドの設定を確認
   - `type: "date"` または `type: "datetime"` が設定されているか確認

2. **日付フォーマットを統一**:
   - スプレッドシート: `YYYY-MM-DD` 形式
   - Supabase: ISO 8601 形式

3. **再同期を実行**

---

## API関連の問題

### 問題: API エンドポイントが応答しない

**症状**:
- API リクエストがタイムアウトする
- 500 エラーが返される

**原因**:
- バックエンドサーバーが停止している
- ポートが使用中
- 環境変数が設定されていない

**解決方法**:

1. **サーバーの状態を確認**:
   ```bash
   # Windows
   netstat -ano | findstr :3001
   ```

2. **サーバーを再起動**:
   ```bash
   cd backend
   npm run dev
   ```

3. **ログを確認**:
   - コンソール出力を確認
   - エラーメッセージを確認

4. **環境変数を確認**:
   ```bash
   cat .env
   ```

### 問題: CORS エラー

**症状**:
- フロントエンドから API を呼び出すと CORS エラーが発生する

**原因**:
- CORS 設定が正しくない
- フロントエンドとバックエンドのポートが異なる

**解決方法**:

1. **CORS 設定を確認**:
   - `backend/src/index.ts` の CORS 設定を確認
   - フロントエンドの URL が許可されているか確認

2. **環境変数を確認**:
   - `FRONTEND_URL` が正しく設定されているか確認

3. **サーバーを再起動**

---

## デバッグ方法

### ログの確認

1. **バックエンドログ**:
   - コンソール出力を確認
   - `console.log` や `console.error` の出力

2. **同期ログ**:
   ```bash
   curl http://localhost:3001/api/sync/history?limit=10
   ```

3. **エラーログ**:
   ```bash
   curl http://localhost:3001/api/sync/errors?limit=10
   ```

### デバッグモードの有効化

1. **環境変数を設定**:
   ```bash
   # .env に追加
   DEBUG=true
   LOG_LEVEL=debug
   ```

2. **サーバーを再起動**

3. **詳細なログが出力されることを確認**

### テストスクリプトの実行

1. **接続テスト**:
   ```bash
   npx ts-node src/scripts/test-sheets-connection.ts
   ```

2. **移行検証**:
   ```bash
   npx ts-node src/scripts/verify-migration.ts
   ```

---

## よくある質問

### Q: 同期はリアルタイムですか？

A: はい、ブラウザでの編集は即座にキューに追加され、順次処理されます。ただし、レート制限により若干の遅延が発生する場合があります。

### Q: スプレッドシートを直接編集した場合、Supabase に反映されますか？

A: いいえ、現在は一方向同期（Supabase → スプレッドシート）のみです。スプレッドシートの編集は Supabase に反映されません。

### Q: 同期に失敗したレコードはどうなりますか？

A: 自動的にリトライされます（最大3回）。それでも失敗した場合はエラーログに記録され、手動で対応が必要です。

### Q: スナップショットはどのくらいの頻度で作成すべきですか？

A: 週次（毎週月曜日）の作成を推奨します。また、大規模なデータ変更の前にも作成してください。

### Q: ロールバックは安全ですか？

A: ロールバックは現在のデータを完全に置き換えます。必ずスナップショット作成後に実行し、慎重に操作してください。

---

## サポート

上記の方法で問題が解決しない場合:

1. **ログを収集**:
   - バックエンドのコンソール出力
   - 同期ログ（`/api/sync/history`）
   - エラーログ（`/api/sync/errors`）

2. **システム情報を収集**:
   - OS バージョン
   - Node.js バージョン
   - 環境変数の設定（機密情報を除く）

3. **連絡先**:
   - システム管理者: [連絡先]
   - 開発チーム: [連絡先]
