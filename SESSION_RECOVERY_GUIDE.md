# セッション復元ガイド - 2025年1月17日

## 📋 このセッションで完了した作業

### 1. commentsカラムの削除（完了）
- **マイグレーション**: `087_remove_comments_from_sellers.sql`
- **影響範囲**: sellersテーブルから`comments`カラムを削除
- **コード修正**: バックエンド・フロントエンドの両方から`comments`参照を削除

### 2. confidenceカラムの削除（完了）
- **状況**: `confidence`カラムは既にデータベースから削除済み
- **コード修正**: バックエンド・フロントエンドから`confidence`参照を削除
- **マイグレーション**: 不要（既に削除済み）

### 3. sellersテーブルの復元（完了）
- **問題**: Supabaseプロジェクト変更により、sellersテーブルが空になった
- **マイグレーション**: `092_recreate_sellers_no_constraints.sql`
- **データ同期**: スプレッドシートから6,649件の売主データを同期
- **RLS無効化**: `094_DISABLE_RLS_SIMPLE.sql`
- **リレーション設定**: `095_setup_seller_property_relationship.sql`

### 4. 通話モードページの修正（完了）
- **問題**: employeesテーブルに`initials`カラムが存在しない
- **マイグレーション**: `097_add_initials_to_employees.sql` - initialsカラムを追加
- **マイグレーション**: `098_fix_employees_constraints.sql` - 制約を修正
- **スタッフ同期**: スプレッドシートから10人のスタッフデータを同期

## 🗄️ データベースの現在の状態

### sellersテーブル
- **レコード数**: 6,649件
- **データソース**: Google Spreadsheet `1wKBRLWbT6pSKa9IlTDabjhjTnfs_GxX6Rn6M6kbio1I`
- **RLS**: 無効
- **主要カラム**: seller_number, name, email, phone_number, address, status

### employeesテーブル
- **レコード数**: 10人
- **データソース**: Google Spreadsheet `19yAuVYQRm-_zhjYX7M7zjiGbnBibkG77Mpz93sN1xxs`
- **主要カラム**: id, name, email, initials, role, is_active, google_id (NULL許可)

## 🔧 実行済みマイグレーション

| マイグレーション | 説明 | 状態 |
|----------------|------|------|
| 087 | sellersテーブルからcommentsカラムを削除 | ✅ 完了 |
| 092 | sellersテーブルを制約なしで再作成 | ✅ 完了 |
| 094 | sellersテーブルのRLSを無効化 | ✅ 完了 |
| 095 | seller-propertyリレーションシップを設定 | ✅ 完了 |
| 097 | employeesテーブルにinitialsカラムを追加 | ✅ 完了 |
| 098 | employeesテーブルの制約を修正 | ✅ 完了 |

## 📂 重要なファイル

### 同期スクリプト
- `backend/sync-all-sellers-from-sheet.ts` - 売主データ同期
- `backend/sync-staff-from-spreadsheet.ts` - スタッフデータ同期

### マイグレーションファイル
- `backend/migrations/087_remove_comments_from_sellers.sql`
- `backend/migrations/092_recreate_sellers_no_constraints.sql`
- `backend/migrations/094_DISABLE_RLS_SIMPLE.sql`
- `backend/migrations/095_setup_seller_property_relationship.sql`
- `backend/migrations/097_add_initials_to_employees.sql`
- `backend/migrations/098_fix_employees_constraints.sql`

### 診断スクリプト
- `backend/check-employees-current-state.ts` - employeesテーブルの状態確認
- `backend/check-staff-spreadsheet.ts` - スタッフスプレッドシートの構造確認

## 🔄 データ復元手順（問題が発生した場合）

### sellersテーブルが空になった場合

1. **マイグレーション092を実行**（Supabase SQL Editor）:
```sql
-- backend/migrations/092_recreate_sellers_no_constraints.sql の内容を実行
```

2. **RLSを無効化**（Supabase SQL Editor）:
```sql
-- backend/migrations/094_DISABLE_RLS_SIMPLE.sql の内容を実行
```

3. **売主データを同期**:
```bash
cd backend
npx ts-node sync-all-sellers-from-sheet.ts
```

### employeesテーブルが空になった場合

1. **マイグレーション097と098を実行**（Supabase SQL Editor）:
```sql
-- backend/migrations/097_add_initials_to_employees.sql の内容を実行
-- backend/migrations/098_fix_employees_constraints.sql の内容を実行
```

2. **スタッフデータを同期**:
```bash
cd backend
npx ts-node sync-staff-from-spreadsheet.ts
```

### 通話モードページが開かない場合

**原因**: employeesテーブルに`initials`カラムがない、またはスタッフデータが同期されていない

**解決策**:
1. マイグレーション097と098を実行
2. スタッフデータを同期（上記参照）
3. バックエンドサーバーを再起動

## 🔑 重要な環境変数

```env
# Supabase（新しいプロジェクト）
SUPABASE_URL=https://krxhrbtlgfjzsseegaqq.supabase.co

# スプレッドシート
GOOGLE_SHEETS_SPREADSHEET_ID=1wKBRLWbT6pSKa9IlTDabjhjTnfs_GxX6Rn6M6kbio1I  # 売主リスト
PROPERTY_LISTING_SPREADSHEET_ID=1tI_iXaiLuWBggs5y0RH7qzkbHs9wnLLdRekAmjkhcLY  # 物件リスト
GOOGLE_SHEETS_BUYER_SPREADSHEET_ID=1tI_iXaiLuWBggs5y0RH7qzkbHs9wnLLdRekAmjkhcLY  # 買主リスト

# サービスアカウント
GOOGLE_SERVICE_ACCOUNT_EMAIL=spreadsheet-sync@seller-management-personal.iam.gserviceaccount.com
```

## 🚨 トラブルシューティング

### 売主リストが表示されない
1. sellersテーブルにデータがあるか確認: `SELECT COUNT(*) FROM sellers;`
2. RLSが無効になっているか確認: `SELECT * FROM pg_policies WHERE tablename = 'sellers';`
3. データがない場合は、売主データ同期を実行

### 通話モードページが500エラー
1. employeesテーブルに`initials`カラムがあるか確認
2. employeesテーブルにスタッフデータがあるか確認: `SELECT COUNT(*) FROM employees WHERE is_active = true;`
3. データがない場合は、スタッフデータ同期を実行

### フロントエンドでsortByエラー
- `frontend/src/pages/SellersPage.tsx`の`sortBy`が`created_at`になっているか確認
- `inquiry_date`は削除されているため使用不可

## 📝 今後の注意事項

1. **Supabaseプロジェクトを変更する場合**:
   - 必ず全マイグレーションを実行
   - 売主データとスタッフデータを同期
   - RLS設定を確認

2. **スプレッドシート共有**:
   - サービスアカウント（`spreadsheet-sync@seller-management-personal.iam.gserviceaccount.com`）に閲覧権限を付与
   - 売主リスト、物件リスト、買主リスト、スタッフ管理の全てに共有が必要

3. **データ同期**:
   - 売主データ: `npx ts-node sync-all-sellers-from-sheet.ts`
   - スタッフデータ: `npx ts-node sync-staff-from-spreadsheet.ts`

## ✅ 動作確認済み

- ✅ 売主リストページが正常に表示される（6,649件）
- ✅ 通話モードページが正常に開く
- ✅ スタッフデータが正常に同期される（10人）
- ✅ バックエンドサーバーが正常に起動する

---

**作成日**: 2025年1月17日  
**最終更新**: 2025年1月17日  
**ステータス**: 全ての問題が解決済み
