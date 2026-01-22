# PostgREST Schema Cache Bypass Solution

## 背景

Migration 039を実行してSupabaseダッシュボードでSQLを実行完了したが、PostgRESTのスキーマキャッシュが更新されず、`verify-migration-039.ts`が新しいテーブル（`sync_health`、`sync_logs`の拡張カラム）を認識できない問題が発生している。

ユーザーは以下の方法を何度も試したが、すべて失敗している：
- `NOTIFY pgrst, 'reload schema';` SQL実行（30秒待機）
- PostgRESTをSupabaseダッシュボードから再起動（60秒待機）
- Supabaseプロジェクト全体の一時停止/再起動
- その他複数のキャッシュクリア手法

## 問題の根本原因

検証スクリプト `backend/verify-migration-039.ts` は Supabase クライアント（PostgREST REST API経由）を使用しているため、PostgRESTのキャッシュされたスキーマを参照している。PostgreSQLデータベースには正しくテーブルが存在しているが、PostgRESTのキャッシュが古いままになっている可能性が高い。

## 解決策

PostgRESTを完全にバイパスし、PostgreSQLに直接接続して検証を行う新しいスクリプトを作成する。

## ユーザーストーリー

### US-1: 直接PostgreSQL接続による検証
**As a** 開発者  
**I want to** PostgRESTをバイパスしてPostgreSQLに直接接続して検証する  
**So that** キャッシュ問題に影響されずにマイグレーションの成功を確認できる

**受け入れ基準:**
- `pg` ライブラリを使用してPostgreSQLに直接接続できる
- `sync_health` テーブルの存在を確認できる
- `sync_logs` テーブルの新しいカラム（`missing_sellers_detected`, `triggered_by`, `health_status`）の存在を確認できる
- 検証結果を明確に表示する（成功/失敗、詳細情報）
- エラーが発生した場合は詳細なエラーメッセージを表示する

### US-2: 環境変数からの接続情報取得
**As a** 開発者  
**I want to** `.env` ファイルから `DATABASE_URL` を読み込む  
**So that** 接続情報をハードコードせずに安全に管理できる

**受け入れ基準:**
- `DATABASE_URL` 環境変数から接続文字列を取得できる
- 環境変数が設定されていない場合は明確なエラーメッセージを表示する
- 接続文字列の形式を検証する

### US-3: 詳細な検証レポート
**As a** 開発者  
**I want to** 検証結果の詳細なレポートを見る  
**So that** 問題がある場合に何が不足しているか正確に把握できる

**受け入れ基準:**
- テーブルの存在確認結果を表示する
- カラムの存在確認結果を個別に表示する
- サンプルデータがある場合は表示する
- 総合的な成功/失敗ステータスを表示する

## 技術的要件

### 依存関係
- `pg` パッケージ（PostgreSQL直接接続用）
- `dotenv` パッケージ（環境変数読み込み用）

### 接続情報
- 環境変数: `DATABASE_URL`
- 形式: `postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres`
- 既存の `.env` ファイルに設定済み

### 検証項目
1. **sync_health テーブル**
   - テーブルの存在確認
   - カラム構造の確認
   - サンプルレコードの取得（存在する場合）

2. **sync_logs テーブルの拡張**
   - `missing_sellers_detected` カラムの存在確認
   - `triggered_by` カラムの存在確認
   - `health_status` カラムの存在確認

### 出力形式
```
🔍 Verifying Migration 039 (Direct PostgreSQL Connection)...

1. Checking sync_health table...
✅ sync_health table exists
   Columns: id, last_sync_time, last_sync_success, pending_missing_sellers, consecutive_failures, is_healthy, sync_interval_minutes, created_at, updated_at
   Records: 1
   Sample: { ... }

2. Checking sync_logs table extensions...
✅ missing_sellers_detected column exists (type: integer)
✅ triggered_by column exists (type: character varying)
✅ health_status column exists (type: character varying)

📊 Migration 039 Status:
✅ Migration 039 is COMPLETE (verified via direct PostgreSQL connection)
   - sync_health table created
   - sync_logs table extended
   - Auto-sync health monitoring is ready
```

## 非機能要件

### パフォーマンス
- 検証は10秒以内に完了すること
- 接続タイムアウトは30秒に設定すること

### セキュリティ
- データベース接続情報を環境変数から取得すること
- 接続情報をログに出力しないこと
- 読み取り専用のクエリのみを実行すること

### エラーハンドリング
- 接続エラーを適切にキャッチして表示すること
- SQLエラーを詳細に表示すること
- 環境変数が未設定の場合は明確なエラーメッセージを表示すること

## 制約事項

- PostgreSQL 14以上を想定
- Supabaseの接続制限内で動作すること
- 既存のデータを変更しないこと（読み取り専用）

## 成功基準

1. 新しい検証スクリプトがPostgreSQLに直接接続できる
2. `sync_health` テーブルの存在を確認できる
3. `sync_logs` テーブルの新しいカラムの存在を確認できる
4. PostgRESTのキャッシュ状態に関係なく正確な結果が得られる
5. 検証結果が明確で理解しやすい形式で表示される

## 次のステップ

検証が成功した場合：
1. PostgRESTのキャッシュ問題が確認される
2. 自動同期サービス（`EnhancedAutoSyncService`）でも直接PostgreSQL接続を使用することを検討
3. Supabaseサポートにキャッシュ問題を報告

検証が失敗した場合：
1. マイグレーションSQLが正しく実行されていない可能性
2. Supabaseダッシュボードでの実行ログを再確認
3. 手動でSQLを再実行

## 参考資料

- Migration SQL: `backend/migrations/039_add_sync_health.sql`
- 既存の検証スクリプト: `backend/verify-migration-039.ts`
- 自動同期サービス: `backend/src/services/EnhancedAutoSyncService.ts`
- 環境変数設定: `backend/.env`
