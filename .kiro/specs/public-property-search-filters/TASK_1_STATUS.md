# Task 1: Enable pg_trgm Extension - ステータス

## 完了したサブタスク

- ✅ **1.1** マイグレーションファイル `079_enable_pg_trgm_extension.sql` を作成
- ✅ **1.2** pg_trgm拡張機能を有効化するSQLコマンドを追加
- ✅ **1.3** マイグレーション実行スクリプト `run-079-migration.ts` を作成

## 残りのサブタスク

- ⏳ **1.4** 開発データベースでマイグレーションをテスト
- ⏳ **1.5** 拡張機能が有効化されたことを確認

## 実行方法

### 手動実行（推奨）

Supabase Dashboardから直接実行するのが最も簡単で確実です:

1. **Supabase Dashboard** → **SQL Editor** を開く
2. 以下のSQLを実行:
   ```sql
   CREATE EXTENSION IF NOT EXISTS pg_trgm;
   ```
3. 確認クエリを実行:
   ```sql
   SELECT * FROM pg_extension WHERE extname = 'pg_trgm';
   ```

詳細な手順は以下のドキュメントを参照:
- `backend/migrations/079_EXECUTION_GUIDE.md` - 詳細ガイド
- `backend/今すぐ実行_079マイグレーション.md` - クイックガイド

### スクリプト実行（参考）

```bash
cd backend
npx ts-node migrations/run-079-migration.ts
```

**注意:** このスクリプトは実行ガイドを表示するのみで、実際のマイグレーションは手動で実行する必要があります。

## 作成されたファイル

1. `backend/migrations/079_enable_pg_trgm_extension.sql` - マイグレーションSQL
2. `backend/migrations/run-079-migration.ts` - 実行スクリプト（ガイド表示用）
3. `backend/migrations/079_EXECUTION_GUIDE.md` - 詳細実行ガイド
4. `backend/今すぐ実行_079マイグレーション.md` - クイックガイド

## 次のステップ

1. ✅ Supabase Dashboardでpg_trgm拡張機能を有効化
2. ✅ 拡張機能が有効化されたことを確認
3. ➡️ **Task 2** に進む: 検索フィルター用のデータベースインデックスを作成

## 技術的な詳細

### pg_trgm拡張機能とは

PostgreSQLのpg_trgm拡張機能は、トライグラム（3文字の連続）ベースのテキスト類似検索を提供します。これにより:

- 部分一致検索が高速化
- GINインデックスを使用した効率的なテキスト検索
- 大文字小文字を区別しない検索のサポート

### 使用目的

この機能は、以下のフィールドでの部分一致検索を高速化するために使用されます:

- `address` フィールド（所在地検索）
- `property_number` フィールド（物件番号検索）

### パフォーマンスへの影響

- 拡張機能の有効化自体は、既存のクエリパフォーマンスに影響しません
- インデックス作成後（Task 2）、検索クエリが大幅に高速化されます
- ディスク使用量への影響は最小限です

## トラブルシューティング

### Q: 拡張機能が既に有効化されている場合は？

A: `CREATE EXTENSION IF NOT EXISTS` を使用しているため、既に有効化されている場合はエラーになりません。確認クエリで状態を確認してください。

### Q: 権限エラーが発生した場合は？

A: Supabase Dashboardから実行する場合、権限エラーは発生しないはずです。もし発生した場合は、Supabaseサポートに連絡してください。

### Q: 拡張機能を無効化する必要はありますか？

A: いいえ、一度有効化した拡張機能は無効化する必要はありません。既存の機能に影響を与えることはありません。

## 参考資料

- [PostgreSQL pg_trgm Documentation](https://www.postgresql.org/docs/current/pgtrgm.html)
- [Supabase Extensions Guide](https://supabase.com/docs/guides/database/extensions)
- [GIN Indexes in PostgreSQL](https://www.postgresql.org/docs/current/gin-intro.html)
