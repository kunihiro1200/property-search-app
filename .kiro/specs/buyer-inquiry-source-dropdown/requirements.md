# Requirements Document

## Introduction

買主詳細ページの「問合せ元」フィールドを、テキスト入力からドロップダウン選択に変更する機能。現在はフリーテキスト入力となっているが、定義された38個の選択肢から選択できるようにすることで、データの一貫性を保ち、入力ミスを防ぐ。

## Glossary

- **Buyer_Detail_Page**: 買主詳細ページ
- **Inquiry_Source_Field**: 問合せ元フィールド（inquiry_source）
- **Dropdown_Component**: ドロップダウン選択コンポーネント
- **Inquiry_Source_Options**: 問合せ元の選択肢リスト（38項目）

## Requirements

### Requirement 1

**User Story:** As a user, I want to select inquiry source from a dropdown list, so that I can ensure data consistency and avoid input errors.

#### Acceptance Criteria

1. WHEN a user edits buyer information THEN the Buyer_Detail_Page SHALL display the inquiry_source field as a dropdown select component
2. WHEN the dropdown is opened THEN the Buyer_Detail_Page SHALL display all 38 predefined inquiry source options
3. WHEN a user selects an option THEN the Buyer_Detail_Page SHALL update the inquiry_source field with the selected value
4. WHEN the field is in view mode THEN the Buyer_Detail_Page SHALL display the current inquiry_source value as text
5. WHEN the inquiry_source value is empty THEN the Buyer_Detail_Page SHALL display a placeholder text

### Requirement 2

**User Story:** As a user, I want inquiry source options organized by category, so that I can find the appropriate option quickly.

#### Acceptance Criteria

1. WHEN the dropdown is opened THEN the Dropdown_Component SHALL group options into categories: 電話系, メール系, 配信系, Pinrich系, その他
2. WHEN displaying grouped options THEN the Dropdown_Component SHALL show category headers as disabled options
3. WHEN a user scrolls through options THEN the Dropdown_Component SHALL maintain visual separation between categories

### Requirement 3

**User Story:** As a user, I want to search within the dropdown options, so that I can quickly find specific inquiry sources.

#### Acceptance Criteria

1. WHEN the dropdown is opened THEN the Dropdown_Component SHALL provide a search/filter input field
2. WHEN a user types in the search field THEN the Dropdown_Component SHALL filter options to show only matching items
3. WHEN search results are displayed THEN the Dropdown_Component SHALL maintain category grouping for matching items

### Requirement 4

**User Story:** As a developer, I want inquiry source options defined in a reusable constant, so that the same options can be used across the application.

#### Acceptance Criteria

1. WHEN the application initializes THEN the Inquiry_Source_Options SHALL be defined as a TypeScript constant
2. WHEN the constant is defined THEN the Inquiry_Source_Options SHALL include all 38 options with their category information
3. WHEN other components need inquiry source options THEN the Inquiry_Source_Options SHALL be importable from a shared utility file
