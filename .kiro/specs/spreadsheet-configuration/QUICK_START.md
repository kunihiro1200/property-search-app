# スプレッドシート設定 - クイックスタートガイド

## 🚀 5ステップで完了

### ステップ1: Google Service Accountを作成

1. **Google Cloud Consoleにアクセス**
   - [https://console.cloud.google.com/](https://console.cloud.google.com/) を開く
   - プロジェクトを選択または新規作成

2. **サービスアカウントを作成**
   - 左メニューから「APIとサービス」→「認証情報」を選択
   - 「認証情報を作成」→「サービスアカウント」をクリック
   - サービスアカウント名を入力（例: `spreadsheet-sync-service`）
   - 「作成して続行」→「続行」→「完了」をクリック

3. **JSONキーをダウンロード**
   - 作成したサービスアカウントをクリック
   - 「キー」タブに移動
   - 「鍵を追加」→「新しい鍵を作成」を選択
   - 「JSON」を選択して「作成」をクリック
   - JSONファイルがダウンロードされます

4. **Google Sheets APIを有効化**
   - 「APIとサービス」→「ライブラリ」に移動
   - "Google Sheets API" を検索
   - 「有効にする」をクリック

---

### ステップ2: サービスアカウントキーを設定

1. **ダウンロードしたJSONファイルを開く**
   - テキストエディタでJSONファイルを開く
   - 内容全体をコピー

2. **`.env` ファイルに追加**
   ```bash
   cd backend
   code .env  # または notepad .env
   ```
   
   以下を追加:
   ```env
   GOOGLE_SERVICE_ACCOUNT_KEY='{"type":"service_account","project_id":"...","private_key_id":"...","private_key":"...","client_email":"...","client_id":"...","auth_uri":"...","token_uri":"...","auth_provider_x509_cert_url":"...","client_x509_cert_url":"..."}'
   ```
   
   ⚠️ **重要:** 
   - JSON全体をシングルクォート `'` で囲む
   - 改行を含めない（1行にする）

---

### ステップ3: スプレッドシートIDを取得

1. **Google スプレッドシートを開く**
   - 物件リストのスプレッドシートにアクセス

2. **URLをコピー**
   - ブラウザのアドレスバーからURLをコピー
   
   例:
   ```
   https://docs.google.com/spreadsheets/d/1abc123def456ghi789jkl/edit#gid=0
   ```

3. **スプレッドシートIDを抽出**
   - `/d/` と `/edit` の間の文字列がスプレッドシートID
   
   上記の例では: `1abc123def456ghi789jkl`

---

### ステップ2: 環境変数を設定

1. **`.env` ファイルを開く**
   ```bash
   # プロジェクトのbackendディレクトリに移動
   cd backend
   
   # .envファイルを開く（エディタで開く）
   code .env
   # または
   notepad .env
   ```

2. **スプレッドシートIDを追加**
   
   `.env` ファイルに以下の行を追加:
   ```env
   PROPERTY_LISTING_SPREADSHEET_ID=1abc123def456ghi789jkl
   ```
   
   ⚠️ **注意:** `1abc123def456ghi789jkl` の部分を実際のスプレッドシートIDに置き換えてください

3. **ファイルを保存**

---

### ステップ4: スプレッドシートへのアクセス権限を付与

1. **サービスアカウントのメールアドレスを確認**
   - ダウンロードしたJSONファイルの `client_email` フィールドを確認
   - 例: `spreadsheet-sync-service@project-id.iam.gserviceaccount.com`

2. **各スプレッドシートに権限を付与**
   
   以下の各スプレッドシートに対して実行:
   - 売主リスト
   - 物件リスト
   - 買主リスト
   - 業務リスト
   - 追客履歴
   
   手順:
   1. Google Sheetsでスプレッドシートを開く
   2. 右上の「共有」ボタンをクリック
   3. サービスアカウントのメールアドレスを入力
   4. 権限を「閲覧者」に設定
   5. 「送信」をクリック

---

### ステップ5: 設定を確認

1. **検証スクリプトを実行**
   ```bash
   cd backend
   npm run verify-spreadsheet-config
   ```

2. **成功メッセージを確認**
   ```
   スプレッドシート設定を検証中...
   
   ✅ 環境変数の設定: OK
   
   スプレッドシートへの接続をテスト中...
   ✅ スプレッドシート接続: OK
   
   ✨ すべての設定が正常です！
   ```

---

## 📋 設定例

### 完全な `.env` ファイルの例

```env
# データベース設定
DATABASE_URL=postgresql://...
SUPABASE_URL=https://...
SUPABASE_ANON_KEY=...

# Google Sheets設定
PROPERTY_LISTING_SPREADSHEET_ID=1abc123def456ghi789jkl

# その他の設定
PORT=3001
NODE_ENV=development
```

---

## ❓ よくある質問

### Q1: スプレッドシートIDが見つかりません

**A:** URLの形式を確認してください。正しい形式は:
```
https://docs.google.com/spreadsheets/d/[ここがスプレッドシートID]/edit
```

### Q2: 「アクセス権限がありません」エラーが出ます

**A:** 以下を確認してください:
1. スプレッドシートが Google Service Account と共有されているか
2. Service Account のメールアドレス: `google-service-account.json` ファイル内の `client_email` を確認
3. スプレッドシートの共有設定で、そのメールアドレスに閲覧権限以上が付与されているか

### Q3: 検証スクリプトが見つかりません

**A:** まず、検証スクリプトを作成する必要があります:
```bash
cd backend
npm run verify-spreadsheet-config
```

スクリプトが存在しない場合は、`backend/verify-spreadsheet-config.ts` を作成してください。

---

## 🔧 トラブルシューティング

### エラー: "PROPERTY_LISTING_SPREADSHEET_ID が設定されていません"

**原因:** 環境変数が設定されていない

**解決方法:**
1. `backend/.env` ファイルを開く
2. `PROPERTY_LISTING_SPREADSHEET_ID=your_id_here` の行を追加
3. ファイルを保存
4. アプリケーションを再起動

---

### エラー: "スプレッドシートIDの形式が不正です"

**原因:** スプレッドシートIDの形式が正しくない

**解決方法:**
1. スプレッドシートのURLを再確認
2. `/d/` と `/edit` の間の文字列のみをコピー
3. 余分なスペースや改行がないか確認

---

### エラー: "スプレッドシートへの接続に失敗しました"

**原因:** 
- ネットワーク接続の問題
- スプレッドシートが削除された
- アクセス権限の問題

**解決方法:**
1. インターネット接続を確認
2. スプレッドシートが存在するか確認
3. Google Service Account の設定を確認
4. スプレッドシートの共有設定を確認

---

## 📞 サポート

問題が解決しない場合は、以下の情報を含めて報告してください:

1. エラーメッセージの全文
2. `.env` ファイルの内容（スプレッドシートIDは伏せ字で）
3. 実行したコマンド
4. 環境情報（OS、Node.jsバージョンなど）

---

## ✅ 次のステップ

設定が完了したら:

1. **アプリケーションを起動**
   ```bash
   npm run dev
   ```

2. **スプレッドシート同期をテスト**
   ```bash
   npm run sync-property-listings
   ```

3. **動作を確認**
   - 物件リストが正しく同期されているか確認
   - エラーログがないか確認

---

## 📚 関連ドキュメント

- [トラブルシューティングガイド](./TROUBLESHOOTING.md)
- [設計書](./design.md)
- [要件定義](./requirements.md)
