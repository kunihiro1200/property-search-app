# スプレッドシート設定 - 要件定義

## 概要

スプレッドシート連携に必要な環境変数が `.env` ファイルに設定されていないため、スプレッドシート連携機能が正常に動作しない問題を解決します。

## 背景

- `GOOGLE_SERVICE_ACCOUNT_KEY` 環境変数が未設定（最重要）
- 各種スプレッドシートID環境変数が未設定
- スプレッドシートとの同期機能が利用できない状態
- 設定方法が明確でない

## 目的

1. Google Service Accountの設定方法を明確化
2. スプレッドシートIDの設定方法を明確化
3. 環境変数の設定を完了
4. スプレッドシート連携機能を有効化

## 要件

### 機能要件

#### FR-1: Google Service Account設定
- Google Cloud Consoleでサービスアカウントを作成できること
- サービスアカウントのJSONキーをダウンロードできること
- JSONキーを環境変数として設定できること

#### FR-2: スプレッドシートID設定
- スプレッドシートのURLからIDを抽出できること
- `.env` ファイルに正しく設定できること
- 設定後に機能が正常に動作すること

#### FR-3: アクセス権限設定
- サービスアカウントにスプレッドシートの閲覧権限を付与できること
- 権限設定後にAPIアクセスが成功すること

#### FR-4: 設定検証
- 設定されたスプレッドシートIDが有効であることを確認できること
- アクセス権限が正しく設定されていることを確認できること
- 検証ツールで全設定を一括確認できること

### 非機能要件

#### NFR-1: セキュリティ
- サービスアカウントキーは環境変数として管理
- スプレッドシートIDは環境変数として管理
- `.env` ファイルは `.gitignore` に含まれていること
- サービスアカウントキーファイルは `.gitignore` に含まれていること

#### NFR-2: ドキュメント
- 設定手順が明確に文書化されていること
- トラブルシューティングガイドが用意されていること
- 各環境変数の説明が記載されていること

## 必要な環境変数

### 1. Google Service Account認証情報（必須）

```env
GOOGLE_SERVICE_ACCOUNT_KEY='{"type":"service_account","project_id":"...","private_key_id":"...","private_key":"...","client_email":"...","client_id":"...","auth_uri":"...","token_uri":"...","auth_provider_x509_cert_url":"...","client_x509_cert_url":"..."}'
```

**説明**: Google Sheets APIにアクセスするためのサービスアカウント認証情報（JSON形式）

### 2. スプレッドシートID（各リストごと）

#### 売主リスト
```env
SELLER_SPREADSHEET_ID=your_seller_spreadsheet_id_here
SELLER_SHEET_NAME=売主リスト
```

#### 物件リスト
```env
PROPERTY_LISTING_SPREADSHEET_ID=your_property_listing_spreadsheet_id_here
PROPERTY_LISTING_SHEET_NAME=物件リスト
```

#### 買主リスト
```env
BUYER_SPREADSHEET_ID=your_buyer_spreadsheet_id_here
BUYER_SHEET_NAME=買主リスト
```

#### 業務リスト
```env
WORK_TASK_SPREADSHEET_ID=your_work_task_spreadsheet_id_here
WORK_TASK_SHEET_NAME=業務リスト
```

#### 追客履歴
```env
FOLLOW_UP_LOG_HISTORY_SPREADSHEET_ID=your_follow_up_log_history_spreadsheet_id_here
FOLLOW_UP_LOG_HISTORY_SHEET_NAME=追客履歴
```

## スプレッドシートURL形式

```
https://docs.google.com/spreadsheets/d/[SPREADSHEET_ID]/edit
```

例:
```
https://docs.google.com/spreadsheets/d/1abc123def456ghi789jkl/edit
```

この場合、`SPREADSHEET_ID` は `1abc123def456ghi789jkl` です。

## 設定手順

### ステップ1: Google Service Accountの作成

