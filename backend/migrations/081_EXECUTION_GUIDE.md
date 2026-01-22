# Migration 081: Properties and Valuations Tables - 実行ガイド

## 概要

Phase 2のステップ1として、物件情報（properties）と査定情報（valuations）のテーブルを作成します。

## 実行前の確認

### 1. 環境変数の確認

```bash
# backend/.env ファイルに以下が設定されていることを確認
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### 2. Phase 1の完了確認

Phase 1（売主テーブル、認証、暗号化）が完了していることを確認してください。

```bash
# sellersテーブルが存在することを確認
# employeesテーブルが存在することを確認
```

## 実行手順

### ステップ1: マイグレーションの実行

```bash
cd backend
npx ts-node migrations/run-081-migration.ts
```

**期待される出力:**
```
🚀 Starting Migration 081: Create properties and valuations tables
================================================
📄 Migration file loaded
📊 Executing migration...
✅ Migration executed successfully

🔍 Verifying tables...
✅ properties table verified
✅ valuations table verified

🔍 Checking indexes...
📊 Indexes created:
   - properties.idx_properties_seller_id
   - properties.idx_properties_property_type
   - properties.idx_properties_created_at
   - properties.idx_properties_construction_year
   - properties.idx_properties_current_status
   - valuations.idx_valuations_property_id
   - valuations.idx_valuations_valuation_date
   - valuations.idx_valuations_valuation_type
   - valuations.idx_valuations_created_by

================================================
✅ Migration 081 completed successfully!

📋 Summary:
   - properties table created
   - valuations table created
   - All indexes created
   - All constraints applied

🎯 Next steps:
   1. Update TypeScript types (backend/src/types/index.ts)
   2. Implement PropertyService
   3. Implement ValuationEngine
   4. Implement ValuationService
```

### ステップ2: 検証の実行

```bash
npx ts-node migrations/verify-081-migration.ts
```

**期待される出力:**
```
🔍 Verifying Migration 081: Properties and Valuations Tables
================================================

📋 Verifying properties table...

📋 Verifying valuations table...

================================================
📊 Verification Results:

✅ Table properties exists
✅ All expected columns exist in properties
✅ All expected indexes exist on properties
✅ Constraints verified for properties (X constraints found)
✅ Table valuations exists
✅ All expected columns exist in valuations
✅ All expected indexes exist on valuations
✅ Constraints verified for valuations (X constraints found)

================================================
✅ All verifications passed!

🎯 Migration 081 is complete and verified.

📋 Next steps:
   1. Update TypeScript types
   2. Implement PropertyService
   3. Implement ValuationEngine
   4. Implement ValuationService
