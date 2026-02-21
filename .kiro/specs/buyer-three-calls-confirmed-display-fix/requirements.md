# Requirements Document

## Introduction

買主詳細画面（BuyerDetailPage.tsx）において、「3回架電確認済み」フィールドが常に非表示になっている問題を修正します。このフィールドは「【問合メール】電話対応」が「不通」の場合にのみ表示され、架電確認の状況を管理するために必要です。

## Glossary

- **Buyer_Detail_Page**: 買主詳細画面（BuyerDetailPage.tsx）
- **Three_Calls_Confirmed_Field**: 「3回架電確認済み」フィールド（three_calls_confirmed）
- **Inquiry_Email_Phone_Field**: 「【問合メール】電話対応」フィールド（inquiry_email_phone）
- **Field_Visibility_Logic**: フィールドの表示/非表示を制御するロジック
- **Dropdown_Component**: ドロップダウン選択UI コンポーネント

## Requirements

### Requirement 1: 条件付きフィールド表示

**User Story:** As a 営業担当者, I want to see the 「3回架電確認済み」フィールド when 「【問合メール】電話対応」が「不通」の場合, so that I can track whether three call attempts have been confirmed.

#### Acceptance Criteria

1. WHEN 「【問合メール】電話対応」フィールドの値が「不通」である THEN the Buyer_Detail_Page SHALL display the Three_Calls_Confirmed_Field
2. WHEN 「【問合メール】電話対応」フィールドの値が「不通」以外である THEN the Buyer_Detail_Page SHALL hide the Three_Calls_Confirmed_Field
3. WHEN the Three_Calls_Confirmed_Field is displayed THEN the Buyer_Detail_Page SHALL render it as a Dropdown_Component
4. WHEN the Three_Calls_Confirmed_Field is displayed THEN the Buyer_Detail_Page SHALL mark it as a required field with visual emphasis (red border)

### Requirement 2: ドロップダウン選択肢

**User Story:** As a 営業担当者, I want to select from predefined options for 「3回架電確認済み」, so that I can consistently record the confirmation status.

#### Acceptance Criteria

1. THE Dropdown_Component SHALL provide exactly two options: "済" and "未"
2. WHEN a user clicks the Three_Calls_Confirmed_Field THEN the Dropdown_Component SHALL display both options
3. WHEN a user selects an option THEN the Buyer_Detail_Page SHALL update the field value immediately
4. WHEN the field value is empty THEN the Dropdown_Component SHALL display a placeholder indicating selection is required

### Requirement 3: データ永続化

**User Story:** As a 営業担当者, I want my selection for 「3回架電確認済み」to be saved, so that the information is retained for future reference.

#### Acceptance Criteria

1. WHEN a user selects a value for the Three_Calls_Confirmed_Field THEN the Buyer_Detail_Page SHALL persist the value to the buyers table
2. WHEN the Buyer_Detail_Page loads THEN the Buyer_Detail_Page SHALL retrieve and display the saved value for the Three_Calls_Confirmed_Field
3. WHEN a save operation fails THEN the Buyer_Detail_Page SHALL display an error message and maintain the previous value

### Requirement 4: 既存コードとの互換性

**User Story:** As a developer, I want the modification to integrate seamlessly with existing code, so that other fields and functionality remain unaffected.

#### Acceptance Criteria

1. WHEN the Three_Calls_Confirmed_Field is added THEN the Field_Visibility_Logic SHALL not affect other fields' display behavior
2. WHEN the Three_Calls_Confirmed_Field is rendered THEN the Buyer_Detail_Page SHALL use the existing field rendering infrastructure
3. WHEN the Inquiry_Email_Phone_Field value changes THEN the Buyer_Detail_Page SHALL immediately update the Three_Calls_Confirmed_Field visibility without page reload
