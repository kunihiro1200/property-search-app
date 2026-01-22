# Requirements Document

## Introduction

買主詳細画面において、内覧前伝達事項フィールドを物件詳細カード内に移動し、視認性を向上させる。また、最新状況フィールドがプルダウンとして正しく機能するよう修正する。

## Glossary

- **BuyerDetailPage**: 買主詳細画面のメインコンポーネント
- **PropertyInfoCard**: 物件詳細情報を表示するカードコンポーネント
- **ViewingNotesField**: 内覧前伝達事項を表示・編集するフィールドコンポーネント（黄色背景）
- **LatestStatusDropdown**: 最新状況を選択するドロップダウンコンポーネント
- **FIELD_SECTIONS**: 買主情報のフィールドをセクションごとにグループ化した定義

## Requirements

### Requirement 1: 内覧前伝達事項の配置変更

**User Story:** As a user, I want to see viewing notes within the property detail card, so that I can easily reference property-specific information together.

#### Acceptance Criteria

1. WHEN viewing the buyer detail page, THE BuyerDetailPage SHALL display viewing_notes field within PropertyInfoCard component
2. WHEN viewing_notes field is displayed in PropertyInfoCard, THE System SHALL apply yellow background color (#FFF9E6)
3. WHEN viewing_notes field is moved to PropertyInfoCard, THE System SHALL remove viewing_notes from the right-side buyer information section
4. WHEN buyer is in edit mode, THE PropertyInfoCard SHALL allow editing of viewing_notes field with yellow background
5. WHEN viewing_notes is empty, THE PropertyInfoCard SHALL display placeholder text "（未入力）"

### Requirement 2: 最新状況フィールドの修正

**User Story:** As a user, I want the latest status field to function as a dropdown, so that I can easily select from predefined status options.

#### Acceptance Criteria

1. WHEN viewing the buyer detail page in view mode, THE LatestStatusDropdown SHALL display the current latest_status value
2. WHEN buyer is in edit mode, THE LatestStatusDropdown SHALL display as an Autocomplete dropdown with 16 predefined options
3. WHEN user selects a status from dropdown, THE System SHALL update the latest_status field value
4. WHEN user types custom text in dropdown, THE System SHALL accept and save the custom value (freeSolo mode)
5. WHEN latest_status is empty, THE LatestStatusDropdown SHALL display "（未設定）" in view mode

### Requirement 3: レイアウトの一貫性維持

**User Story:** As a user, I want the layout to remain consistent after changes, so that the user experience is not disrupted.

#### Acceptance Criteria

1. WHEN viewing_notes is moved to PropertyInfoCard, THE System SHALL maintain the 2-column layout (left: properties, right: buyer info)
2. WHEN PropertyInfoCard displays viewing_notes, THE System SHALL position it at the bottom of the card with clear visual separation
3. WHEN multiple properties are linked to a buyer, THE System SHALL display viewing_notes in each PropertyInfoCard
4. WHEN buyer information section is displayed, THE System SHALL not show viewing_notes field in FIELD_SECTIONS
5. WHEN PropertyInfoCard is displayed without buyer context, THE System SHALL not display viewing_notes section

### Requirement 4: データの整合性

**User Story:** As a user, I want viewing notes to be saved correctly, so that my edits are not lost.

#### Acceptance Criteria

1. WHEN user edits viewing_notes in PropertyInfoCard, THE System SHALL update the buyer.viewing_notes field
2. WHEN user saves buyer information, THE System SHALL persist viewing_notes changes to the database
3. WHEN viewing_notes is updated, THE System SHALL display success message to user
4. WHEN viewing_notes update fails, THE System SHALL display error message and retain unsaved changes
5. WHEN user cancels edit mode, THE System SHALL revert viewing_notes to the last saved value
