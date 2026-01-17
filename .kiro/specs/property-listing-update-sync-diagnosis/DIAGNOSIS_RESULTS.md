# 物件リスト更新同期診断 - Phase 2 診断結果

**診断実行日**: 2026-01-10  
**Status**: 🔍 診断中

## Phase 1 診断結果の分析

Phase 1の診断スクリプト実行により、以下の2つの主要な問題が発見されました:

### 問題1: sync_logsテーブルが見つからない ❌

**症状**:
```
sync_logsテーブルの読み込みエラー
```

**原因分析**:
1. **Migration 039が実行されていない可能性**
   - sync_logsテーブルはMigration 039で作成される
   - テーブルが存在しない = マイグレーションが未実行

2. **PostgRESTのスキーマキャッシュ問題**
   - マイグレーションは実行済みだが、PostgRESTがテーブルを認識していない
   - 過去に同様の問題が複数回発生している

**検証方法**:
```bash
# 1. テーブルの存在確認（PostgreSQL直接接続）
npx ts-node backend/check-sync-tables-direct-pg.ts

# 2. Supabase REST API経由での確認
npx ts-node backend/check-sync-tables.ts
```

### 問題2: スプレッドシート読み込みエラー ❌

**症状**:
```
Unable to parse range: '物件'!A2:ZZ
```

**原因分析**:
1. **シート名の問題**
   - スプレッドシートに「物件」という名前のシートが存在しない
   - または、シート名が異なる（例: 「物件リスト」「物件一覧」など）

2. **範囲指定の問題**
   - GoogleSheetsClientの範囲指定が不正
   - A2:ZZという範囲が大きすぎる可能性

3. **認証の問題**
   - サービスアカウントの権限が不足
   - スプレッドシートへのアクセス権がない

**検証方法**:
```bash
# 1. スプレッドシートのシート名を確認
npx ts-node backend/list-property-sheets.ts

# 2. GoogleSheetsClientの設定を確認
# backend/src/services/GoogleSheetsClient.ts を確認
```

## 根本原因の特定

### 原因1: sync_logsテーブルの問題

**最も可能性が高い原因**: PostgRESTのスキーマキャッシュ問題

**理由**:
- 過去に同様の問題が複数回発生している
- Migration 039は実装済み（コードに存在）
- テーブルは作成されているが、REST API経由でアクセスできない

**解決策**:
1. **PostgreSQL直接接続で確認**
   ```bash
   npx ts-node backend/check-sync-tables-direct-pg.ts
   ```

2. **テーブルが存在する場合**: PostgRESTのスキーマキャッシュをリロード
   ```sql
   -- Supabaseダッシュボードで実行
   NOTIFY pgrst, 'reload schema';
   ```

3. **テーブルが存在しない場合**: Migration 039を実行
   ```bash
   npx ts-node backend/migrations/run-039-migration.ts
   ```

### 原因2: スプレッドシート読み込みの問題

**最も可能性が高い原因**: シート名の不一致

**理由**:
- エラーメッセージが「Unable to parse range」
- 範囲指定ではなく、シート名が問題の可能性が高い

**解決策**:
1. **スプレッドシートのシート名を確認**
   ```bash
   npx ts-node backend/list-property-sheets.ts
   ```

2. **正しいシート名に修正**
   - `backend/src/services/PropertyListingSyncService.ts`
   - `backend/diagnose-property-listing-update-sync.ts`
   - 環境変数 `GOOGLE_SHEETS_PROPERTY_SHEET_NAME` を設定

3. **GoogleSheetsClientの設定を確認**
   - サービスアカウントの認証情報
   - スプレッドシートIDの正確性
   - シート名の正確性

## 推奨される解決手順

### ステップ1: sync_logsテーブルの問題を解決