```

## 作成されるテーブル

### properties テーブル

物件情報を格納するテーブル

**主要カラム:**
- `id`: 物件ID（UUID）
- `seller_id`: 売主ID（外部キー）
- `property_type`: 物件タイプ（戸建て、土地、マンション）
- `land_area`: 土地面積（平方メートル）
- `building_area`: 建物面積（平方メートル）
- `construction_year`: 築年
- `structure`: 構造（木造、軽量鉄骨、鉄骨、他）
- `property_address`: 物件所在地
- `current_status`: 現況（居住中、空き家、賃貸中、古屋あり、更地）
- `version`: 楽観的ロック用バージョン番号

**インデックス:**
- `idx_properties_seller_id`: 売主IDでの検索用
- `idx_properties_property_type`: 物件タイプでの検索用
- `idx_properties_created_at`: 作成日時での検索用
- `idx_properties_construction_year`: 築年での検索用
- `idx_properties_current_status`: 現況での検索用

### valuations テーブル

査定情報を格納するテーブル

**主要カラム:**
- `id`: 査定ID（UUID）
- `property_id`: 物件ID（外部キー）
- `valuation_type`: 査定タイプ（automatic、manual、post_visit）
- `valuation_amount_1`: 査定額1（最低額）
- `valuation_amount_2`: 査定額2（中間額）
- `valuation_amount_3`: 査定額3（最高額）
- `calculation_method`: 計算方法
- `calculation_parameters`: 計算パラメータ（JSON）
- `valuation_report_url`: つながるオンライン査定書URL

**制約:**
- `check_valuation_order`: 査定額1 ≤ 査定額2 ≤ 査定額3 を保証

**インデックス:**
- `idx_valuations_property_id`: 物件IDでの検索用
- `idx_valuations_valuation_date`: 査定日時での検索用
- `idx_valuations_valuation_type`: 査定タイプでの検索用
- `idx_valuations_created_by`: 作成者での検索用

## トラブルシューティング

### エラー: "column construction_year does not exist"

**原因:** `update_updated_at_column()`関数が存在しない、またはトリガー作成時にエラーが発生

**解決策:**
1. 修正版のSQLファイルを使用（関数定義が含まれています）
2. Supabaseダッシュボードで以下を実行して既存のテーブルを削除:

```sql
DROP TABLE IF EXISTS valuations CASCADE;
DROP TABLE IF EXISTS properties CASCADE;
```

3. 修正版のマイグレーションを再実行

**修正内容（2025-01-08）:**
- `update_updated_at_column()`関数を明示的に作成
- トリガー作成前に既存トリガーを削除（`DROP TRIGGER IF EXISTS`）
- 検証クエリを改善して、カラムの存在確認を追加

### エラー: "relation idx_properties_seller_id already exists"

**原因:** インデックスが既に存在している

**解決策:** 修正版のSQLを使用（すべてのインデックスに `IF NOT EXISTS` が追加されています）

**修正内容（2025-01-08）:**
- すべてのインデックス作成に `IF NOT EXISTS` を追加

### エラー: "Missing required environment variables"

**原因:** 環境変数が設定されていない

**解決策:**
```bash
# backend/.env ファイルを確認
cat backend/.env

# 必要な変数が設定されていることを確認
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
```

### エラー: "properties table was not created"

**原因:** マイグレーションの実行に失敗した

**解決策:**
1. Supabaseダッシュボードでテーブルが作成されているか確認
2. エラーログを確認
3. 必要に応じてテーブルを手動で削除してから再実行

```sql
-- Supabaseダッシュボードで実行
DROP TABLE IF EXISTS valuations CASCADE;
DROP TABLE IF EXISTS properties CASCADE;
```

### エラー: "Table already exists"

**原因:** テーブルが既に存在する

**解決策:**
1. 既存のテーブルを確認
2. 必要に応じて削除してから再実行

```sql
-- Supabaseダッシュボードで確認
SELECT * FROM information_schema.tables 
WHERE table_name IN ('properties', 'valuations');
```

## ロールバック手順

マイグレーションを元に戻す必要がある場合:

```sql
-- Supabaseダッシュボードで実行
DROP TABLE IF EXISTS valuations CASCADE;
DROP TABLE IF EXISTS properties CASCADE;
```

**注意:** ロールバックするとデータが失われます。

## 次のステップ

マイグレーションが完了したら、以下の順序で実装を進めてください:

1. ✅ TypeScript型定義の更新（完了）
2. ⏳ PropertyServiceの実装
3. ⏳ ValuationEngineの実装
4. ⏳ ValuationServiceの実装
5. ⏳ APIエンドポイントの実装
6. ⏳ フロントエンドの実装

詳細は `.kiro/specs/seller-list-management/PHASE_2_TASKS.md` を参照してください。

## 参考資料

- [Phase 2 要件定義](../../.kiro/specs/seller-list-management/PHASE_2_REQUIREMENTS.md)
- [Phase 2 設計書](../../.kiro/specs/seller-list-management/PHASE_2_DESIGN.md)
- [Phase 2 タスクリスト](../../.kiro/specs/seller-list-management/PHASE_2_TASKS.md)

---

**作成日**: 2025-01-08  
**Phase**: 2 - Properties & Valuations  
**ステップ**: 1 - Database Schema
