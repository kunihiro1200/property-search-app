# スプレッドシート同期統合機能 - セットアップガイド

## 📖 概要

このドキュメントは、スプレッドシート同期統合機能のセットアップと動作確認に関する情報をまとめたものです。

## 🎯 現在の状況

### ✅ 完了済み
- TypeScriptコンパイルエラーの修正
- Supabase接続の確認（8814件の売主レコード確認済み）
- レート制限機能の確認
- 動作確認スクリプトの作成

### ⏳ 実行が必要な作業
1. **Googleサービスアカウントの設定** - JSONファイルの配置とスプレッドシート権限の付与
2. **sync_logsテーブルの作成** - Supabaseでマイグレーションを実行

## 📚 ドキュメント一覧

### 🚀 セットアップ（初めての方はこちら）

| ドキュメント | 説明 | 推奨度 |
|------------|------|--------|
| **[QUICK_START_GUIDE.md](./QUICK_START_GUIDE.md)** | 5分でできるクイックスタート | ⭐⭐⭐ |
| [SETUP_CHECKLIST.md](./SETUP_CHECKLIST.md) | セットアップチェックリスト | ⭐⭐ |
| [GOOGLE_SERVICE_ACCOUNT_SETUP.md](./GOOGLE_SERVICE_ACCOUNT_SETUP.md) | サービスアカウント設定の詳細 | ⭐⭐ |

### 📋 動作確認・運用

| ドキュメント | 説明 |
|------------|------|
| [VERIFICATION_STATUS.md](./VERIFICATION_STATUS.md) | 現在の動作確認ステータス |
| [VERIFICATION_GUIDE.md](./VERIFICATION_GUIDE.md) | 詳細な動作確認手順 |
| [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) | トラブルシューティング |

### 🔧 技術仕様

| ドキュメント | 説明 |
|------------|------|
| [SETUP_GUIDE.md](./SETUP_GUIDE.md) | 初期セットアップガイド |
| [API_DOCUMENTATION.md](./API_DOCUMENTATION.md) | API仕様書 |
| [OPERATIONS_MANUAL.md](./OPERATIONS_MANUAL.md) | 運用マニュアル |

## 🚀 クイックスタート

### ステップ1: Googleサービスアカウントの設定

**推奨ドキュメント**: [QUICK_START_GUIDE.md](./QUICK_START_GUIDE.md)

1. Google Cloud Consoleでサービスアカウントを作成
2. JSONキーファイルをダウンロード
3. `backend/google-service-account.json`として保存
4. スプレッドシートに権限を付与

**所要時間**: 約5分

### ステップ2: sync_logsテーブルの作成

1. Supabaseダッシュボードを開く
2. SQL Editorで `backend/migrations/026_add_sync_logs.sql` を実行

**所要時間**: 約1分

### ステップ3: 動作確認

```bash
cd backend
npx ts-node test-spreadsheet-sync-verification.ts
```

**期待される結果**: すべてのテスト（6/6）が成功

## 📝 詳細な手順

### タスク1: Googleサービスアカウントの設定

#### 1.1 Google Cloud Consoleにアクセス
- URL: https://console.cloud.google.com/
- プロジェクトを選択または作成

#### 1.2 Google Sheets APIを有効化
- 「APIとサービス」→「ライブラリ」
- 「Google Sheets API」を検索して有効化

#### 1.3 サービスアカウントを作成
- 「APIとサービス」→「認証情報」
- 「認証情報を作成」→「サービスアカウント」
- 名前: `spreadsheet-sync-service`

#### 1.4 JSONキーをダウンロード
- 作成したサービスアカウントを選択
- 「キー」タブ→「鍵を追加」→「新しい鍵を作成」
- 形式: JSON

#### 1.5 JSONファイルを配置
```
ダウンロードしたファイルを以下の場所に配置:
backend/google-service-account.json
```

#### 1.6 スプレッドシートに権限を付与
- JSONファイルから `client_email` をコピー
- スプレッドシートの「共有」から、そのメールアドレスに「編集者」権限を付与

