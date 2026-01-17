# Requirements Document

## Introduction

物件詳細画面に表示される買主候補リストの絞り込みロジックを改善し、より適切な買主候補を表示できるようにする。現在の実装では希望条件が空欄の買主を除外しているが、新しい絞り込み条件では、希望種別・価格帯・エリアの各条件を適切に評価し、より柔軟なマッチングを実現する。

## Glossary

- **System**: 物件詳細画面の買主候補リスト表示システム
- **Buyer_Candidate**: 買主候補（物件に対してマッチングされる可能性のある買主）
- **Property**: 物件
- **Property_Type**: 物件種別（戸建て、マンション等）
- **Price_Range**: 価格帯（「指定なし」「～1900万円」「1000万～2999万円」「2000万円以上」）
- **Area**: エリア（配信エリア）
- **Distribution_Type**: 配信種別（「要」または「不要」）
- **Latest_Status**: 最新状況（「A」「B」等のステータス）
- **Inquiry_Confidence**: 問い合わせ時確度（「A」「B」等）
- **Business_Inquiry**: 業者問合せフラグ（true/false）
- **Inquiry_History**: 問い合わせ履歴

## Requirements

### Requirement 1: 希望種別による絞り込み

**User Story:** As a 営業担当者, I want to 物件種別に基づいて買主候補を絞り込む, so that 物件種別に興味のある買主のみを表示できる

#### Acceptance Criteria

1. WHEN 買主の希望種別が物件の種別と一致する THEN THE System SHALL その買主を候補に含める
2. WHEN 買主の希望種別が「指定なし」である THEN THE System SHALL その買主を候補に含める
3. WHEN 買主の希望種別が空欄である THEN THE System SHALL その買主を候補から除外する
4. WHEN 買主の希望種別が物件の種別と一致しない AND 「指定なし」でもない THEN THE System SHALL その買主を候補から除外する

### Requirement 2: 価格帯による絞り込み

**User Story:** As a 営業担当者, I want to 価格帯に基づいて買主候補を絞り込む, so that 予算に合う買主のみを表示できる

#### Acceptance Criteria

1. WHEN 買主の希望価格帯が「指定なし」である THEN THE System SHALL その買主を候補に含める（他の条件を満たす場合）
2. WHEN 買主の希望価格帯が空欄である THEN THE System SHALL その買主を候補に含める（他の条件を満たす場合）
3. WHEN 買主の希望価格帯が「～1900万円」である AND 物件価格が1900万円以下である THEN THE System SHALL その買主を候補に含める
4. WHEN 買主の希望価格帯が「1000万～2999万円」である AND 物件価格が1000万円以上2999万円以下である THEN THE System SHALL その買主を候補に含める
5. WHEN 買主の希望価格帯が「2000万円以上」である AND 物件価格が2000万円以上である THEN THE System SHALL その買主を候補に含める
6. WHEN 物件価格が買主の希望価格帯の範囲外である THEN THE System SHALL その買主を候補から除外する

### Requirement 3: エリアによる絞り込み

**User Story:** As a 営業担当者, I want to エリアに基づいて買主候補を絞り込む, so that 対象エリアに興味のある買主のみを表示できる

#### Acceptance Criteria

1. WHEN 買主の希望エリアが物件のエリアと一致する THEN THE System SHALL その買主を候補に含める
2. WHEN 買主が過去に同じエリアの同じ種別の物件を問い合わせた履歴がある THEN THE System SHALL その買主を候補に含める
3. WHEN 買主の希望エリアが空欄である THEN THE System SHALL その買主を候補から除外する
4. WHEN 買主の希望エリアが物件のエリアと一致しない AND 過去の問い合わせ履歴もない THEN THE System SHALL その買主を候補から除外する

### Requirement 4: 業者問合せの除外

**User Story:** As a 営業担当者, I want to 業者問合せを除外する, so that 一般の買主候補のみを表示できる

#### Acceptance Criteria

1. WHEN 買主の業者問合せフラグがtrueである THEN THE System SHALL その買主を候補から除外する
2. WHEN 買主の業者問合せフラグがfalseまたはnullである THEN THE System SHALL その買主を候補に含める（他の条件を満たす場合）

### Requirement 5: 最新状況による絞り込み

**User Story:** As a 営業担当者, I want to 最新状況に基づいて買主候補を絞り込む, so that アクティブな買主のみを表示できる

#### Acceptance Criteria

1. WHEN 買主の最新状況が「A」を含む THEN THE System SHALL その買主を候補に含める（他の条件を満たす場合）
2. WHEN 買主の最新状況が「B」を含む THEN THE System SHALL その買主を候補に含める（他の条件を満たす場合）
3. WHEN 買主の最新状況が空欄である AND 問い合わせ時確度が「A」を含む THEN THE System SHALL その買主を候補に含める（他の条件を満たす場合）
4. WHEN 買主の最新状況が空欄である AND 問い合わせ時確度が「B」を含む THEN THE System SHALL その買主を候補に含める（他の条件を満たす場合）
5. WHEN 買主の最新状況が空欄である AND 問い合わせ時確度も「A」「B」を含まない THEN THE System SHALL その買主を候補から除外する
6. WHEN 買主の最新状況が「A」「B」を含まない THEN THE System SHALL その買主を候補から除外する

### Requirement 6: 配信種別による絞り込み

**User Story:** As a 営業担当者, I want to 配信種別に基づいて買主候補を絞り込む, so that 配信を希望する買主のみを表示できる

#### Acceptance Criteria

1. WHEN 買主の配信種別が「要」である THEN THE System SHALL その買主を候補に含める（他の条件を満たす場合）
2. WHEN 買主の配信種別が「要」でない THEN THE System SHALL その買主を候補から除外する

### Requirement 7: 完全除外条件

**User Story:** As a 営業担当者, I want to 希望条件が不十分な買主を除外する, so that 最低限の希望条件を持つ買主のみを表示できる

#### Acceptance Criteria

1. WHEN 買主の希望エリアが空欄である AND 希望種別も空欄である THEN THE System SHALL その買主を候補から除外する
2. WHEN 買主の希望エリアまたは希望種別のいずれかが入力されている THEN THE System SHALL その買主を候補に含める（他の条件を満たす場合）

### Requirement 8: 複合条件の評価順序

**User Story:** As a システム, I want to 絞り込み条件を適切な順序で評価する, so that 効率的かつ正確に買主候補を抽出できる

#### Acceptance Criteria

1. THE System SHALL 業者問合せフラグを最初に評価する
2. THE System SHALL 完全除外条件（希望エリアと希望種別が両方空欄）を次に評価する
3. THE System SHALL 配信種別を次に評価する
4. THE System SHALL 最新状況と問い合わせ時確度を次に評価する
5. THE System SHALL 希望種別、価格帯、エリアの条件を最後に評価する
6. WHEN すべての条件を満たす THEN THE System SHALL その買主を候補リストに含める
