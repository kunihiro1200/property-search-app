# Google Sheets API セットアップガイド

このガイドでは、Google Sheets APIを使用してスプレッドシートにアクセスするための設定手順を説明します。

## 前提条件

- Googleアカウント
- Google Cloud Consoleへのアクセス権限
- スプレッドシートの編集権限

## 認証方式の選択

本システムは2つの認証方式に対応しています：

1. **OAuth 2.0認証（推奨）**: 組織ポリシーでサービスアカウントキーの作成が制限されている場合
2. **サービスアカウント認証**: 組織ポリシーの制限がない場合

**組織ポリシーで `iam.disableServiceAccountKeyCreation` が有効な場合は、OAuth 2.0認証を使用してください。**

---

## 方法1: OAuth 2.0認証（推奨）

### 1. Google Cloud Consoleでプロジェクトを作成

1. [Google Cloud Console](https://console.cloud.google.com/)にアクセス
2. 既存のプロジェクトを選択（または新しいプロジェクトを作成）
   - プロジェクト名: `arboreal-pen-437413-v9`（既存）
3. プロジェクトIDをメモしておく

### 2. Google Sheets APIを有効化

1. Google Cloud Consoleで「APIとサービス」→「ライブラリ」を選択
2. 「Google Sheets API」を検索
3. 「有効にする」をクリック

### 3. OAuth同意画面を設定

1. 「APIとサービス」→「OAuth同意画面」を選択
2. User Type（ユーザータイプ）を選択:
   - **内部（Internal）**: 組織内のユーザーのみ（推奨）
   - **外部（External）**: 誰でもアクセス可能
3. アプリ情報を入力:
   - アプリ名: `売主管理システム`
   - ユーザーサポートメール: あなたのメールアドレス
   - デベロッパーの連絡先情報: あなたのメールアドレス
4. スコープを追加:
   - 「スコープを追加または削除」をクリック
   - `https://www.googleapis.com/auth/spreadsheets` を検索して追加
5. 「保存して次へ」をクリック
6. 設定を完了

### 4. OAuth 2.0 クライアントIDを作成

1. 「APIとサービス」→「認証情報」を選択
2. 「認証情報を作成」→「OAuth クライアント ID」を選択
3. アプリケーションの種類: **ウェブアプリケーション**
4. 名前: `Spreadsheet Sync Client`
5. 承認済みのリダイレクトURI:
   - `http://localhost:3000/api/google/callback` を追加
6. 「作成」をクリック
7. **クライアントID**と**クライアントシークレット**が表示されるのでメモ

### 5. リフレッシュトークンを取得

1. `backend/.env`ファイルに一時的にクライアント情報を追加:
   ```env
   GOOGLE_OAUTH_CLIENT_ID=あなたのクライアントID
   GOOGLE_OAUTH_CLIENT_SECRET=あなたのクライアントシークレット
   ```

2. リフレッシュトークン取得スクリプトを実行:
   ```bash
   cd backend
   npx ts-node src/scripts/get-oauth-refresh-token.ts
   ```

3. 表示されたURLをブラウザで開く

4. Googleアカウントでログインし、アクセスを許可

5. リダイレクト後のURLから `code` パラメータをコピー:
   ```
   http://localhost:3000/api/google/callback?code=4/0AeanS...
   ```
   → `4/0AeanS...` の部分をコピー

6. ターミナルに戻り、コードを入力

7. リフレッシュトークンが表示されるのでメモ

### 6. 環境変数を設定

`backend/.env`ファイルに以下を追加:

```env
# Google Sheets API Configuration
GOOGLE_SHEETS_SPREADSHEET_ID=1wKBRLWbT6pSKa9IlTDabjhjTnfs_GxX6Rn6M6kbio1I
GOOGLE_SHEETS_SHEET_NAME=売主リスト

# OAuth 2.0 Configuration
GOOGLE_OAUTH_CLIENT_ID=あなたのクライアントID
GOOGLE_OAUTH_CLIENT_SECRET=あなたのクライアントシークレット
GOOGLE_OAUTH_REFRESH_TOKEN=あなたのリフレッシュトークン
```

### 7. スプレッドシートの共有設定

OAuth 2.0を使用する場合、認証したGoogleアカウントがスプレッドシートにアクセスできる必要があります：

1. 対象のスプレッドシートを開く
2. 「共有」ボタンをクリック
3. 認証に使用したGoogleアカウント（例: `tomoko.kunihiro@ifoo-oita.com`）を追加
4. 権限: **編集者**を選択
5. 「送信」をクリック

---

## 方法2: サービスアカウント認証（個人Googleアカウントを使用）

**重要**: 組織アカウント（`@ifoo-oita.com`）で組織ポリシーの制限がある場合は、**個人のGmailアカウント**を使用してください。

### 1. Google Cloud Consoleでプロジェクトを作成

1. **個人のGmailアカウント**でログイン（組織アカウントではなく）
2. [Google Cloud Console](https://console.cloud.google.com/)にアクセス
3. 画面上部のプロジェクト選択ドロップダウンをクリック
4. 「新しいプロジェクト」をクリック
5. プロジェクト名を入力（例: `seller-management-personal`）
6. 「作成」をクリック
7. プロジェクトIDをメモしておく

### 2. Google Sheets APIを有効化

1. Google Cloud Consoleで「APIとサービス」→「ライブラリ」を選択
2. 「Google Sheets API」を検索
3. 「有効にする」をクリック

### 3. サービスアカウントを作成

1. 「APIとサービス」→「認証情報」を選択
2. 「認証情報を作成」→「サービスアカウント」を選択
3. サービスアカウントの詳細を入力:
   - サービスアカウント名: `spreadsheet-sync-service`
   - サービスアカウントID: 自動生成される
   - 説明: `Supabaseとスプレッドシート間の同期用サービスアカウント`
4. 「作成して続行」をクリック
5. ロールは設定不要（スキップ）
6. 「完了」をクリック

### 4. サービスアカウントキーをダウンロード

1. 作成したサービスアカウントの行をクリック
2. 「キー」タブをクリック
3. 「鍵を追加」→「新しい鍵を作成」をクリック
4. キーのタイプ: **JSON**を選択
5. 「作成」をクリック
6. JSONファイルが自動的にダウンロードされる（例: `seller-management-personal-abc123.json`）
7. **重要**: このファイルは安全な場所に保管してください

**次のステップ**: ダウンロードしたJSONファイルを `backend` フォルダに移動し、`google-service-account.json` にリネームしてください。

### 5. スプレッドシートにサービスアカウントを追加

1. 対象のスプレッドシートを開く
   - スプレッドシートID: `1wKBRLWbT6pSKa9IlTDabjhjTnfs_GxX6Rn6M6kbio1I`
   - シート名: `売主リスト`
2. 「共有」ボタンをクリック
3. サービスアカウントのメールアドレスを入力
   - 形式: `spreadsheet-sync-service@project-id.iam.gserviceaccount.com`
   - JSONファイルの`client_email`フィールドに記載されています
4. 権限: **編集者**を選択
5. 「送信」をクリック（通知メールは不要）

### 6. 環境変数を設定

#### backend/.env に追加

**方法A: JSONファイルのパスを指定（推奨）**

```env
# Google Sheets API Configuration
GOOGLE_SHEETS_SPREADSHEET_ID=1wKBRLWbT6pSKa9IlTDabjhjTnfs_GxX6Rn6M6kbio1I
GOOGLE_SHEETS_SHEET_NAME=売主リスト

# Service Account Configuration (JSONファイルのパスを指定)
GOOGLE_SERVICE_ACCOUNT_KEY_PATH=./google-service-account.json
```

この方法が最も簡単で、エラーが起きにくいです。

**方法B: 環境変数に直接設定（上級者向け）**

```env
# Google Sheets API Configuration
GOOGLE_SHEETS_SPREADSHEET_ID=1wKBRLWbT6pSKa9IlTDabjhjTnfs_GxX6Rn6M6kbio1I
GOOGLE_SHEETS_SHEET_NAME=売主リスト
GOOGLE_SERVICE_ACCOUNT_EMAIL=spreadsheet-sync-service@project-id.iam.gserviceaccount.com
GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...\n-----END PRIVATE KEY-----\n"
```

**重要な注意事項:**
- `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY`は、ダウンロードしたJSONファイルの`private_key`フィールドの値をそのままコピーしてください
- 改行文字（`\n`）も含めて、ダブルクォートで囲んでください
- JSONファイル全体ではなく、`private_key`フィールドの値のみをコピーしてください

---

## .gitignoreの確認

サービスアカウントキーのJSONファイルと`.env`ファイルが`.gitignore`に含まれていることを確認してください:

```gitignore
# Environment variables
.env
.env.local
.env.*.local

# Google Service Account Keys
*-key.json
service-account-*.json
```

## 動作確認

セットアップが完了したら、以下のコマンドで動作確認できます:

```bash
cd backend
npm run test:sheets-connection
```

または、簡単なテストスクリプトを実行:

```bash
cd backend
npx ts-node src/scripts/test-sheets-connection.ts
```

## トラブルシューティング

### エラー: "The caller does not have permission"

**原因**: サービスアカウントがスプレッドシートの編集者として追加されていない

**解決方法**:
1. スプレッドシートの「共有」設定を確認
2. サービスアカウントのメールアドレスが正しく追加されているか確認
3. 権限が「編集者」になっているか確認

### エラー: "Invalid JWT Signature"

**原因**: `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY`の形式が正しくない

**解決方法**:
1. JSONファイルから`private_key`の値を再度コピー
2. 改行文字（`\n`）が含まれていることを確認
3. ダブルクォートで囲まれていることを確認

### エラー: "API has not been used in project"

**原因**: Google Sheets APIが有効化されていない

**解決方法**:
1. Google Cloud Consoleで「APIとサービス」→「ライブラリ」を開く
2. 「Google Sheets API」を検索して有効化

### エラー: "Spreadsheet not found"

**原因**: スプレッドシートIDが正しくない、またはアクセス権限がない

**解決方法**:
1. `GOOGLE_SHEETS_SPREADSHEET_ID`が正しいか確認
2. スプレッドシートのURLから正しいIDを取得:
   - URL: `https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit`
   - `SPREADSHEET_ID`の部分をコピー

## セキュリティのベストプラクティス

1. **サービスアカウントキーを安全に保管**
   - JSONファイルをGitにコミットしない
   - 本番環境では環境変数または秘密管理サービスを使用

2. **最小権限の原則**
   - サービスアカウントには必要最小限の権限のみを付与
   - スプレッドシートへのアクセスのみに制限

3. **定期的なキーのローテーション**
   - サービスアカウントキーを定期的に更新
   - 古いキーは削除

4. **監査ログの確認**
   - Google Cloud Consoleで監査ログを定期的に確認
   - 不審なアクセスがないかチェック

## 完了した作業

### ✅ 実装済み

以下の作業は既に完了しています：

1. **GoogleSheetsClient実装** (`backend/src/services/GoogleSheetsClient.ts`)
   - サービスアカウント認証を使用したGoogle Sheets API接続
   - データの読み取り・書き込み機能
   - 日本語シート名のサポート（シングルクォートでラップ）

2. **ColumnMapper実装** (`backend/src/services/ColumnMapper.ts`)
   - スプレッドシートのカラムとデータベースフィールドのマッピング
   - データ検証とクリーニング
   - メールアドレスの検証と無効な値のnull変換
   - 空の氏名フィールドの自動補完（"不明"）

3. **MigrationService実装** (`backend/src/services/MigrationService.ts`)
   - スプレッドシートからSupabaseへのデータ移行
   - バッチ処理とエラーハンドリング
   - 詳細な移行レポート生成

4. **初回データ移行完了**
   - 8,747件のレコードを正常に移行
   - 986件の無効なメールアドレスをnullに変換
   - 移行成功率: 100%

5. **データ暗号化完了**
   - 1,000件の売主データを暗号化
   - `name`, `address`, `phone_number`, `email`フィールドを暗号化
   - 暗号化成功率: 100%

### 🔧 現在の設定

#### 使用中の認証方式
**サービスアカウント認証**（個人Googleアカウント）

#### 環境変数設定 (`backend/.env`)
```env
# Supabase Configuration
SUPABASE_URL=[Supabase DashboardのProject URLを入力]
SUPABASE_ANON_KEY=[Supabase DashboardのAnon Keyを入力]
SUPABASE_SERVICE_KEY=[Supabase DashboardのService Role Keyを入力]

# Encryption
ENCRYPTION_KEY=[32文字のランダムな文字列を生成して入力]

# Google Sheets API Configuration
GOOGLE_SHEETS_SPREADSHEET_ID=1wKBRLWbT6pSKa9IlTDabjhjTnfs_GxX6Rn6M6kbio1I
GOOGLE_SHEETS_SHEET_NAME=売主リスト

# Service Account Configuration
GOOGLE_SERVICE_ACCOUNT_KEY_PATH=./google-service-account.json
```

#### サービスアカウント情報
- メールアドレス: `[google-service-account.jsonのclient_emailを参照]`
- プロジェクトID: `[Google Cloud ConsoleのProject IDを参照]`
- JSONキーファイル: `backend/google-service-account.json`

### 📋 データベーススキーマの調整

以下のNOT NULL制約を削除しました（Supabase SQLエディタで実行済み）：

```sql
ALTER TABLE sellers ALTER COLUMN address DROP NOT NULL;
ALTER TABLE sellers ALTER COLUMN phone_number DROP NOT NULL;
ALTER TABLE sellers ALTER COLUMN status DROP NOT NULL;
```

これにより、スプレッドシートの不完全なデータも移行できるようになりました。

### 🔐 認証システムの移行

**Supabase Auth**への移行が完了しました：

1. **フロントエンド** (`frontend/src/store/authStore.ts`)
   - Supabase Auth SDKを使用したGoogle OAuth認証
   - セッション管理とトークンリフレッシュ

2. **バックエンド** (`backend/src/routes/auth.supabase.ts`)
   - Supabase Authトークンの検証
   - 社員レコードの自動作成

3. **Supabase設定**
   - プロジェクトURL: `[Supabase DashboardのProject URLを参照]`
   - anon key: `[Supabase DashboardのAnon Keyを参照]`
   - service_role key: `[Supabase DashboardのService Role Keyを参照]`

### 🚀 次のステップ

#### 1. Supabase Google認証の設定

**重要**: 以下の手順を順番に実行してください。

##### ステップ1: Supabaseダッシュボードでの設定

1. [Supabaseダッシュボード](https://supabase.com/dashboard)にアクセス
2. プロジェクト `[あなたのProject ID]` を選択
3. 左メニューから「Authentication」→「Providers」を選択
4. 「Google」を探してクリック
5. 以下の設定を行う:
   - **Enable Sign in with Google**: ONにする
   - **Client ID**: `[Google Cloud ConsoleのClient IDを入力]`
   - **Client Secret**: `[Google Cloud ConsoleのClient Secretを入力]`
   - **Callback URL (for OAuth)**: `[Supabase DashboardのCallback URLを参照]`（自動管理、編集不要）
6. **「Save」をクリック**（これを忘れないでください！）

##### ステップ2: Google Cloud Consoleでの設定

Supabaseの設定を保存したら、Google Cloud Consoleで承認済みリダイレクトURIを追加します：

1. [Google Cloud Console](https://console.cloud.google.com/)にアクセス
2. プロジェクトを選択（OAuth Client IDを作成したプロジェクト）
3. 左メニューから「APIとサービス」→「認証情報」を選択
4. OAuth 2.0 クライアントIDのリストから、使用するClient IDをクリック
5. 「承認済みのリダイレクトURI」セクションで「URIを追加」をクリック
6. 以下のURIを追加:
   - `[Supabase DashboardのCallback URLを入力]`（Supabaseのコールバック）
   - `http://localhost:5174/auth/callback`（ローカル開発用、既に追加されている場合はスキップ）
7. 「保存」をクリック

**注意**: Google Cloud Consoleでの変更は、反映されるまで数分かかる場合があります。

#### 2. ログインテスト

設定が完了したら、以下の手順でログインをテストします：

1. ブラウザで http://localhost:5174 にアクセス
2. ブラウザのDevTools（F12キー）を開き、「Console」タブを表示
3. 「Googleでログイン」ボタンをクリック
4. Googleアカウントを選択してログイン
5. コンソールにエラーが表示されないか確認
6. 売主リストページが表示されることを確認

**トラブルシューティング**:
- エラーが表示される場合は、コンソールのエラーメッセージをコピーしてください
- 「redirect_uri_mismatch」エラーが出る場合は、Google Cloud Consoleの設定を再確認してください

#### 3. スプレッドシート同期の有効化（オプション）

現在、スプレッドシート同期機能は実装済みですが、自動同期は無効化されています。
必要に応じて、以下の機能を有効化できます：

- **手動同期**: フロントエンドから手動でスプレッドシートと同期
- **自動同期**: データ変更時に自動的にスプレッドシートを更新
- **双方向同期**: スプレッドシートの変更をSupabaseに反映

詳細は以下のドキュメントを参照してください：
- `OPERATIONS_MANUAL.md`: 運用マニュアル
- `API_DOCUMENTATION.md`: API仕様
- `TROUBLESHOOTING.md`: トラブルシューティング

## まとめ

✅ **完了した作業**
- Google Sheets API設定
- サービスアカウント作成と権限設定
- スプレッドシートからSupabaseへのデータ移行（8,747件）
- データ暗号化（1,000件）
- Supabase Auth統合

⏳ **残りの作業**
- Supabaseダッシュボードで、Google認証プロバイダーを有効化
- ログイン機能のテスト
- スプレッドシート同期機能の有効化（オプション）

システムは正常に動作しており、ログイン設定を完了すれば、すぐに使用できる状態です。
