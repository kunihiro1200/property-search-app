# Phase 2 Step 1: Database Schema - 実行準備完了

## ステータス

✅ **準備完了** - マイグレーション実行可能

## 作成されたファイル

### 1. マイグレーションファイル
- ✅ `backend/migrations/081_create_properties_and_valuations.sql`
  - propertiesテーブルの定義
  - valuationsテーブルの定義
  - インデックスの作成
  - 制約の設定
  - コメントの追加

### 2. 実行スクリプト
- ✅ `backend/migrations/run-081-migration.ts`
  - マイグレーションの実行
  - テーブルの検証
  - インデックスの確認

### 3. 検証スクリプト
- ✅ `backend/migrations/verify-081-migration.ts`
  - テーブルの存在確認
  - カラムの検証
  - インデックスの検証
  - 制約の検証

### 4. TypeScript型定義
- ✅ `backend/src/types/index.ts` (更新済み)
  - Property型
  - CreatePropertyRequest型
  - UpdatePropertyRequest型
  - Valuation型
  - CreateValuationRequest型
  - ValuationCalculationResult型
  - ValuationComparison型

### 5. ドキュメント
- ✅ `backend/migrations/081_EXECUTION_GUIDE.md`
  - 実行手順
  - トラブルシューティング
  - ロールバック手順

## 実行方法

### 1. マイグレーションの実行

```bash
cd backend
npx ts-node migrations/run-081-migration.ts
```

### 2. 検証の実行

```bash
npx ts-node migrations/verify-081-migration.ts
```

## テーブル仕様

### properties テーブル

| カラム名 | 型 | 制約 | 説明 |
|---------|-----|------|------|
| id | UUID | PRIMARY KEY | 物件ID |
| seller_id | UUID | NOT NULL, FK | 売主ID |
| property_type | VARCHAR(20) | NOT NULL, CHECK | 物件タイプ（戸建て、土地、マンション） |
| land_area | DECIMAL(10,2) | - | 土地面積（㎡） |
| building_area | DECIMAL(10,2) | - | 建物面積（㎡） |
| land_area_verified | DECIMAL(10,2) | - | 土地面積（当社調べ） |
| building_area_verified | DECIMAL(10,2) | - | 建物面積（当社調べ） |
| construction_year | INTEGER | - | 築年 |
| structure | VARCHAR(20) | CHECK | 構造（木造、軽量鉄骨、鉄骨、他） |
| property_address | TEXT | NOT NULL | 物件所在地 |
| property_address_ieul_apartment | TEXT | - | イエウール・マンション専用住所 |
| current_status | VARCHAR(20) | CHECK | 現況（居住中、空き家、賃貸中、古屋あり、更地） |
| fixed_asset_tax_road_price | DECIMAL(15,2) | - | 固定資産税路線価 |
| floor_plan | TEXT | - | 間取り |
| created_at | TIMESTAMP | DEFAULT NOW() | 作成日時 |
| updated_at | TIMESTAMP | DEFAULT NOW() | 更新日時 |
| created_by | UUID | FK | 作成者 |
| updated_by | UUID | FK | 更新者 |
| version | INTEGER | DEFAULT 1 | バージョン番号（楽観的ロック） |

**インデックス:**
- idx_properties_seller_id
- idx_properties_property_type
- idx_properties_created_at
- idx_properties_construction_year
- idx_properties_current_status

### valuations テーブル

| カラム名 | 型 | 制約 | 説明 |
|---------|-----|------|------|
| id | UUID | PRIMARY KEY | 査定ID |
| property_id | UUID | NOT NULL, FK | 物件ID |
| valuation_type | VARCHAR(20) | NOT NULL, CHECK | 査定タイプ（automatic、manual、post_visit） |
| valuation_amount_1 | BIGINT | NOT NULL | 査定額1（最低額） |
| valuation_amount_2 | BIGINT | NOT NULL | 査定額2（中間額） |
| valuation_amount_3 | BIGINT | NOT NULL | 査定額3（最高額） |
| calculation_method | TEXT | - | 計算方法 |
| calculation_parameters | JSONB | - | 計算パラメータ |
| valuation_report_url | TEXT | - | つながるオンライン査定書URL |
| valuation_date | TIMESTAMP | DEFAULT NOW() | 査定日時 |
| created_by | UUID | FK | 作成者 |
| notes | TEXT | - | 備考 |
| created_at | TIMESTAMP | DEFAULT NOW() | 作成日時 |

**制約:**
- check_valuation_order: valuation_amount_1 ≤ valuation_amount_2 ≤ valuation_amount_3

**インデックス:**
- idx_valuations_property_id
- idx_valuations_valuation_date
- idx_valuations_valuation_type
- idx_valuations_created_by

## 次のステップ

マイグレーション実行後、以下の順序で実装を進めます:

### ステップ2: バックエンドサービス層の実装（3日）

1. **PropertyService** (`backend/src/services/PropertyService.ts`)
   - 物件のCRUD操作
   - バリデーション
   - 楽観的ロック
   - 自動査定のトリガー

2. **ValuationEngine** (`backend/src/services/ValuationEngine.ts`)
   - 査定額の自動計算
   - 土地価値の計算
   - 建物価値の計算
   - 減価償却の適用

3. **ValuationService** (`backend/src/services/ValuationService.ts`)
   - 査定のCRUD操作
   - 査定履歴の管理
   - 査定比較

### ステップ3: APIエンドポイントの実装（2日）

1. **Properties API** (`backend/src/routes/properties.ts`)
   - POST /api/properties
   - GET /api/properties/:id
   - PUT /api/properties/:id
   - DELETE /api/properties/:id
   - GET /api/properties?seller_id=:id

2. **Valuations API** (`backend/src/routes/valuations.ts`)
   - POST /api/valuations
   - GET /api/valuations/:property_id
   - POST /api/valuations/calculate
   - GET /api/valuations/:id1/compare/:id2

### ステップ4: フロントエンド実装（4日）

1. 物件一覧ページ
2. 物件詳細ページ
3. 物件作成ページ
4. 査定計算コンポーネント

### ステップ5: テストとバリデーション（2日）

1. ユニットテスト
2. 統合テスト
3. エンドツーエンドテスト

### ステップ6: ドキュメント作成（1日）

1. API仕様書
2. ユーザーガイド
3. 実装完了レポート

## 参考資料

- [Phase 2 要件定義](.kiro/specs/seller-list-management/PHASE_2_REQUIREMENTS.md)
- [Phase 2 設計書](.kiro/specs/seller-list-management/PHASE_2_DESIGN.md)
- [Phase 2 タスクリスト](.kiro/specs/seller-list-management/PHASE_2_TASKS.md)
- [Phase 2 クイックスタート](.kiro/specs/seller-list-management/PHASE_2_QUICK_START.md)
- [実行ガイド](backend/migrations/081_EXECUTION_GUIDE.md)

## 質問・相談

実装について質問や相談がある場合は、いつでもお気軽にお声がけください。

---

**作成日**: 2025-01-08  
**ステータス**: 実行準備完了  
**Phase**: 2 - Properties & Valuations  
**ステップ**: 1 - Database Schema