1. [Google Cloud Console](https://console.cloud.google.com/) にアクセス
2. プロジェクトを選択または新規作成
3. 「APIとサービス」→「認証情報」に移動
4. 「認証情報を作成」→「サービスアカウント」を選択
5. サービスアカウント名を入力（例: `spreadsheet-sync-service`）
6. 「作成して続行」をクリック
7. ロールは不要なので「続行」をクリック
8. 「完了」をクリック

### ステップ2: サービスアカウントキーの作成

1. 作成したサービスアカウントをクリック
2. 「キー」タブに移動
3. 「鍵を追加」→「新しい鍵を作成」を選択
4. 「JSON」を選択して「作成」をクリック
5. JSONファイルがダウンロードされます

### ステップ3: Google Sheets APIの有効化

1. Google Cloud Consoleで「APIとサービス」→「ライブラリ」に移動
2. "Google Sheets API" を検索
3. 「有効にする」をクリック

### ステップ4: 環境変数の設定

1. ダウンロードしたJSONファイルを開く
2. 内容全体をコピー
3. `backend/.env` ファイルに以下を追加:

```env
GOOGLE_SERVICE_ACCOUNT_KEY='<JSONファイルの内容をここに貼り付け>'
```

**注意**: JSON全体をシングルクォートで囲んでください。

### ステップ5: スプレッドシートIDの取得と設定

1. Google スプレッドシートを開く
2. URLバーからスプレッドシートのURLをコピー
3. URL内の `/d/` と `/edit` の間の文字列がスプレッドシートID
4. `backend/.env` ファイルに各スプレッドシートIDを追加

例:
```env
SELLER_SPREADSHEET_ID=1abc123def456ghi789jkl
PROPERTY_LISTING_SPREADSHEET_ID=2xyz789abc456def123ghi
BUYER_SPREADSHEET_ID=3mno456pqr789stu012vwx
WORK_TASK_SPREADSHEET_ID=4abc123def456ghi789jkl
FOLLOW_UP_LOG_HISTORY_SPREADSHEET_ID=5xyz789abc456def123ghi
```

### ステップ6: スプレッドシートへのアクセス権限付与

各スプレッドシートに対して以下を実行:

1. Google Sheetsでスプレッドシートを開く
2. 右上の「共有」ボタンをクリック
3. サービスアカウントのメールアドレスを入力
   - メールアドレスはJSONファイルの `client_email` フィールドにあります
   - 例: `spreadsheet-sync-service@project-id.iam.gserviceaccount.com`
4. 権限を「閲覧者」に設定
5. 「送信」をクリック

### ステップ7: 設定の確認

設定後、以下のコマンドで確認:

```bash
cd backend
npm run verify-spreadsheet-config
```

または:

```bash
cd backend
npx ts-node verify-spreadsheet-config.ts
```

## 成功基準

- [ ] Google Service Accountが作成されている
- [ ] サービスアカウントのJSONキーがダウンロードされている
- [ ] Google Sheets APIが有効化されている
- [ ] `GOOGLE_SERVICE_ACCOUNT_KEY` が `.env` ファイルに正しく設定されている
- [ ] 各スプレッドシートIDが `.env` ファイルに正しく設定されている
- [ ] サービスアカウントに各スプレッドシートの閲覧権限が付与されている
- [ ] 検証ツールで全設定が成功する
- [ ] スプレッドシートの同期機能が正常に動作する

## トラブルシューティング

### エラー: GOOGLE_SERVICE_ACCOUNT_KEY が設定されていません

**原因**: 環境変数が未設定または形式が不正

**解決方法**:
1. JSONファイルの内容全体をコピー
2. シングルクォートで囲む
3. `.env` ファイルに正しく貼り付け
4. 改行やスペースが含まれていないか確認

### エラー: スプレッドシートへのアクセス権限がありません

**原因**: サービスアカウントに共有権限が付与されていない

**解決方法**:
1. スプレッドシートを開く
2. 「共有」ボタンをクリック
3. サービスアカウントのメールアドレスを追加
4. 「閲覧者」権限を付与

### エラー: スプレッドシートが見つかりません

**原因**: スプレッドシートIDが間違っている

**解決方法**:
1. スプレッドシートのURLを確認
2. `/d/` と `/edit` の間の文字列を正確にコピー
3. `.env` ファイルのIDを更新

### エラー: シート名が見つかりません

**原因**: シート名が環境変数と一致しない

**解決方法**:
1. スプレッドシートを開く
2. 下部のタブでシート名を確認
3. `.env` ファイルのシート名を更新

## 検証ツールの使用方法

### 基本的な使用方法

```bash
cd backend
npm run verify-spreadsheet-config
```

### 出力例

```
============================================================
スプレッドシート設定検証ツール
============================================================

✓ 売主リスト: OK
  - スプレッドシートID: 1abc...jkl
  - シート名: 売主リスト
  - アクセス: 成功

✗ 物件リスト: エラー
  - エラー:
    - 環境変数 PROPERTY_LISTING_SPREADSHEET_ID が設定されていません
  修正方法:
    1. .env ファイルに以下を追加してください:
       PROPERTY_LISTING_SPREADSHEET_ID=<スプレッドシートID>

============================================================
検証結果サマリー
============================================================

成功: 1/5
失敗: 4/5

✗ 一部の設定にエラーがあります。上記の修正方法を参照してください。
```

## 制約事項

- スプレッドシートへのアクセス権限が必要
- Google Service Accountの設定が完了していること
- Google Sheets APIが有効化されていること
- サービスアカウントに各スプレッドシートの閲覧権限が必要
- JSONキーは厳重に管理し、公開リポジトリにコミットしないこと

## セキュリティ上の注意

1. **JSONキーファイルの管理**
   - JSONキーファイルは `.gitignore` に追加
   - 公開リポジトリにコミットしない
   - 定期的にキーをローテーション

2. **環境変数の管理**
   - `.env` ファイルは `.gitignore` に追加
   - 本番環境では環境変数を直接設定
   - 開発環境と本番環境で異なるサービスアカウントを使用

3. **アクセス権限の最小化**
   - サービスアカウントには必要最小限の権限のみ付与
   - 「閲覧者」権限で十分な場合は「編集者」権限を付与しない

## 参考資料

- [Google Sheets API Documentation](https://developers.google.com/sheets/api)
- [Google Cloud Service Accounts](https://cloud.google.com/iam/docs/service-accounts)
- [Google Sheets API Node.js Quickstart](https://developers.google.com/sheets/api/quickstart/nodejs)
- プロジェクト内の検証ツール: `backend/verify-spreadsheet-config.ts`
