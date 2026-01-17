# スプレッドシート同期機能 - セットアップチェックリスト

## 📋 現在の状況

### ✅ 完了済み
- [x] TypeScriptコンパイルエラーの修正
- [x] Supabase接続の確認（8814件の売主レコード確認済み）
- [x] レート制限機能の確認

### ⏳ 実行が必要な作業

## 🎯 タスク1: Googleサービスアカウントの設定

### 手順

1. **Google Cloud Consoleにアクセス**
   - URL: https://console.cloud.google.com/
   - プロジェクトを選択または作成

2. **Google Sheets APIを有効化**
   - 「APIとサービス」→「ライブラリ」
   - 「Google Sheets API」を検索して有効化

3. **サービスアカウントを作成**
   - 「APIとサービス」→「認証情報」
   - 「認証情報を作成」→「サービスアカウント」
   - 名前: `spreadsheet-sync-service`（任意）
   - 作成完了

4. **JSONキーをダウンロード**
   - 作成したサービスアカウントを選択
   - 「キー」タブ→「鍵を追加」→「新しい鍵を作成」
   - 形式: JSON
   - ダウンロード完了

5. **JSONファイルを配置**
   ```
   ダウンロードしたファイルを以下の場所に配置:
   backend/google-service-account.json
   ```

6. **スプレッドシートに権限を付与**
   - JSONファイルを開いて `client_email` の値をコピー
   - 対象のスプレッドシートを開く
   - 「共有」ボタンをクリック
   - コピーしたメールアドレスを貼り付け
   - 権限: 「編集者」
   - 送信

7. **環境変数を確認**
   ```bash
   # backend/.env に以下が設定されていることを確認
   GOOGLE_SHEETS_SPREADSHEET_ID=your_spreadsheet_id_here
   GOOGLE_SHEETS_SHEET_NAME=売主リスト
   GOOGLE_SERVICE_ACCOUNT_KEY_PATH=./google-service-account.json
   ```

### 確認方法

```bash
cd backend
npx ts-node test-spreadsheet-sync-verification.ts
```

**期待される結果**: Test 1, 2, 4 が成功

---

## 🎯 タスク2: sync_logsテーブルの作成

### 手順

1. **Supabaseダッシュボードにアクセス**
   - プロジェクトを開く
   - 左側メニューから「SQL Editor」を選択

2. **マイグレーションSQLを実行**
   - 「New query」をクリック
   - 以下のファイルの内容をコピー: `backend/migrations/026_add_sync_logs.sql`
   - SQLエディタに貼り付け
   - 「Run」をクリック

3. **実行結果を確認**
   - 「Success. No rows returned」と表示されればOK
   - エラーが表示された場合は、エラーメッセージを確認

### 確認方法

```bash
cd backend
npx ts-node test-spreadsheet-sync-verification.ts
```

**期待される結果**: Test 5 が成功

---

## 🎉 完了後の確認

すべてのタスクが完了したら、以下のコマンドで最終確認:

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

---

## 📚 詳細ドキュメント

- **サービスアカウント設定の詳細**: [GOOGLE_SERVICE_ACCOUNT_SETUP.md](./GOOGLE_SERVICE_ACCOUNT_SETUP.md)
- **現在のステータス**: [VERIFICATION_STATUS.md](./VERIFICATION_STATUS.md)
- **動作確認ガイド**: [VERIFICATION_GUIDE.md](./VERIFICATION_GUIDE.md)
- **トラブルシューティング**: [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)

---

## 🆘 困ったときは

### よくある質問

**Q: JSONファイルをどこに配置すればいいですか？**
A: `backend/google-service-account.json` に配置してください。プロジェクトのルートではなく、backendフォルダ内です。

**Q: スプレッドシートIDはどこで確認できますか？**
A: スプレッドシートのURLから取得できます。
   URL: `https://docs.google.com/spreadsheets/d/【ここがID】/edit`

**Q: サービスアカウントのメールアドレスはどこで確認できますか？**
A: ダウンロードしたJSONファイルを開いて、`client_email` の値を確認してください。

**Q: マイグレーションSQLはどこにありますか？**
A: `backend/migrations/026_add_sync_logs.sql` にあります。

---

## ✅ 次のステップ

すべてのテストが成功したら:

1. **APIエンドポイントのテスト**
   ```bash
   # ターミナル1: バックエンドを起動
   cd backend
   npm run dev
   
   # ターミナル2: APIテストを実行
   cd backend
   npx ts-node test-sync-api-endpoints.ts
   ```

2. **フロントエンドUIの確認**
   ```bash
   # ターミナル3: フロントエンドを起動
   cd frontend
   npm run dev
   
   # ブラウザで http://localhost:5173/sync にアクセス
   ```

3. **実際の同期テスト**
   - UIから手動同期を実行
   - 同期ログを確認
   - エラーがないことを確認
