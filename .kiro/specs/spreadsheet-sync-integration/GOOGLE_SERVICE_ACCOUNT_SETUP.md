# Google サービスアカウント設定ガイド

## 📋 概要

このガイドでは、スプレッドシート同期機能に必要なGoogleサービスアカウントの設定方法を説明します。

## 🎯 必要な作業

1. Google Cloud Consoleでサービスアカウントを作成
2. JSONキーファイルをダウンロード
3. JSONファイルをプロジェクトに配置
4. スプレッドシートに権限を付与

## 📝 詳細手順

### ステップ1: Google Cloud Consoleにアクセス

1. [Google Cloud Console](https://console.cloud.google.com/) にアクセス
2. プロジェクトを選択（または新規作成）

### ステップ2: Google Sheets APIを有効化

1. 左側メニューから「APIとサービス」→「ライブラリ」を選択
2. 検索ボックスに「Google Sheets API」と入力
3. 「Google Sheets API」を選択
4. 「有効にする」ボタンをクリック

### ステップ3: サービスアカウントを作成

1. 左側メニューから「APIとサービス」→「認証情報」を選択
2. 上部の「認証情報を作成」→「サービスアカウント」を選択
3. サービスアカウントの詳細を入力:
   - **サービスアカウント名**: `spreadsheet-sync-service`（任意の名前）
   - **サービスアカウントID**: 自動生成されます
   - **説明**: `スプレッドシート同期用サービスアカウント`（任意）
4. 「作成して続行」をクリック
5. ロールの選択（オプション）:
   - 基本的には不要ですが、必要に応じて「編集者」などを選択
6. 「続行」→「完了」をクリック

### ステップ4: JSONキーファイルをダウンロード

1. 作成したサービスアカウントをクリック
2. 「キー」タブを選択
3. 「鍵を追加」→「新しい鍵を作成」を選択
4. キーのタイプで「JSON」を選択
5. 「作成」をクリック
6. JSONファイルが自動的にダウンロードされます

**⚠️ 重要**: このJSONファイルには機密情報が含まれています。安全に保管してください。

### ステップ5: JSONファイルをプロジェクトに配置

1. ダウンロードしたJSONファイルの名前を `google-service-account.json` に変更
2. ファイルを `backend/` ディレクトリに配置

```
backend/
├── google-service-account.json  ← ここに配置
├── src/
├── package.json
└── ...
```

**✅ 確認**: ファイルパスが `backend/google-service-account.json` になっていることを確認

### ステップ6: スプレッドシートに権限を付与

1. JSONファイルを開いて、`client_email` の値をコピー
   - 例: `spreadsheet-sync-service@your-project.iam.gserviceaccount.com`

2. 対象のGoogleスプレッドシートを開く

3. 右上の「共有」ボタンをクリック

4. コピーしたサービスアカウントのメールアドレスを貼り付け

5. 権限を「編集者」に設定

6. 「送信」をクリック

**⚠️ 注意**: 通知メールは送信されません（サービスアカウントのため）

### ステップ7: 環境変数の確認

`backend/.env` ファイルに以下の設定があることを確認:

```bash
# Google Sheets設定
GOOGLE_SHEETS_SPREADSHEET_ID=your_spreadsheet_id_here
GOOGLE_SHEETS_SHEET_NAME=売主リスト
GOOGLE_SERVICE_ACCOUNT_KEY_PATH=./google-service-account.json
```

**スプレッドシートIDの取得方法**:
- スプレッドシートのURLから取得
- URL: `https://docs.google.com/spreadsheets/d/【ここがID】/edit`

## ✅ 動作確認

設定が完了したら、以下のコマンドで動作確認を実行:

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
✓ Test 5: 同期ログテーブルの確認 - 成功（マイグレーション実行後）
✓ Test 6: レート制限の確認 - 成功
```

## 🔒 セキュリティに関する注意事項

### ✅ 推奨事項

1. **JSONファイルをGit管理から除外**
   - `.gitignore` に `google-service-account.json` が含まれていることを確認
   - 既に含まれています: ✅

2. **本番環境での管理**
   - 本番環境では環境変数として設定することを推奨
   - JSONファイルの内容を環境変数に設定する方法:

```bash
# .envファイルに以下を追加（本番環境）
GOOGLE_SERVICE_ACCOUNT_EMAIL=your-service-account@project.iam.gserviceaccount.com
GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

3. **アクセス権限の最小化**
   - サービスアカウントには必要最小限の権限のみを付与
   - 対象のスプレッドシートのみに共有

### ⚠️ やってはいけないこと

- ❌ JSONファイルをGitにコミット
- ❌ JSONファイルを公開リポジトリにアップロード
- ❌ JSONファイルをメールやチャットで共有
- ❌ 不要なスプレッドシートに権限を付与

## 🐛 トラブルシューティング

### エラー: "Service account key file not found"

**原因**: JSONファイルが正しい場所に配置されていない

**解決方法**:
1. ファイルが `backend/google-service-account.json` に存在することを確認
2. ファイル名が正確に一致していることを確認（大文字小文字も含む）

### エラー: "The caller does not have permission"

**原因**: スプレッドシートにサービスアカウントの権限が付与されていない

**解決方法**:
1. JSONファイルから `client_email` をコピー
2. スプレッドシートの「共有」から、そのメールアドレスに「編集者」権限を付与

### エラー: "Invalid JWT Signature"

**原因**: JSONファイルが破損しているか、正しくない

**解決方法**:
1. Google Cloud Consoleから新しいJSONキーを作成
2. 古いキーを削除して、新しいキーをダウンロード
3. 再度配置して確認

### エラー: "API has not been enabled"

**原因**: Google Sheets APIが有効化されていない

**解決方法**:
1. Google Cloud Consoleで「APIとサービス」→「ライブラリ」を開く
2. 「Google Sheets API」を検索して有効化

## 📚 関連ドキュメント

- [VERIFICATION_STATUS.md](./VERIFICATION_STATUS.md) - 現在の動作確認ステータス
- [VERIFICATION_GUIDE.md](./VERIFICATION_GUIDE.md) - 詳細な動作確認手順
- [SETUP_GUIDE.md](./SETUP_GUIDE.md) - 初期セットアップガイド

## 🎉 次のステップ

サービスアカウントの設定が完了したら:

1. ✅ 動作確認テストを実行
2. ✅ sync_logsテーブルのマイグレーションを実行
3. ✅ APIエンドポイントのテストを実行
4. ✅ フロントエンドUIの確認

詳細は [VERIFICATION_STATUS.md](./VERIFICATION_STATUS.md) を参照してください。