```bash
# 1. PostgreSQL直接接続でテーブルの存在を確認
npx ts-node backend/check-sync-tables-direct-pg.ts

# 2a. テーブルが存在する場合
#     → Supabaseダッシュボードでスキーマキャッシュをリロード
#     SQL Editor で実行: NOTIFY pgrst, 'reload schema';

# 2b. テーブルが存在しない場合
#     → Migration 039を実行
npx ts-node backend/migrations/run-039-migration.ts

# 3. 確認
npx ts-node backend/check-sync-tables.ts
```

### ステップ2: スプレッドシート読み込みの問題を解決

```bash
# 1. スプレッドシートのシート名を確認
npx ts-node backend/list-property-sheets.ts

# 2. 正しいシート名を特定したら、以下のファイルを修正
#    - backend/src/services/PropertyListingSyncService.ts
#    - backend/diagnose-property-listing-update-sync.ts
#    シート名を '物件' から正しい名前に変更

# 3. 環境変数を設定（オプション）
#    backend/.env に追加:
#    GOOGLE_SHEETS_PROPERTY_SHEET_NAME=<正しいシート名>

# 4. 再度診断を実行
npx ts-node backend/diagnose-property-listing-update-sync.ts
```

### ステップ3: 自動同期の動作確認

```bash
# 1. バックエンドサーバーを再起動
cd backend
npm run dev

# 2. 起動ログで以下を確認
#    ✅ EnhancedAutoSyncService initialized
#    📊 Enhanced periodic auto-sync enabled

# 3. 5分後に sync_logs テーブルを確認
npx ts-node backend/check-recent-sync-logs.ts

# 4. データ差分を確認
npx ts-node backend/diagnose-property-listing-update-sync.ts
```

## 検証方法

### 検証1: sync_logsテーブルが正常に動作している

**期待される結果**:
- sync_logsテーブルにレコードが存在する
- sync_type = 'property_listing_update' のレコードがある
- 最新のレコードが5分以内に作成されている

**検証コマンド**:
```bash
npx ts-node backend/check-recent-sync-logs.ts
```

### 検証2: スプレッドシートからデータを読み込める

**期待される結果**:
- スプレッドシートからデータを正常に読み込める
- 物件番号、ATBB状況、状況などのフィールドが取得できる

**検証コマンド**:
```bash
npx ts-node backend/diagnose-property-listing-update-sync.ts
```

### 検証3: データ差分が解消されている

**期待される結果**:
- スプレッドシートとデータベースのデータが一致している
- 差分がある場合、次回の自動同期（5分以内）で更新される

**検証コマンド**:
```bash
# 特定の物件について詳細に確認
npx ts-node backend/diagnose-specific-property-sync.ts AA4885
```

## 次のステップ

### Phase 3: 解決策の実装

1. **Task 3.1**: sync_logsテーブルの問題を解決
   - PostgreSQL直接接続で確認
   - 必要に応じてMigration 039を実行
   - PostgRESTのスキーマキャッシュをリロード

2. **Task 3.2**: スプレッドシート読み込みの問題を解決
   - シート名を確認
   - コードを修正
   - 環境変数を設定

3. **Task 3.3**: 自動同期の動作確認
   - バックエンドサーバーを再起動
   - 起動ログを確認
   - sync_logsテーブルを確認
   - データ差分を確認

4. **Task 3.4**: 解決後の検証
   - 全ての検証項目をクリア
   - ドキュメントを更新

## まとめ

Phase 2の診断により、以下の2つの主要な問題が特定されました:

1. **sync_logsテーブルが見つからない**
   - 原因: PostgRESTのスキーマキャッシュ問題（最も可能性が高い）
   - 解決策: スキーマキャッシュのリロード、または Migration 039の実行

2. **スプレッドシート読み込みエラー**
   - 原因: シート名の不一致（最も可能性が高い）
   - 解決策: 正しいシート名の特定と設定

これらの問題を解決することで、物件リスト更新同期が正常に動作するようになります。

---

**Phase 2 完了**: 2026-01-10  
**次のアクション**: Phase 3 - 解決策の実装
