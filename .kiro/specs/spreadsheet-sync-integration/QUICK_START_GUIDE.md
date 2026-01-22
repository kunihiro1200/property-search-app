# クイックスタートガイド - Googleサービスアカウント設定

## 🚀 5分でできる設定手順

このガイドでは、最短でGoogleサービスアカウントを設定する方法を説明します。

---

## ステップ1: Google Cloud Consoleにアクセス (1分)

1. ブラウザで https://console.cloud.google.com/ を開く
2. プロジェクトを選択（または新規作成）

---

## ステップ2: Google Sheets APIを有効化 (1分)

1. 左側メニュー → 「APIとサービス」 → 「ライブラリ」
2. 検索ボックスに「Google Sheets API」と入力
3. 「Google Sheets API」をクリック
4. 「有効にする」ボタンをクリック

---

## ステップ3: サービスアカウントを作成 (2分)

1. 左側メニュー → 「APIとサービス」 → 「認証情報」
2. 上部の「認証情報を作成」 → 「サービスアカウント」
3. 以下を入力:
   - サービスアカウント名: `spreadsheet-sync-service`
   - サービスアカウントID: （自動生成）
4. 「作成して続行」をクリック
5. 「続行」をクリック（ロールは不要）
6. 「完了」をクリック

---

## ステップ4: JSONキーをダウンロード (30秒)

1. 作成したサービスアカウント（`spreadsheet-sync-service`）をクリック
2. 「キー」タブを選択
3. 「鍵を追加」 → 「新しい鍵を作成」
4. 「JSON」を選択
5. 「作成」をクリック
6. JSONファイルが自動的にダウンロードされます

**⚠️ このファイルは機密情報です。安全に保管してください。**

---

## ステップ5: JSONファイルを配置 (30秒)

1. ダウンロードしたJSONファイルの名前を変更:
   ```
   元の名前: your-project-xxxxx.json
   新しい名前: google-service-account.json
   ```

2. ファイルを移動:
   ```
   移動先: backend/google-service-account.json
   ```

3. 配置場所の確認:
   ```
   プロジェクトルート/
   └── backend/
       ├── google-service-account.json  ← ここ
       ├── src/
       ├── package.json
       └── ...
   ```

---

## ステップ6: スプレッドシートに権限を付与 (1分)

1. **サービスアカウントのメールアドレスをコピー**:
   - `google-service-account.json` をテキストエディタで開く
   - `"client_email"` の値をコピー
   - 例: `spreadsheet-sync-service@your-project.iam.gserviceaccount.com`

2. **スプレッドシートを開く**:
   - 対象のGoogleスプレッドシートを開く

3. **共有設定**:
   - 右上の「共有」ボタンをクリック
   - コピーしたメールアドレスを貼り付け
   - 権限を「編集者」に設定
   - 「送信」をクリック

**✅ 完了！通知メールは送信されません（サービスアカウントのため）**

---

## ステップ7: 環境変数を確認 (30秒)

`backend/.env` ファイルを開いて、以下の設定があることを確認:

```bash
# Google Sheets設定
GOOGLE_SHEETS_SPREADSHEET_ID=your_spreadsheet_id_here
GOOGLE_SHEETS_SHEET_NAME=売主リスト
GOOGLE_SERVICE_ACCOUNT_KEY_PATH=./google-service-account.json
```

**スプレッドシートIDの取得方法**:
- スプレッドシートのURLをコピー
- URL: `https://docs.google.com/spreadsheets/d/【ここがID】/edit`
- 【ここがID】の部分をコピーして、`GOOGLE_SHEETS_SPREADSHEET_ID` に設定

---

## ✅ 動作確認

設定が完了したら、以下のコマンドで動作確認:

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
✓ Test 6: レート制限の確認 - 成功

合計: 6件 | 成功: 5件 | 失敗: 1件
```

**注意**: Test 5（同期ログテーブル）は、次のステップでマイグレーションを実行すると成功します。

---

## 🎯 次のステップ: sync_logsテーブルの作成

1. **Supabaseダッシュボードを開く**
   - プロジェクトを選択
   - 左側メニュー → 「SQL Editor」

2. **マイグレーションSQLを実行**
   - 「New query」をクリック
   - `backend/migrations/026_add_sync_logs.sql` の内容をコピー
   - SQLエディタに貼り付け
   - 「Run」をクリック

3. **再度動作確認**
   ```bash
   cd backend
   npx ts-node test-spreadsheet-sync-verification.ts
   ```

**期待される結果**: すべてのテスト（6/6）が成功

---

## 🐛 トラブルシューティング

### エラー: "Service account key file not found"

**原因**: JSONファイルが正しい場所にない

**解決方法**:
```bash
# ファイルの場所を確認
ls backend/google-service-account.json

# ファイルが存在しない場合は、再度配置
```

### エラー: "The caller does not have permission"

**原因**: スプレッドシートに権限が付与されていない

**解決方法**:
1. JSONファイルから `client_email` をコピー
2. スプレッドシートの「共有」から、そのメールアドレスに「編集者」権限を付与

### エラー: "API has not been enabled"

**原因**: Google Sheets APIが有効化されていない

**解決方法**:
1. Google Cloud Console → 「APIとサービス」 → 「ライブラリ」
2. 「Google Sheets API」を検索して有効化

---

## 📚 詳細ドキュメント

より詳しい情報が必要な場合は、以下のドキュメントを参照してください:

- **詳細な設定手順**: [GOOGLE_SERVICE_ACCOUNT_SETUP.md](./GOOGLE_SERVICE_ACCOUNT_SETUP.md)
- **セットアップチェックリスト**: [SETUP_CHECKLIST.md](./SETUP_CHECKLIST.md)
- **現在のステータス**: [VERIFICATION_STATUS.md](./VERIFICATION_STATUS.md)
- **トラブルシューティング**: [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)

---

## 🎉 完了後

すべての設定が完了したら:

1. ✅ バックエンドサーバーを起動: `npm run dev`
2. ✅ APIエンドポイントをテスト
3. ✅ フロントエンドUIで同期機能を確認

詳細は [VERIFICATION_GUIDE.md](./VERIFICATION_GUIDE.md) を参照してください。
