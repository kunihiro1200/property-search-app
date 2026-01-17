# Requirements Document

## Introduction

買主詳細ページのメール送信機能を改善し、問合せ履歴テーブルでチェックボックスで選択した物件を直接使用してGmail作成画面を開くようにします。現在の二重選択（チェックボックス選択→物件選択モーダル）を排除し、ユーザー体験を向上させます。

## Glossary

- **Inquiry_History_Table**: 買主詳細ページに表示される問合せ履歴テーブル
- **Property_Selection_Modal**: 現在使用されている物件選択モーダル（削除対象）
- **Gmail_Composition_Modal**: Gmail作成画面モーダル
- **Checkbox_Selection**: 問合せ履歴テーブルの各行に表示されるチェックボックス
- **Selected_Properties**: チェックボックスで選択された物件のリスト

## Requirements

### Requirement 1: 問合せ履歴テーブルにチェックボックスを追加

**User Story:** As a user, I want to select properties directly from the inquiry history table using checkboxes, so that I can quickly choose which properties to include in my email.

#### Acceptance Criteria

1. THE Inquiry_History_Table SHALL display a checkbox in each row
2. WHEN the Inquiry_History_Table is initially displayed, THE System SHALL automatically check the checkbox for the most recent inquiry (今回のステータス)
3. WHEN a user clicks a checkbox, THE Inquiry_History_Table SHALL toggle the selection state of that property
4. THE Inquiry_History_Table SHALL visually indicate which properties are selected
5. WHEN no properties are selected, THE Gmail_Send_Button SHALL be disabled
6. WHEN at least one property is selected, THE Gmail_Send_Button SHALL be enabled

### Requirement 2: チェックボックス選択状態の管理

**User Story:** As a user, I want the system to track which properties I have selected, so that I can see my selections clearly before sending an email.

#### Acceptance Criteria

1. THE System SHALL maintain a list of Selected_Properties based on checkbox state
2. WHEN a checkbox is toggled, THE System SHALL update the Selected_Properties list immediately
3. THE System SHALL display the count of Selected_Properties near the Gmail_Send_Button
4. WHEN all checkboxes are unchecked, THE Selected_Properties list SHALL be empty

### Requirement 3: Gmail送信ボタンの動作変更

**User Story:** As a user, I want to click the Gmail send button and go directly to the email composition screen with my selected properties, so that I don't have to select properties twice.

#### Acceptance Criteria

1. WHEN a user clicks the Gmail_Send_Button with Selected_Properties, THE System SHALL open the Gmail_Composition_Modal directly
2. THE System SHALL NOT display the Property_Selection_Modal
3. THE Gmail_Composition_Modal SHALL receive the Selected_Properties as input
4. THE Selected_Properties SHALL be automatically included in the email body

### Requirement 4: メール本文への物件情報の自動挿入

**User Story:** As a user, I want the selected properties to be automatically formatted and inserted into the email body, so that I can quickly send property information to buyers.

#### Acceptance Criteria

1. WHEN the Gmail_Composition_Modal opens, THE System SHALL format each Selected_Property with its details
2. THE System SHALL insert the formatted property information into the email body
3. THE System SHALL maintain the existing email template structure
4. THE System SHALL include property number, address, price, and other relevant details for each Selected_Property

### Requirement 5: 既存機能との互換性維持

**User Story:** As a user, I want the template selection and sender selection features to continue working as before, so that my workflow is not disrupted.

#### Acceptance Criteria

1. THE System SHALL maintain the existing template selection functionality
2. THE System SHALL maintain the existing sender address selection functionality
3. WHEN a template is selected, THE System SHALL apply it to the email with Selected_Properties
4. THE System SHALL preserve all existing Gmail API integration features

### Requirement 6: エラーハンドリング

**User Story:** As a user, I want to receive clear error messages if something goes wrong, so that I can understand and resolve issues.

#### Acceptance Criteria

1. WHEN the Gmail_Send_Button is clicked with no Selected_Properties, THE System SHALL display an error message
2. WHEN the Gmail API fails, THE System SHALL display a user-friendly error message
3. IF a Selected_Property has missing data, THE System SHALL handle it gracefully and notify the user
4. THE System SHALL log all errors for debugging purposes

### Requirement 7: 物件選択モーダルの削除

**User Story:** As a developer, I want to remove the redundant property selection modal, so that the codebase is cleaner and easier to maintain.

#### Acceptance Criteria

1. THE System SHALL remove the Property_Selection_Modal component
2. THE System SHALL remove all code related to displaying the Property_Selection_Modal
3. THE System SHALL remove the intermediate step between Gmail_Send_Button click and Gmail_Composition_Modal
4. THE System SHALL maintain backward compatibility with other features that may use similar modals
