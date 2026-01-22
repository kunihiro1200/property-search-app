# AA4885 物件リストATBB状況自動同期 - クイックスタート

## 🚀 今すぐ使える！

AA4885の物件リストATBB状況自動同期機能が実装されました。このガイドに従って、すぐに使い始めることができます。

## 📋 前提条件

- Node.js と npm がインストールされていること
- バックエンドの環境変数が設定されていること
- Google Sheets API の認証情報が設定されていること

## ⚡ 3ステップで開始

### ステップ1: package.jsonにスクリプトを追加

`backend/package.json`の`scripts`セクションに以下を追加:

```json
{
  "scripts": {
    "diagnose:property-listing": "ts-node diagnose-aa4885-property-listing-sync.ts",
    "sync:property-listing:manual": "ts-node force-sync-property-listing.ts"
  }
}
```

### ステップ2: バックエンドを再起動

```bash
cd backend
npm run dev
```

バックエンドが起動すると、以下のログが表示されます:

```
✅ AutoSyncService initialized (including PropertyListingSyncService)
🔄 Starting periodic sync (interval: 5 minutes)
```

### ステップ3: 動作確認

#### 3-1. 診断スクリプトで現在の状態を確認

```bash
cd backend
npm run diagnose:property-listing AA4885
```

**期待される出力:**
```
🔍 診断開始: AA4885
============================================================

📊 スプレッドシートからデータを取得中...
✅ スプレッドシートに存在します
   ATBB状況（生データ）: "公開中"
   ATBB状況（正規化後）: "公開中"

📊 データベースからデータを取得中...
✅ データベースに存在します
   ATBB状況: "非公開"
   最終更新: 2025-01-10T12:00:00Z

🔍 差分チェック中...
⚠️  差分が検出されました！
   スプレッドシート: "公開中"
   データベース: "非公開"
```

#### 3-2. 手動同期で即座に修正

差分が検出された場合、手動同期で即座に修正できます:

```bash
npm run sync:property-listing:manual AA4885
```

**期待される出力:**
```
🔄 手動同期開始: AA4885
============================================================

📊 スプレッドシートから最新データを取得中...
✅ スプレッドシートからデータを取得しました

💾 データベースを更新中...
✅ データベースを更新しました

============================================================
✅ 手動同期完了
============================================================
物件番号: AA4885
更新フィールド数: 1
更新フィールド: atbb_status
```

#### 3-3. 自動同期の動作を確認

バックエンドのログを監視して、5分ごとに自動同期が実行されることを確認:

```
🔄 Auto-sync: Checking for new sellers...
📊 Latest seller in DB: AA13244
📊 Total rows in spreadsheet: 1234
🆕 New sellers to sync: 0
✅ No new sellers to sync

🔄 Starting property listing update sync...
📊 Detected 3 properties with changes
Processing batch 1/1 (3 properties)...
  ✅ 3 updated, ❌ 0 failed
✅ Property listing sync: 3 updated

📊 Sync Summary:
  Total: 3
  Updated: 3
  Failed: 0
  Duration: 1234ms
```

## 🎯 よくある使用シーン

### シーン1: AA4885のATBB状況が更新されない

**問題:**
スプレッドシートでAA4885のATBB状況を「公開中」に変更したが、データベースに反映されない。

**解決方法:**

1. **診断で確認:**
   ```bash
   npm run diagnose:property-listing AA4885
   ```

2. **差分が検出されたら手動同期:**
   ```bash
   npm run sync:property-listing:manual AA4885
   ```

3. **結果を確認:**
   ```bash
   npm run diagnose:property-listing AA4885
   ```
   → 「✅ 同期済み（差分なし）」と表示されればOK

### シーン2: 複数の物件を一括で同期したい

**方法:**
自動同期を待つか、バックエンドを再起動して即座に実行:

```bash
# バックエンドを再起動
cd backend
npm run dev
```

起動時に自動同期が実行され、すべての物件の差分が検出・更新されます。

### シーン3: 特定の物件だけ手動で同期したい

