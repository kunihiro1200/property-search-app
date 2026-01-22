# Phase 2: Properties & Valuations - 要件定義書

## 概要

Phase 2では、売主に紐づく物件情報と査定情報の管理機能を実装します。Phase 1で構築した売主管理の基盤の上に、物件の詳細情報、自動査定エンジン、査定履歴管理を追加します。

## 変更履歴

### v1.0 (2025-01-11)
- 初版作成
- Phase 2の要件を定義

## Phase 2の目標

1. **物件情報管理**: 売主が所有する物件の詳細情報を記録・管理する
2. **自動査定エンジン**: 物件情報に基づいて査定額を自動計算する
3. **査定履歴管理**: 査定の履歴を保存し、変更を追跡する
4. **マンション対応**: 戸建て・土地に加えてマンションの査定にも対応する

## 依存関係

### Phase 1からの依存
- ✅ sellers テーブル (Phase 1で作成済み)
- ✅ SellerService (Phase 1で実装済み)
- ✅ 認証・認可機能 (Phase 1で実装済み)

### Phase 2で新規作成
- properties テーブル
- valuations テーブル
- PropertyService
- ValuationEngine
- PropertyAPI routes
- ValuationAPI routes

## データモデル

### properties テーブル

```sql
CREATE TABLE properties (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  seller_id UUID NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
  
  -- 基本情報
  property_type VARCHAR(20) NOT NULL CHECK (property_type IN ('戸建て', '土地', 'マンション')),
  address TEXT NOT NULL,
  postal_code VARCHAR(10),
  
  -- 土地情報
  land_area_sqm DECIMAL(10, 2), -- 土地面積（㎡）
  land_area_tsubo DECIMAL(10, 2), -- 土地面積（坪）
  land_area_our_survey_sqm DECIMAL(10, 2), -- 土地面積（当社調べ）（㎡）
  land_area_our_survey_tsubo DECIMAL(10, 2), -- 土地面積（当社調べ）（坪）
  
  -- 建物情報
  building_area_sqm DECIMAL(10, 2), -- 建物面積（㎡）
  building_area_tsubo DECIMAL(10, 2), -- 建物面積（坪）
  building_area_our_survey_sqm DECIMAL(10, 2), -- 建物面積（当社調べ）（㎡）
  building_area_our_survey_tsubo DECIMAL(10, 2), -- 建物面積（当社調べ）（坪）
  construction_year INTEGER, -- 築年
  structure VARCHAR(20) CHECK (structure IN ('木造', '軽量鉄骨', '鉄骨', '他')),
  
  -- マンション情報
  floor_number INTEGER, -- 階数
  total_floors INTEGER, -- 総階数
  room_layout VARCHAR(50), -- 間取り（例: 3LDK）
  
  -- 売主の状況
  seller_situation VARCHAR(20) CHECK (seller_situation IN ('居住中', '空き家', '賃貸中', '古屋あり', '更地')),
  
  -- 固定資産税路線価
  fixed_asset_tax_road_price DECIMAL(15, 2), -- 固定資産税路線価（円/㎡）
  
  -- メタデータ
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_by UUID REFERENCES employees(id),
  updated_by UUID REFERENCES employees(id),
  version INTEGER DEFAULT 1 -- 楽観的ロック用
);

CREATE INDEX idx_properties_seller_id ON properties(seller_id);
CREATE INDEX idx_properties_property_type ON properties(property_type);
CREATE INDEX idx_properties_address ON properties USING gin(to_tsvector('japanese', address));
```

### valuations テーブル

