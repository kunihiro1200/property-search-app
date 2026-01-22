# Requirements Document

## Introduction

買主詳細ページの「★最新状況」フィールドを、自由入力テキストからプルダウン選択式に変更する機能。営業担当者が買主の現在の状況を統一された選択肢から選択できるようにし、データの一貫性と検索・フィルタリングの効率を向上させる。

## Glossary

- **Buyer_Detail_Page**: 買主詳細ページ（BuyerDetailPage.tsx）
- **Latest_Status_Field**: ★最新状況フィールド（latest_status）
- **Dropdown_Component**: プルダウン選択コンポーネント
- **InlineEditableField**: インライン編集可能フィールドコンポーネント

## Requirements

### Requirement 1: プルダウン選択肢の定義

**User Story:** As a 営業担当者, I want to select the buyer's latest status from predefined options, so that I can quickly and consistently categorize buyer situations.

#### Acceptance Criteria

1. THE Latest_Status_Field SHALL provide the following dropdown options in order:
   - A:この物件を気に入っている（こちらからの一押しが必要）
   - B:1年以内に引っ越し希望だが、この物件ではない。駐車場の要件や、日当たり等が合わない。
   - C:引っ越しは1年以上先
   - D:配信・追客不要案件（業者や確度が低く追客不要案件等）
   - 買付外れました
   - 買（一般 両手）
   - 買（一般 片手）
   - 買（専任 両手）
   - 買（専任 片手）
   - 買（他社、片手）
   - 他決
   - 2番手
   - 3番手
   - AZ:Aだが次電日不要
   - 2番手買付提出済み
   - 3番手買付提出済み

2. WHEN the dropdown is displayed, THE Dropdown_Component SHALL show all options in the specified order

3. THE Dropdown_Component SHALL allow selection of exactly one option at a time

### Requirement 2: UIコンポーネントの実装

**User Story:** As a 営業担当者, I want to see a dropdown selector for the latest status field, so that I can easily select the appropriate status.

#### Acceptance Criteria

1. WHEN the user views the buyer detail page, THE Latest_Status_Field SHALL display as a dropdown selector instead of a text input

2. WHEN the user clicks on the Latest_Status_Field, THE Dropdown_Component SHALL open and display all available options

3. WHEN the user selects an option, THE Dropdown_Component SHALL close and display the selected value

4. THE Dropdown_Component SHALL display the current value if one is already set

5. IF the current value does not match any predefined option, THEN THE Dropdown_Component SHALL still display the current value and allow selection of a new option

### Requirement 3: データ保存と同期

**User Story:** As a 営業担当者, I want my status selection to be saved and synced, so that the data is persisted correctly.

#### Acceptance Criteria

1. WHEN the user selects a new status option, THE Buyer_Detail_Page SHALL save the selected value to the database

2. WHEN the status is saved, THE Buyer_Detail_Page SHALL sync the value to the spreadsheet (if bidirectional sync is enabled)

3. IF the save operation fails, THEN THE Buyer_Detail_Page SHALL display an error message and revert to the previous value

4. WHEN the status is successfully saved, THE Buyer_Detail_Page SHALL update the displayed value immediately

### Requirement 4: 既存データとの互換性

**User Story:** As a システム管理者, I want the new dropdown to be compatible with existing data, so that no data is lost during the transition.

#### Acceptance Criteria

1. WHEN loading a buyer with an existing latest_status value, THE Dropdown_Component SHALL display the existing value

2. IF the existing value matches a predefined option, THEN THE Dropdown_Component SHALL show it as selected

3. IF the existing value does not match any predefined option, THEN THE Dropdown_Component SHALL display the value as-is with an option to select a new value

4. THE Latest_Status_Field SHALL NOT automatically change existing values that don't match predefined options