#### 1.7 環境変数を確認
```bash
# backend/.env
GOOGLE_SHEETS_SPREADSHEET_ID=your_spreadsheet_id_here
GOOGLE_SHEETS_SHEET_NAME=売主リスト
GOOGLE_SERVICE_ACCOUNT_KEY_PATH=./google-service-account.json
```

### タスク2: sync_logsテーブルの作成

#### 2.1 Supabaseダッシュボードにアクセス
- プロジェクトを開く
- 左側メニュー → 「SQL Editor」

#### 2.2 マイグレーションSQLを実行
- 「New query」をクリック
- `backend/migrations/026_add_sync_logs.sql` の内容をコピー
- SQLエディタに貼り付け
- 「Run」をクリック

## ✅ 動作確認

### 基本機能テスト

```bash
cd backend
npx ts-node test-spreadsheet-sync-verification.ts
```

**期待される結果**:
```
✓ Test 1: 環境変数の確認 - 成功
✓ Test 2: Google Sheets API接続 - 成功
✓ Test 3: Supabase接続 - 成功
✓ Test 4: SpreadsheetSyncServiceの初期化 - 成功
✓ Test 5: 同期ログテーブルの確認 - 成功
✓ Test 6: レート制限の確認 - 成功

合計: 6件 | 成功: 6件 | 失敗: 0件
```

### APIエンドポイントテスト

```bash
# ターミナル1: バックエンドを起動
cd backend
npm run dev

# ターミナル2: APIテストを実行
cd backend
npx ts-node test-sync-api-endpoints.ts
```

### フロントエンドUIの確認

```bash
# ターミナル3: フロントエンドを起動
cd frontend
npm run dev

# ブラウザで http://localhost:5173/sync にアクセス
```

## 🐛 トラブルシューティング

### よくあるエラーと解決方法

#### エラー: "Service account key file not found"

**原因**: JSONファイルが正しい場所にない

**解決方法**:
```bash
# ファイルの場所を確認
ls backend/google-service-account.json

# ファイルが存在しない場合は、再度配置
```

#### エラー: "The caller does not have permission"

**原因**: スプレッドシートに権限が付与されていない

**解決方法**:
1. JSONファイルから `client_email` をコピー
2. スプレッドシートの「共有」から、そのメールアドレスに「編集者」権限を付与

#### エラー: "sync_logs table does not exist"

**原因**: マイグレーションが実行されていない

**解決方法**:
1. Supabaseダッシュボードを開く
2. SQL Editorで `backend/migrations/026_add_sync_logs.sql` を実行

詳細は [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) を参照してください。

## 🔒 セキュリティに関する注意事項

### ✅ 推奨事項

1. **JSONファイルをGit管理から除外**
   - `.gitignore` に `google-service-account.json` が含まれていることを確認
   - 既に含まれています: ✅

2. **本番環境での管理**
   - 本番環境では環境変数として設定することを推奨

3. **アクセス権限の最小化**
   - サービスアカウントには必要最小限の権限のみを付与
   - 対象のスプレッドシートのみに共有

### ⚠️ やってはいけないこと

- ❌ JSONファイルをGitにコミット
- ❌ JSONファイルを公開リポジトリにアップロード
- ❌ JSONファイルをメールやチャットで共有
- ❌ 不要なスプレッドシートに権限を付与

## 📞 サポート

問題が解決しない場合は、以下のドキュメントを参照してください:

1. [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) - トラブルシューティングガイド
2. [VERIFICATION_STATUS.md](./VERIFICATION_STATUS.md) - 現在のステータス確認
3. [GOOGLE_SERVICE_ACCOUNT_SETUP.md](./GOOGLE_SERVICE_ACCOUNT_SETUP.md) - 詳細な設定手順

## 🎉 次のステップ

すべての設定が完了したら:

1. ✅ 実際の同期テストを実行
2. ✅ 同期ログを確認
3. ✅ エラーハンドリングをテスト
4. ✅ 本番環境へのデプロイ準備

詳細は [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) を参照してください。
