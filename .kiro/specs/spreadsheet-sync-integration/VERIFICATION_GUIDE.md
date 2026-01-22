# スプレッドシート同期統合機能 - 動作確認ガイド

このガイドでは、実装済みのスプレッドシート同期統合機能の動作確認手順を説明します。

## 📋 目次

1. [事前準備](#事前準備)
2. [基本動作確認](#基本動作確認)
3. [APIエンドポイント確認](#apiエンドポイント確認)
4. [フロントエンド確認](#フロントエンド確認)
5. [トラブルシューティング](#トラブルシューティング)

## 事前準備

### 1. 環境変数の確認

以下の環境変数が`.env`ファイルに設定されていることを確認してください:

```bash
# Supabase
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_KEY=your_service_key

# Google Sheets
GOOGLE_SHEETS_SPREADSHEET_ID=your_spreadsheet_id
GOOGLE_SHEETS_SHEET_NAME=売主リスト

# Google認証 (OAuth 2.0 または Service Account のいずれか)
# OAuth 2.0の場合:
GOOGLE_OAUTH_CLIENT_ID=your_client_id
GOOGLE_OAUTH_CLIENT_SECRET=your_client_secret
GOOGLE_OAUTH_REFRESH_TOKEN=your_refresh_token

# Service Accountの場合:
GOOGLE_SERVICE_ACCOUNT_EMAIL=your_service_account_email
GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY=your_private_key
```

### 2. 依存パッケージのインストール

```bash
cd backend
npm install
```

## 基本動作確認

### ステップ1: 基本機能テスト

このテストでは、以下を確認します:
- 環境変数の設定
- Google Sheets API接続
- Supabase接続
- SpreadsheetSyncServiceの初期化
- 同期ログテーブルの存在
- レート制限機能

```bash
cd backend
npx ts-node test-spreadsheet-sync-verification.ts
```

**期待される出力:**

```
╔════════════════════════════════════════════════════════════╗
║  スプレッドシート同期統合機能 - 動作確認テスト           ║
╚════════════════════════════════════════════════════════════╝

=== Test 1: 環境変数の確認 ===
✓ すべての必要な環境変数が設定されています

=== Test 2: Google Sheets API接続 ===
認証を試行中...
✓ 認証成功
✓ スプレッドシート名: 売主リスト
✓ XXX件のレコードを読み取りました

=== Test 3: Supabase接続 ===
✓ Sellersテーブルにxxx件のレコードがあります

=== Test 4: SpreadsheetSyncServiceの初期化 ===
✓ SpreadsheetSyncServiceを初期化しました
✓ xxx件のデータを取得しました

=== Test 5: 同期ログテーブルの確認 ===
✓ sync_logsテーブルが存在します
✓ error_logsテーブルが存在します

=== Test 6: レート制限の確認 ===
✓ レート制限が正常に動作しています

╔════════════════════════════════════════════════════════════╗
║  テスト結果サマリー                                        ║
╚════════════════════════════════════════════════════════════╝

✓ Test 1: 環境変数の確認 - 成功
✓ Test 2: Google Sheets API接続 - 成功
✓ Test 3: Supabase接続 - 成功
✓ Test 4: SpreadsheetSyncServiceの初期化 - 成功
✓ Test 5: 同期ログテーブルの確認 - 成功
✓ Test 6: レート制限の確認 - 成功

合計: 6件 | 成功: 6件 | 失敗: 0件

🎉 すべてのテストが成功しました！
```

### ステップ2: バックエンドサーバーの起動

```bash
cd backend
npm run dev
```

サーバーが正常に起動したことを確認してください:

```
Server running on http://localhost:3000
```

## APIエンドポイント確認

### ステップ3: APIエンドポイントテスト

**新しいターミナルウィンドウを開いて**以下を実行します:

```bash
cd backend
npx ts-node test-sync-api-endpoints.ts
```

このテストでは、以下のAPIエンドポイントを確認します:

1. `GET /api/sync/status` - 同期ステータスの取得
2. `GET /api/sync/history` - 同期履歴の取得
3. `GET /api/sync/errors` - エラーログの取得
4. `GET /api/sync/rate-limit` - レート制限情報の取得
5. `GET /api/sync/manual/progress` - 手動同期の進行状況
6. `GET /api/sync/snapshots` - スナップショット一覧
7. `GET /api/sync/missing` - 不足している売主の検出
8. `GET /api/sync/periodic/status` - 定期同期のステータス

**期待される出力:**

```
╔════════════════════════════════════════════════════════════╗
║  スプレッドシート同期API - エンドポイントテスト           ║
╚════════════════════════════════════════════════════════════╝

ベースURL: http://localhost:3000
✓ バックエンドサーバーに接続しました

テスト: GET /api/sync/status
✓ ステータスコード: 200
✓ レスポンス: {...}

[... 他のテスト結果 ...]

╔════════════════════════════════════════════════════════════╗
║  APIテスト結果サマリー                                     ║
╚════════════════════════════════════════════════════════════╝

✓ Test 1: GET /api/sync/status
✓ Test 2: GET /api/sync/history
✓ Test 3: GET /api/sync/errors
✓ Test 4: GET /api/sync/rate-limit
✓ Test 5: GET /api/sync/manual/progress
✓ Test 6: GET /api/sync/snapshots
✓ Test 7: GET /api/sync/missing
✓ Test 8: GET /api/sync/periodic/status

合計: 8件 | 成功: 8件 | 失敗: 0件

🎉 すべてのAPIテストが成功しました！
```

### ステップ4: 手動でAPIをテスト（オプション）

curlやPostmanを使用して、個別にAPIをテストすることもできます:

```bash
# 同期ステータスの取得
curl http://localhost:3000/api/sync/status

# 同期履歴の取得
curl http://localhost:3000/api/sync/history?limit=10

# レート制限情報の取得
curl http://localhost:3000/api/sync/rate-limit

# 不足している売主の検出
curl http://localhost:3000/api/sync/missing
```

## フロントエンド確認

### ステップ5: フロントエンドの起動

**新しいターミナルウィンドウを開いて**以下を実行します:

```bash
cd frontend
npm run dev
```

### ステップ6: 同期ページへのアクセス

ブラウザで以下のURLにアクセスします:

```
http://localhost:5173/sync
```

### ステップ7: UI機能の確認

以下の機能が正常に動作することを確認してください:

1. **同期ステータス表示**
   - 最終同期時刻
   - 同期レコード数
   - エラー件数

2. **手動同期トリガー**
   - 「手動同期を実行」ボタンをクリック
   - 進行状況が表示されること
   - 完了後にステータスが更新されること

3. **同期履歴表示**
   - 過去の同期履歴が表示されること
   - 各履歴の詳細情報が確認できること

4. **エラーログ表示**
   - エラーがある場合、詳細が表示されること
   - エラーの種類と内容が確認できること

## トラブルシューティング

### 問題1: Google Sheets API認証エラー

**症状:**
```
Google Sheets authentication failed: ...
```

**解決方法:**
1. 環境変数が正しく設定されているか確認
2. OAuth 2.0の場合、リフレッシュトークンが有効か確認
3. Service Accountの場合、秘密鍵の改行が正しく処理されているか確認
4. スプレッドシートにサービスアカウントが共有されているか確認

### 問題2: Supabase接続エラー

**症状:**
```
Failed to connect to Supabase
```

**解決方法:**
1. `SUPABASE_URL`と`SUPABASE_SERVICE_KEY`が正しいか確認
2. Supabaseプロジェクトが稼働しているか確認
3. ネットワーク接続を確認

### 問題3: テーブルが存在しないエラー

**症状:**
```
relation "sync_logs" does not exist
```

**解決方法:**
1. マイグレーションを実行:
```bash
cd backend
npx ts-node migrations/run-026-migration.ts
```

### 問題4: レート制限エラー

**症状:**
```
Rate limit exceeded
```

**解決方法:**
1. レート制限をリセット:
```bash
curl -X POST http://localhost:3000/api/sync/rate-limit/reset
```
2. しばらく待ってから再試行

### 問題5: バックエンドサーバーに接続できない

**症状:**
```
✗ バックエンドサーバーに接続できません
```

**解決方法:**
1. バックエンドサーバーが起動しているか確認
2. ポート3000が使用可能か確認
3. ファイアウォール設定を確認

## 次のステップ

すべてのテストが成功したら、以下のドキュメントを参照してください:

- [運用マニュアル](./OPERATIONS_MANUAL.md) - 日常的な運用手順
- [トラブルシューティングガイド](./TROUBLESHOOTING.md) - 詳細な問題解決方法
- [APIドキュメント](./API_DOCUMENTATION.md) - 全APIエンドポイントの詳細

## サポート

問題が解決しない場合は、以下の情報を含めて報告してください:

1. エラーメッセージの全文
2. 実行したコマンド
3. 環境変数の設定状況（機密情報は除く）
4. テスト結果の出力
5. バックエンドサーバーのログ
