# Migration 065: Seller List Management Enhancements - 実行ガイド

## 概要
このマイグレーションは、seller-list-management仕様の実装に必要なデータベーススキーマを作成・拡張します。

## 対象テーブル
1. **sellers** - 売主情報（拡張）
2. **properties** - 物件情報（拡張）
3. **valuations** - 査定情報（新規作成）
4. **activity_logs** - アクティビティログ（拡張）
5. **follow_ups** - フォローアップ（新規作成）
6. **appointments** - アポイントメント（拡張）
7. **emails** - メール履歴（拡張）
8. **sync_logs** - 同期ログ（新規作成）
9. **audit_logs** - 監査ログ（新規作成）

## 実行前の確認事項

### 1. 環境変数の確認
```bash
# .envファイルに以下が設定されていることを確認
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### 2. バックアップの作成
重要なデータがある場合は、必ずバックアップを取得してください。

```bash
# Supabaseダッシュボードから手動バックアップを作成
# または、pg_dumpを使用してバックアップ
```

## 実行方法

### オプション1: TypeScriptスクリプトで実行（推奨）

```bash
cd backend
npx ts-node migrations/run-065-migration.ts
```

### オプション2: Supabaseダッシュボードで実行

1. Supabaseダッシュボードにログイン
2. SQL Editorを開く
3. `065_seller_list_management_enhancements.sql`の内容をコピー&ペースト
4. 実行

### オプション3: psqlで直接実行

```bash
psql $DATABASE_URL -f backend/migrations/065_seller_list_management_enhancements.sql
```

## 実行後の確認

### 1. テーブルの存在確認

```sql
-- すべてのテーブルが存在することを確認
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
  'sellers', 'properties', 'valuations', 'activity_logs',
  'follow_ups', 'appointments', 'emails', 'sync_logs', 'audit_logs'
);
```

### 2. インデックスの確認

```sql
-- 作成されたインデックスを確認
SELECT 
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
AND tablename IN (
  'sellers', 'properties', 'valuations', 'activity_logs',
  'follow_ups', 'appointments', 'emails', 'sync_logs', 'audit_logs'
)
ORDER BY tablename, indexname;
```

### 3. トリガーの確認

```sql
-- 更新トリガーが設定されていることを確認
SELECT 
  trigger_name,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE trigger_schema = 'public'
AND event_object_table IN ('sellers', 'properties', 'valuations', 'follow_ups');
```

## トラブルシューティング

### エラー: "relation already exists"
既存のテーブルやインデックスが存在する場合、このエラーが発生することがあります。
マイグレーションは`IF NOT EXISTS`を使用しているため、通常は問題ありません。

### エラー: "column already exists"
既存のカラムが存在する場合、このエラーが発生することがあります。
マイグレーションは`ADD COLUMN IF NOT EXISTS`を使用しているため、通常は問題ありません。

### エラー: "permission denied"
SUPABASE_SERVICE_ROLE_KEYが正しく設定されているか確認してください。

### PostgRESTキャッシュの更新
マイグレーション後、PostgRESTのスキーマキャッシュを更新する必要がある場合があります。

```sql
-- スキーマキャッシュを強制リロード
NOTIFY pgrst, 'reload schema';
```

または、Supabaseプロジェクトを一時停止して再起動してください。

## ロールバック方法

問題が発生した場合は、ロールバックスクリプトを実行してください。

```bash
# TypeScriptスクリプトで実行
npx ts-node migrations/run-065-rollback.ts

# または、SQLファイルを直接実行
psql $DATABASE_URL -f backend/migrations/065_seller_list_management_enhancements_rollback.sql
```

**注意:** ロールバックは新規作成されたテーブルとインデックスのみを削除します。
既存テーブルに追加されたカラムは削除されません（データ損失を防ぐため）。

## 次のステップ

マイグレーションが正常に完了したら、以下のタスクに進んでください：

1. ✅ セクション1完了: データベーススキーマとマイグレーション
2. ⏭️ セクション2: コアサービス（暗号化、売主番号生成）
3. ⏭️ セクション3: 売主管理サービス
4. ⏭️ セクション4以降: その他のサービスとAPI実装

## 関連ファイル

- マイグレーションSQL: `065_seller_list_management_enhancements.sql`
- ロールバックSQL: `065_seller_list_management_enhancements_rollback.sql`
- 実行スクリプト: `run-065-migration.ts`
- タスクリスト: `.kiro/specs/seller-list-management/tasks.md`
- 設計ドキュメント: `.kiro/specs/seller-list-management/design.md`
- 要件ドキュメント: `.kiro/specs/seller-list-management/requirements.md`