```sql
CREATE TABLE valuations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  seller_id UUID NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
  
  -- 査定額（戸建て・土地の場合は自動計算、マンションの場合は手入力）
  valuation_amount_1 DECIMAL(15, 2), -- 査定額1（最低額）
  valuation_amount_2 DECIMAL(15, 2), -- 査定額2（中間額）
  valuation_amount_3 DECIMAL(15, 2), -- 査定額3（最高額）
  
  -- 訪問後の査定額
  post_visit_valuation_amount_1 DECIMAL(15, 2), -- 訪問後_査定額1
  
  -- 計算根拠（戸建て・土地の場合のみ）
  land_valuation DECIMAL(15, 2), -- 土地評価額
  building_valuation DECIMAL(15, 2), -- 建物評価額
  depreciation_rate DECIMAL(5, 4), -- 減価率
  calculation_method TEXT, -- 計算方法の説明
  
  -- 査定タイプ
  valuation_type VARCHAR(20) NOT NULL CHECK (valuation_type IN ('自動計算', '手入力', '訪問後')),
  
  -- 査定書URL
  valuation_report_url TEXT, -- つながるオンラインの査定書URL
  
  -- メタデータ
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_by UUID REFERENCES employees(id),
  notes TEXT -- 備考
);

CREATE INDEX idx_valuations_property_id ON valuations(property_id);
CREATE INDEX idx_valuations_seller_id ON valuations(seller_id);
CREATE INDEX idx_valuations_created_at ON valuations(created_at DESC);
```

## 要件

### 要件P2-1: 物件情報の登録

**ユーザーストーリー:** 社員として、売主の物件情報を登録したいので、物件の種別、住所、面積、築年、構造などを入力できるようにしたい

#### 受入基準

1. **WHEN** 社員が物件情報登録フォームを開く
   **THEN** システムは以下のフィールドを表示する:
   - 物件種別（戸建て、土地、マンション）
   - 住所
   - 郵便番号
   - 土地面積（㎡、坪）
   - 建物面積（㎡、坪）
   - 築年
   - 構造（木造、軽量鉄骨、鉄骨、他）
   - 売主の状況（居住中、空き家、賃貸中、古屋あり、更地）

2. **WHEN** 物件種別が「マンション」の場合
   **THEN** システムは追加で以下のフィールドを表示する:
   - 階数
   - 総階数
   - 間取り

3. **WHEN** 社員が物件情報を保存する
   **THEN** システムは:
   - 物件情報をpropertiesテーブルに保存する
   - seller_idで売主と紐付ける
   - 作成日時と作成者を自動記録する

4. **IF** 必須フィールドが未入力の場合
   **THEN** システムは:
   - 保存を拒否する
   - エラーメッセージを表示する

### 要件P2-2: 自動査定（戸建て・土地）

**ユーザーストーリー:** 社員として、戸建てまたは土地の査定額を自動計算したいので、物件情報を入力すると査定額が自動で計算されるようにしたい

#### 受入基準

1. **WHEN** 物件種別が「戸建て」または「土地」で物件情報が入力された場合
   **THEN** システムは以下の計算式で査定額を自動計算する:

   **土地評価額の計算:**
   ```
   土地評価額 = 土地面積(㎡) × 固定資産税路線価(円/㎡)
   ```

   **建物評価額の計算（戸建ての場合のみ）:**
   ```
   構造別単価:
   - 木造: 150,000円/㎡
   - 軽量鉄骨: 180,000円/㎡
   - 鉄骨: 200,000円/㎡
   - その他: 170,000円/㎡
   
   減価率 = 1 - (築年数 × 0.015)
   建物評価額 = 建物面積(㎡) × 構造別単価 × 減価率
   ```

   **査定額の計算:**
   ```
   査定額1（最低額）= 土地評価額 × 0.8 + 建物評価額 × 0.7
   査定額2（中間額）= 土地評価額 × 1.0 + 建物評価額 × 0.8
   査定額3（最高額）= 土地評価額 × 1.2 + 建物評価額 × 0.9
   ```

2. **WHEN** 査定額を計算する場合
   **THEN** システムは:
   - 計算根拠（土地評価額、建物評価額、減価率）を保存する
   - 計算方法の説明を生成する
   - valuationsテーブルに保存する

