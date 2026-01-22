# 売主追客ログ履歴機能 - トラブルシューティング

## 問題: 通話モードページで履歴が表示されない

### 原因
APIエンドポイントのパスが正しくプロキシされていない可能性があります。

### 解決済み（2025/12/22）

以下の修正を実施しました：

1. **フロントエンド**: `FollowUpLogHistoryTable.tsx`
   - 変更前: `/sellers/${sellerNumber}/follow-up-logs/history`
   - 変更後: `/api/sellers/${sellerNumber}/follow-up-logs/history`

2. **バックエンド**: `index.ts`
   - 変更前: `app.use('/sellers', sellerRoutes)`
   - 変更後: `app.use('/api/sellers', sellerRoutes)`

### 確認手順

1. **バックエンドを再起動**
   ```bash
   cd backend
   npm run dev
   ```

2. **フロントエンドをハードリロード**
   - Ctrl+Shift+R (Windows) または Cmd+Shift+R (Mac)

3. **ブラウザのコンソールを確認**
   - F12キーを押して開発者ツールを開く
   - Consoleタブでエラーメッセージを確認
   - Networkタブで `/api/sellers/.../follow-up-logs/history` のリクエストを確認

4. **APIエンドポイントを直接テスト**
   ```bash
   cd backend
   npx ts-node test-follow-up-log-history-api.ts
   ```

### 期待される動作

1. **Networkタブ**:
   - リクエストURL: `http://localhost:5173/api/sellers/AA12923/follow-up-logs/history`
   - Status: `200 OK`
   - Response: JSON形式のデータ

2. **Consoleタブ**:
   - エラーメッセージなし
   - `=== getSortedEmailTemplates 実行 ===` などの通常のログのみ

3. **画面表示**:
   - 通話ログの下に「追客ログ履歴（APPSHEET）」セクションが表示される
   - テーブルに履歴データが表示される
   - リフレッシュボタンが機能する

## その他の問題

### 問題: データが空

**原因**: スプレッドシートにデータが存在しない、または売主番号が一致しない

**解決策**:
1. スプレッドシートを確認
   - ID: `1wKBRLWbT6pSKa9IlTDabjhjTnfs_GxX6Rn6M6kbio1I`
   - シート名: `売主追客ログ`
2. 売主番号が正しいか確認

### 問題: 認証エラー

**原因**: サービスアカウントの権限不足

**解決策**:
1. サービスアカウントがスプレッドシートにアクセスできるか確認
2. `.env`ファイルの`GOOGLE_SERVICE_ACCOUNT_KEY_PATH`が正しいか確認

### 問題: キャッシュが更新されない

**原因**: キャッシュのTTLが長すぎる

**解決策**:
1. リフレッシュボタンをクリック
2. `.env`ファイルの`FOLLOW_UP_LOG_CACHE_TTL`を調整（デフォルト: 300秒）

## デバッグコマンド

```bash
# APIエンドポイントをテスト
cd backend
npx ts-node test-follow-up-log-history-api.ts

# バックエンドのログを確認
# コンソールに以下のようなログが表示されるはず:
# [FollowUpLogHistoryService] Cache hit for all entries (age: 2.34 minutes)
# [FollowUpLogHistoryService] Fetching from spreadsheet...
# [FollowUpLogHistoryService] Fetched 150 rows from spreadsheet
```

## 連絡先

問題が解決しない場合は、以下の情報を添えて報告してください：
- ブラウザのコンソールのエラーメッセージ
- Networkタブのリクエスト/レスポンス
- バックエンドのログ
- スクリーンショット
