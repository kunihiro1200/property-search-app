# Requirements Document

## Introduction

物件詳細画面に「買主候補リスト」を表示する機能を追加する。買主リストから、物件の条件（エリア、種別、価格帯）に合致し、かつ最新状況や問合せ時確度が高い買主を抽出してリスト化する。これにより、営業担当者が物件に対して適切な買主候補を素早く把握できるようになる。

## Glossary

- **Property_Detail_Page**: 物件詳細画面（PropertyListingDetailPage）
- **Buyer_Candidate_List**: 買主候補リスト - 物件条件に合致する買主のリスト
- **Latest_Status**: 最新状況 - 買主の現在のステータス（A、B、C等）
- **Inquiry_Confidence**: 問合せ時確度 - 問合せ時点での買主の購入意欲レベル（A、B、C等）
- **Desired_Area**: 希望エリア - 買主が希望する物件のエリア
- **Desired_Property_Type**: 希望種別 - 買主が希望する物件の種別（戸建、マンション、土地等）
- **Price_Range**: 価格帯 - 買主が希望する価格帯
- **Distribution_Areas**: 配信エリア - 物件の配信対象エリア
- **Reception_Date**: 受付日 - 買主の問合せ受付日

## Requirements

### Requirement 1: 買主候補リストの表示

**User Story:** As a 営業担当者, I want to 物件詳細画面で買主候補リストを確認したい, so that 物件に適した買主を素早く把握できる.

#### Acceptance Criteria

1. WHEN 物件詳細画面を表示する, THE Property_Detail_Page SHALL 買主候補リストセクションを表示する
2. THE Buyer_Candidate_List SHALL 受付日の最新順でソートされて表示される
3. WHEN 買主候補が存在しない場合, THE Property_Detail_Page SHALL 「該当する買主候補がありません」というメッセージを表示する

### Requirement 2: 最新状況によるフィルタリング

**User Story:** As a 営業担当者, I want to 最新状況がA、Bを含む買主を候補として表示したい, so that 購入意欲の高い買主を優先的に確認できる.

#### Acceptance Criteria

1. WHEN 買主の最新状況がAを含む場合, THE Buyer_Candidate_List SHALL その買主を候補として含める
2. WHEN 買主の最新状況がBを含む場合, THE Buyer_Candidate_List SHALL その買主を候補として含める
3. WHEN 買主の最新状況が空欄の場合, THE System SHALL 問合せ時確度を参照する

### Requirement 3: 問合せ時確度によるフィルタリング（最新状況が空欄の場合）

**User Story:** As a 営業担当者, I want to 最新状況が空欄の場合は問合せ時確度がA、Bの買主を候補として表示したい, so that 潜在的に購入意欲の高い買主も見逃さない.

#### Acceptance Criteria

1. WHEN 買主の最新状況が空欄かつ問合せ時確度がAの場合, THE Buyer_Candidate_List SHALL その買主を候補として含める
2. WHEN 買主の最新状況が空欄かつ問合せ時確度がBの場合, THE Buyer_Candidate_List SHALL その買主を候補として含める
3. WHEN 買主の最新状況が空欄かつ問合せ時確度がA、B以外の場合, THE Buyer_Candidate_List SHALL その買主を候補から除外する

### Requirement 4: エリア条件によるフィルタリング

**User Story:** As a 営業担当者, I want to 物件のエリアと買主の希望エリアが合致する買主を候補として表示したい, so that エリア条件が合う買主のみを確認できる.

#### Acceptance Criteria

1. WHEN 物件の配信エリアと買主の希望エリアが合致する場合, THE Buyer_Candidate_List SHALL その買主を候補として含める
2. WHEN 物件の配信エリアと買主の希望エリアが合致しない場合, THE Buyer_Candidate_List SHALL その買主を候補から除外する
3. WHEN 買主の希望エリアが空欄の場合, THE Buyer_Candidate_List SHALL その買主を候補から除外する
4. WHEN 買主の希望エリアが未設定の場合, THE Buyer_Candidate_List SHALL その買主を候補から除外する

### Requirement 5: 種別条件によるフィルタリング

**User Story:** As a 営業担当者, I want to 物件の種別と買主の希望種別が合致する買主を候補として表示したい, so that 種別条件が合う買主のみを確認できる.

#### Acceptance Criteria

1. WHEN 物件の種別と買主の希望種別が合致する場合, THE Buyer_Candidate_List SHALL その買主を候補として含める
2. WHEN 物件の種別と買主の希望種別が合致しない場合, THE Buyer_Candidate_List SHALL その買主を候補から除外する
3. WHEN 買主の希望種別が空欄の場合, THE Buyer_Candidate_List SHALL その買主を候補から除外する
4. WHEN 買主の希望種別が未設定の場合, THE Buyer_Candidate_List SHALL その買主を候補から除外する

### Requirement 6: 価格帯条件によるフィルタリング

**User Story:** As a 営業担当者, I want to 物件の価格と買主の希望価格帯が合致する買主を候補として表示したい, so that 予算が合う買主のみを確認できる.

#### Acceptance Criteria

1. WHEN 物件の価格が買主の希望価格帯の範囲内の場合, THE Buyer_Candidate_List SHALL その買主を候補として含める
2. WHEN 物件の価格が買主の希望価格帯の範囲外の場合, THE Buyer_Candidate_List SHALL その買主を候補から除外する
3. WHEN 買主の希望価格帯が空欄の場合, THE Buyer_Candidate_List SHALL その買主を候補から除外する
4. WHEN 買主の希望価格帯が未設定の場合, THE Buyer_Candidate_List SHALL その買主を候補から除外する

### Requirement 7: 買主候補リストの表示項目

**User Story:** As a 営業担当者, I want to 買主候補の重要な情報を一覧で確認したい, so that 各買主の状況を素早く把握できる.

#### Acceptance Criteria

1. THE Buyer_Candidate_List SHALL 各買主について以下の情報を表示する: 買主番号、氏名、最新状況、問合せ時確度、希望エリア、希望種別、受付日
2. WHEN 買主をクリックした場合, THE System SHALL 買主詳細画面に遷移する
3. THE Buyer_Candidate_List SHALL 最大50件まで表示する

### Requirement 8: APIエンドポイントの提供

**User Story:** As a システム, I want to 買主候補リストを取得するAPIを提供したい, so that フロントエンドが効率的にデータを取得できる.

#### Acceptance Criteria

1. WHEN GET /api/property-listings/{propertyNumber}/buyer-candidates が呼び出された場合, THE System SHALL 条件に合致する買主候補リストを返す
2. THE API SHALL 受付日の降順でソートされた結果を返す
3. IF 物件が存在しない場合, THEN THE System SHALL 404エラーを返す