3. **WHEN** 査定額が異常値の場合
   **THEN** システムは警告を表示する:
   - IF 査定額1 < 1,000,000円 OR 査定額3 > 1,000,000,000円
   - THEN 「査定額が通常の範囲外です。入力内容を確認してください。」

### 要件P2-3: 手動査定（マンション）

**ユーザーストーリー:** 社員として、マンションの査定額を手動で入力したいので、査定額1、査定額2、査定額3を直接入力できるようにしたい

#### 受入基準

1. **WHEN** 物件種別が「マンション」の場合
   **THEN** システムは:
   - 査定額1、査定額2、査定額3の入力フィールドを表示する
   - 自動計算は行わない
   - 手動入力された査定額をvaluationsテーブルに保存する

2. **WHEN** 査定額を保存する場合
   **THEN** システムは:
   - valuation_typeを「手入力」に設定する
   - 計算根拠は保存しない

### 要件P2-4: 査定履歴管理

**ユーザーストーリー:** 社員として、査定の履歴を確認したいので、過去の査定額と計算根拠を時系列で表示できるようにしたい

#### 受入基準

1. **WHEN** 社員が査定履歴を表示する
   **THEN** システムは:
   - 物件に紐づく全ての査定を時系列順（新しい順）で表示する
   - 各査定の作成日時、作成者、査定額、計算根拠を表示する

2. **WHEN** 査定を再計算する
   **THEN** システムは:
   - 新しい査定レコードを作成する
   - 過去の査定は保持する（削除しない）

### 要件P2-5: 訪問後査定

**ユーザーストーリー:** 社員として、訪問査定後に査定額を更新したいので、訪問後の査定額を入力できるようにしたい

#### 受入基準

1. **WHEN** 社員が訪問後査定額を入力する
   **THEN** システムは:
   - post_visit_valuation_amount_1フィールドに保存する
   - valuation_typeを「訪問後」に設定する
   - 新しい査定レコードを作成する

2. **WHEN** 訪問後査定を表示する
   **THEN** システムは:
   - 訪問前の査定額と訪問後の査定額を並べて表示する
   - 差額を計算して表示する

### 要件P2-6: 物件情報の更新

**ユーザーストーリー:** 社員として、物件情報を修正したいので、既存の物件情報を編集できるようにしたい

#### 受入基準

1. **WHEN** 社員が物件情報を更新する
   **THEN** システムは:
   - 楽観的ロック（versionフィールド）で同時更新を検出する
   - 更新日時と更新者を自動記録する
   - 査定額を再計算する（戸建て・土地の場合）

2. **IF** 同時更新が検出された場合
   **THEN** システムは:
   - 更新を拒否する
   - エラーメッセージを表示する: 「他のユーザーが更新しました。最新の情報を取得してください。」

### 要件P2-7: 物件情報の検索

**ユーザーストーリー:** 社員として、物件を検索したいので、住所や物件種別で検索できるようにしたい

#### 受入基準

1. **WHEN** 社員が物件を検索する
   **THEN** システムは:
   - 住所で部分一致検索できる
   - 物件種別でフィルタリングできる
   - 売主番号で検索できる

2. **WHEN** 検索結果を表示する
   **THEN** システムは:
   - 物件情報と売主情報を一緒に表示する
   - 最新の査定額を表示する

## API エンドポイント

### Properties API

```
POST   /api/properties              - 物件作成
GET    /api/properties/:id          - 物件取得
PUT    /api/properties/:id          - 物件更新
DELETE /api/properties/:id          - 物件削除
GET    /api/properties              - 物件リスト取得
GET    /api/properties/search       - 物件検索
GET    /api/sellers/:sellerId/properties - 売主の物件リスト取得
```

### Valuations API

```
POST   /api/valuations              - 査定作成（自動計算または手入力）
GET    /api/valuations/:id          - 査定取得
PUT    /api/valuations/:id          - 査定更新
GET    /api/properties/:propertyId/valuations - 物件の査定履歴取得
POST   /api/valuations/calculate    - 査定額計算（プレビュー用）
```

## 実装タスク