**方法:**
手動同期スクリプトを使用:

```bash
# AA13129を手動同期
npm run sync:property-listing:manual AA13129

# AA18を手動同期
npm run sync:property-listing:manual AA18
```

## 📊 同期の仕組み

### 自動同期（5分ごと）

```
1. PeriodicSyncManager が5分ごとに起動
   ↓
2. AutoSyncService.syncNewSellers() を実行
   ↓
3. 売主リストの新規データを同期
   ↓
4. PropertyListingSyncService.syncUpdatedPropertyListings() を実行
   ↓
5. 業務リストの更新データを検出
   ↓
6. ATBB状況を含むすべてのフィールドをデータベースに反映
   ↓
7. sync_logs テーブルに結果を記録
```

### 手動同期（即座に実行）

```
1. npm run sync:property-listing:manual AA4885
   ↓
2. スプレッドシートから最新データを取得
   ↓
3. データベースの現在の状態を取得
   ↓
4. 差分を検出
   ↓
5. データベースを更新
   ↓
6. 結果を表示
```

## 🔍 トラブルシューティング

### 問題1: 診断スクリプトが「スプレッドシートに存在しません」と表示される

**原因:**
物件番号が間違っているか、スプレッドシートに物件が存在しない。

**解決方法:**
1. スプレッドシートで物件番号を確認
2. 正しい物件番号で再実行

### 問題2: 手動同期が「データベースに物件が存在しません」と表示される

**原因:**
物件がまだデータベースに追加されていない（新規物件）。

**解決方法:**
1. 新規物件の場合は、まず売主リストに追加
2. 自動同期が実行されるのを待つ（最大5分）
3. または、バックエンドを再起動して即座に同期

### 問題3: 自動同期が実行されない

**原因:**
- バックエンドが起動していない
- 環境変数が設定されていない
- Google Sheets API の認証に失敗している

**解決方法:**
1. バックエンドのログを確認:
   ```
   ✅ AutoSyncService initialized (including PropertyListingSyncService)
   ```
   このメッセージが表示されていればOK

2. 環境変数を確認:
   ```bash
   # .env ファイルを確認
   cat backend/.env | grep GOOGLE_SHEETS
   ```

3. Google Sheets API の認証情報を確認:
   ```bash
   # google-service-account.json が存在することを確認
   ls backend/google-service-account.json
   ```

## 📝 コマンド一覧

| コマンド | 説明 | 使用例 |
|---------|------|--------|
| `npm run diagnose:property-listing <物件番号>` | 物件の同期状態を診断 | `npm run diagnose:property-listing AA4885` |
| `npm run sync:property-listing:manual <物件番号>` | 物件を手動で同期 | `npm run sync:property-listing:manual AA4885` |
| `npm run dev` | バックエンドを起動（自動同期が有効） | `npm run dev` |

## 🎉 成功の確認

以下の条件がすべて満たされていれば、実装は成功です:

- ✅ バックエンド起動時に「AutoSyncService initialized (including PropertyListingSyncService)」と表示される
- ✅ 5分ごとに「Starting property listing update sync...」と表示される
- ✅ 診断スクリプトで差分が検出される
- ✅ 手動同期スクリプトでデータベースが更新される
- ✅ 診断スクリプトで「同期済み（差分なし）」と表示される

## 📚 次のステップ

1. **[実装完了ドキュメント](./IMPLEMENTATION_COMPLETE.md)** を読んで、実装の詳細を理解する
2. **[要件定義書](./requirements.md)** を読んで、各要件の詳細を確認する
3. **[設計書](./design.md)** を読んで、アーキテクチャを理解する

## 💡 ヒント

- **診断スクリプトを活用**: 問題が発生したら、まず診断スクリプトで状態を確認
- **手動同期で即座に修正**: 緊急時は手動同期で即座に問題を解決
- **自動同期に任せる**: 通常は自動同期に任せて、5分ごとに自動的に同期される

---

**作成日**: 2025-01-10
**最終更新**: 2025-01-10
