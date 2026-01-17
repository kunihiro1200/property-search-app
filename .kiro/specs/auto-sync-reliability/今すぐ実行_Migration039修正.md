# 今すぐ実行: Migration 039 修正

## 🎯 目的

Migration 039のSQL構文エラーを修正し、sync_healthテーブルとsync_logsテーブルの拡張を完了します。

## ⚠️ 重要な注意事項

- **修正済みのSQLファイルを使用してください**
- 元のファイルには構文エラーがありましたが、現在は修正されています
- Supabaseダッシュボードから実行する必要があります

## 📋 実行手順

### ステップ1: SQLファイルの内容をコピー

1. `backend/migrations/039_add_sync_health.sql`ファイルを開く
2. ファイルの全内容をコピー（Ctrl+A → Ctrl+C）

### ステップ2: Supabaseダッシュボードで実行

1. [Supabaseダッシュボード](https://app.supabase.com/)にログイン
2. プロジェクトを選択
3. 左サイドバーから「**SQL Editor**」をクリック
4. 「**New query**」ボタンをクリック
5. コピーしたSQLをペースト（Ctrl+V）
6. 「**Run**」ボタンをクリック

### ステップ3: 実行結果の確認

以下のメッセージが表示されれば成功です：
```
Success. No rows returned
```

## ✅ 確認方法

以下のSQLを実行して、テーブルとカラムが正しく作成されたことを確認します：

```sql
-- sync_healthテーブルの確認
SELECT * FROM sync_health;

-- sync_logsの新しいカラムを確認
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'sync_logs' 
  AND column_name IN ('missing_sellers_detected', 'triggered_by', 'health_status');
```

### 期待される結果

#### sync_healthテーブル
- 1件のレコードが存在する
- `is_healthy`カラムが`true`
- `sync_interval_minutes`カラムが`5`

#### sync_logsテーブル
- `missing_sellers_detected`カラムが存在する（INTEGER型）
- `triggered_by`カラムが存在する（VARCHAR型）
- `health_status`カラムが存在する（VARCHAR型）

## 🔧 トラブルシューティング

### エラー: relation "sync_logs" does not exist

**原因**: sync_logsテーブルがまだ作成されていません

**対処法**:
1. 先にMigration 068または069を実行してsync_logsテーブルを作成してください
2. その後、Migration 039を再実行してください

### エラー: permission denied

**原因**: 権限が不足しています

**対処法**:
1. Supabaseダッシュボードの「SQL Editor」から実行していることを確認
2. プロジェクトの管理者権限があることを確認

### エラー: syntax error at end of input

**原因**: 古いバージョンのSQLファイルを使用しています

**対処法**:
1. 最新の`backend/migrations/039_add_sync_health.sql`を使用していることを確認
2. ファイルの最後に完全なCREATE INDEX文があることを確認

## 📚 詳細情報

詳しい説明は以下のドキュメントを参照してください：
- [Migration 039修正完了ガイド](.kiro/specs/auto-sync-reliability/MIGRATION_039_FIX_COMPLETE.md)
- [実装状況](.kiro/specs/auto-sync-reliability/IMPLEMENTATION_STATUS.md)

## 🎉 完了後

Migration 039の実行が完了したら、次のステップに進めます：

1. ✅ Migration 039実行完了
2. ⏭️ Migration 053実行（オプション）
3. ⏭️ 自動同期機能のテスト
4. ⏭️ APIエンドポイントの動作確認

---

**作成日**: 2026-01-07  
**ステータス**: 修正完了・実行準備完了