### タスクP2-1: データベーススキーマ作成
- [ ] propertiesテーブルのマイグレーション作成
- [ ] valuationsテーブルのマイグレーション作成
- [ ] インデックスの作成
- [ ] 外部キー制約の設定
- [ ] マイグレーションのテスト

### タスクP2-2: PropertyService実装
- [ ] PropertyServiceの実装
- [ ] 物件作成機能
- [ ] 物件取得機能
- [ ] 物件更新機能（楽観的ロック）
- [ ] 物件削除機能
- [ ] 物件検索機能
- [ ] ユニットテスト

### タスクP2-3: ValuationEngine実装
- [ ] ValuationEngineの実装
- [ ] 戸建て・土地の査定計算ロジック
- [ ] 異常値チェック
- [ ] 計算根拠の生成
- [ ] ユニットテスト

### タスクP2-4: ValuationService実装
- [ ] ValuationServiceの実装
- [ ] 査定作成機能
- [ ] 査定取得機能
- [ ] 査定履歴取得機能
- [ ] 訪問後査定機能
- [ ] ユニットテスト

### タスクP2-5: API Routes実装
- [ ] Properties API routesの実装
- [ ] Valuations API routesの実装
- [ ] エラーハンドリング
- [ ] バリデーション
- [ ] 統合テスト

### タスクP2-6: Type Definitions
- [ ] Property型の定義
- [ ] Valuation型の定義
- [ ] CreatePropertyRequest型の定義
- [ ] UpdatePropertyRequest型の定義
- [ ] CreateValuationRequest型の定義

## テストケース

### TC-P2-1: 戸建て査定の正常系

**前提条件:**
- 物件種別: 戸建て
- 土地面積: 100㎡
- 建物面積: 80㎡
- 築年数: 10年
- 構造: 木造
- 固定資産税路線価: 100,000円/㎡

**期待される結果:**
- 土地評価額 = 100 × 100,000 = 10,000,000円
- 減価率 = 1 - (10 × 0.015) = 0.85
- 建物評価額 = 80 × 150,000 × 0.85 = 10,200,000円
- 査定額1 = 10,000,000 × 0.8 + 10,200,000 × 0.7 = 15,140,000円
- 査定額2 = 10,000,000 × 1.0 + 10,200,000 × 0.8 = 18,160,000円
- 査定額3 = 10,000,000 × 1.2 + 10,200,000 × 0.9 = 21,180,000円

### TC-P2-2: マンション査定の手入力

**前提条件:**
- 物件種別: マンション
- 階数: 5階
- 総階数: 10階
- 間取り: 3LDK

**操作:**
- 査定額1: 25,000,000円
- 査定額2: 28,000,000円
- 査定額3: 30,000,000円

**期待される結果:**
- valuation_type = '手入力'
- 計算根拠は保存されない

### TC-P2-3: 楽観的ロックの検証

**シナリオ:** 2人のユーザーが同時に同じ物件を更新しようとする

**期待される動作:**
1. ユーザーA が物件情報を取得（version = 1）
2. ユーザーB が物件情報を取得（version = 1）
3. ユーザーA が物件情報を更新（version = 2）
4. ユーザーB が物件情報を更新しようとする
5. システムがエラーを返す: 「他のユーザーが更新しました」

## パフォーマンス要件

- 物件作成処理: 2秒以内
- 査定計算処理: 500ms以内
- 物件検索処理: 1秒以内
- 査定履歴取得: 1秒以内

## セキュリティ要件

- 物件情報へのアクセスは認証済みユーザーのみ
- 物件の作成・更新・削除は適切な権限を持つユーザーのみ
- 査定額の計算ロジックはサーバー側で実行（クライアント側では実行しない）

## 次のステップ

Phase 2完了後、Phase 3（Activity Logs & Follow-ups）に進みます。

---

**Status**: 📝 Draft - Phase 2 Requirements
**Last Updated**: 2025-01-11
**Next Review**: Phase 2実装開始前
