# OAuth 2.0 セットアップ クイックスタート

組織ポリシーでサービスアカウントキーの作成が制限されている場合、OAuth 2.0認証を使用してGoogle Sheets APIにアクセスできます。

## 前提条件

- Google Cloud Console プロジェクト: `arboreal-pen-437413-v9`
- Google Sheets API が有効化されていること
- スプレッドシートへのアクセス権限

## セットアップ手順（5ステップ）

### ステップ1: OAuth同意画面を設定

1. [Google Cloud Console](https://console.cloud.google.com/) にアクセス
2. プロジェクト `arboreal-pen-437413-v9` を選択
3. 左メニュー「APIとサービス」→「OAuth同意画面」を選択
4. **既にOAuth同意画面が作成されている場合**:
   - 画面上部の「アプリを編集」ボタンをクリック
   - または、左側のメニューから「対象」をクリックし、「編集」ボタンをクリック
5. **新規作成の場合**:
   - User Type: 内部（Internal）を選択
   - アプリ名: `Spreadsheet Sync Client`
   - ユーザーサポートメール: `tomoko.kunihiro@ifoo-oita.com`
   - デベロッパーの連絡先情報: `tomoko.kunihiro@ifoo-oita.com`
6. 「スコープ」セクションで「スコープを追加または削除」をクリック
7. `https://www.googleapis.com/auth/spreadsheets` を検索して追加
8. 「更新」をクリックしてスコープを保存
9. 「保存して次へ」をクリックして完了

### ステップ2: OAuth 2.0 クライアントIDを作成

1. 左メニュー「APIとサービス」→「認証情報」を選択
2. 「認証情報を作成」→「OAuth クライアント ID」をクリック
3. 以下を設定：
   - **アプリケーションの種類**: ウェブアプリケーション
   - **名前**: `Spreadsheet Sync Client`
   - **承認済みのリダイレクトURI**: `http://localhost:3000/api/google/callback`
4. 「作成」をクリック
5. 表示された**クライアントID**と**クライアントシークレット**をメモ

### ステップ3: 環境変数を一時設定

`backend/.env` ファイルに以下を追加：

```env
GOOGLE_OAUTH_CLIENT_ID=あなたのクライアントID
GOOGLE_OAUTH_CLIENT_SECRET=あなたのクライアントシークレット
```

### ステップ4: リフレッシュトークンを取得

1. ターミナルで以下を実行：
   ```bash
   cd backend
   npm run sheets:get-oauth-token
   ```

2. 表示されたURLをコピーしてブラウザで開く

3. Googleアカウント（`tomoko.kunihiro@ifoo-oita.com`）でログイン

4. アクセスを許可

5. リダイレクト後のURLから `code` パラメータをコピー：
   ```
   http://localhost:3000/api/google/callback?code=4/0AeanS0vTL...
   ```
   → `4/0AeanS0vTL...` の部分をコピー

6. ターミナルに戻り、コードを貼り付けてEnter

7. 表示された**リフレッシュトークン**をメモ

### ステップ5: 環境変数を完全設定

`backend/.env` ファイルを以下のように更新：

```env
# Google Sheets API Configuration
GOOGLE_SHEETS_SPREADSHEET_ID=1wKBRLWbT6pSKa9IlTDabjhjTnfs_GxX6Rn6M6kbio1I
GOOGLE_SHEETS_SHEET_NAME=売主リスト

# OAuth 2.0 Configuration
GOOGLE_OAUTH_CLIENT_ID=あなたのクライアントID
GOOGLE_OAUTH_CLIENT_SECRET=あなたのクライアントシークレット
GOOGLE_OAUTH_REFRESH_TOKEN=あなたのリフレッシュトークン
```

## 動作確認

接続テストを実行：

```bash
cd backend
npm run sheets:test-connection
```

成功すると以下のように表示されます：

```
✅ OAuth 2.0認証成功
✅ スプレッドシート名: 売主リスト
✅ すべてのテストが成功しました！
```

## スプレッドシートの共有設定

OAuth 2.0を使用する場合、認証したGoogleアカウントがスプレッドシートにアクセスできる必要があります：

1. [スプレッドシート](https://docs.google.com/spreadsheets/d/1wKBRLWbT6pSKa9IlTDabjhjTnfs_GxX6Rn6M6kbio1I/edit)を開く
2. 「共有」ボタンをクリック
3. `tomoko.kunihiro@ifoo-oita.com` を追加（既に追加されている場合はスキップ）
4. 権限: **編集者**を選択
5. 「送信」をクリック

## トラブルシューティング

### エラー: "redirect_uri_mismatch"

**原因**: リダイレクトURIが一致していない

**解決方法**:
1. Google Cloud Consoleの「認証情報」ページを開く
2. 作成したOAuth 2.0クライアントIDをクリック
3. 「承認済みのリダイレクトURI」に `http://localhost:3000/api/google/callback` が追加されているか確認
4. 追加されていない場合は追加して保存

### エラー: "invalid_grant"

**原因**: 認証コードが期限切れまたは既に使用済み

**解決方法**:
1. ステップ4を最初からやり直す
2. 新しい認証URLを開いて新しいコードを取得

### エラー: "Access blocked: This app's request is invalid"

**原因**: OAuth同意画面の設定が不完全

**解決方法**:
1. OAuth同意画面の設定を確認
2. スコープ `https://www.googleapis.com/auth/spreadsheets` が追加されているか確認
3. User Typeが「内部」になっているか確認

### エラー: "The caller does not have permission"

**原因**: 認証したアカウントがスプレッドシートにアクセスできない

**解決方法**:
1. スプレッドシートの共有設定を確認
2. 認証に使用したGoogleアカウントが編集者として追加されているか確認

## セキュリティに関する注意事項

1. **リフレッシュトークンは秘密情報です**
   - `.env` ファイルをGitにコミットしないでください
   - `.gitignore` に `.env` が含まれていることを確認してください

2. **リフレッシュトークンは一度しか表示されません**
   - 安全な場所に保管してください
   - 紛失した場合は、ステップ4を再実行して新しいトークンを取得してください

3. **定期的なトークンのローテーション**
   - セキュリティのため、定期的に新しいトークンを取得することを推奨します

## 次のステップ

セットアップが完了したら、以下のタスクに進みます：

1. スプレッドシートからSupabaseへの初回データ移行
2. ブラウザアプリでの編集内容をスプレッドシートに同期
3. 査定依頼メールからの自動売主登録

詳細は `SETUP_GUIDE.md` を参照してください。
