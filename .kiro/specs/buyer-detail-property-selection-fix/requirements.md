# Requirements Document

## Introduction

買主詳細ページのGmail送信機能において、複数物件問合せがある買主の場合、問合せ履歴のチェックボックスで選択した物件を直接使用し、Gmail送信モーダル内で再度物件選択をさせない仕様に変更する。これにより、ユーザーの操作を簡素化し、二重選択の問題を解消する。

## Glossary

- **Buyer_Detail_Page**: 買主の詳細情報を表示するページ
- **Inquiry_History_Table**: 買主が問合せした物件の履歴を表示するテーブル
- **Property_Checkbox**: 問合せ履歴テーブル内の各物件に対するチェックボックス
- **Gmail_Send_Button**: Gmailでメールを送信するためのボタン
- **Email_Composition_Modal**: メール作成・送信を行うモーダルウィンドウ
- **Property_Selection_Modal**: 送信対象の物件を選択するモーダル（削除対象）
- **Email_Template**: メール送信時に使用できる定型文テンプレート

## Requirements

### Requirement 1: 問合せ履歴チェックボックスによる物件選択

**User Story:** As a 営業担当者, I want to select properties using checkboxes in the inquiry history table, so that I can clearly indicate which properties I want to send emails about.

#### Acceptance Criteria

1. WHEN the Inquiry_History_Table is displayed, THE System SHALL show a Property_Checkbox for each inquiry record
2. WHEN a Property_Checkbox is checked, THE System SHALL visually indicate that the property is selected
3. WHEN multiple Property_Checkboxes are checked, THE System SHALL allow multiple selections
4. WHEN all Property_Checkboxes are unchecked, THE Gmail_Send_Button SHALL be disabled or hidden
5. WHEN at least one Property_Checkbox is checked, THE Gmail_Send_Button SHALL be enabled and visible

### Requirement 2: チェックボックス選択に基づくGmail送信

**User Story:** As a 営業担当者, I want the Gmail send button to use my checkbox selections directly, so that I don't have to select properties again in a separate modal.

#### Acceptance Criteria

1. WHEN the Gmail_Send_Button is clicked AND one property is selected via checkbox, THE System SHALL open the Email_Composition_Modal with that property pre-selected
2. WHEN the Gmail_Send_Button is clicked AND multiple properties are selected via checkboxes, THE System SHALL open the Email_Composition_Modal with all selected properties
3. WHEN the Email_Composition_Modal opens, THE System SHALL NOT display a Property_Selection_Modal
4. WHEN the Email_Composition_Modal displays selected properties, THE System SHALL show property details (property number, address) for confirmation
5. THE Email_Composition_Modal SHALL display the list of selected properties in a read-only format

### Requirement 3: 単一物件の場合の簡略化

**User Story:** As a 営業担当者, I want the system to automatically handle single-property cases, so that I can send emails quickly without unnecessary checkbox operations.

#### Acceptance Criteria

1. WHEN a buyer has exactly one inquiry history record, THE System SHALL automatically treat that property as selected
2. WHEN a buyer has exactly one inquiry history record, THE System MAY hide the Property_Checkbox or show it as pre-checked and disabled
3. WHEN the Gmail_Send_Button is clicked with a single inquiry, THE System SHALL open the Email_Composition_Modal with that property automatically selected
4. WHEN a single property is automatically selected, THE System SHALL display the property information in the Email_Composition_Modal

### Requirement 4: 複数物件メール送信の処理

**User Story:** As a 営業担当者, I want to send emails about multiple properties at once, so that I can efficiently communicate about several listings to a buyer.

#### Acceptance Criteria

1. WHEN multiple properties are selected AND an email is sent, THE System SHALL create separate email history records for each property
2. WHEN multiple properties are selected, THE Email_Composition_Modal SHALL allow the user to include information about all selected properties in the email body
3. WHEN the email template is populated, THE System SHALL merge information from all selected properties
4. WHEN multiple properties are included, THE System SHALL format the property information in a clear, organized manner
5. THE System SHALL support template placeholders that can handle multiple properties (e.g., property list, combined details)

### Requirement 5: 物件選択の変更と確認

**User Story:** As a 営業担当者, I want to review and confirm which properties are included before sending, so that I can ensure I'm sending the correct information.

#### Acceptance Criteria

1. WHEN the Email_Composition_Modal is displayed, THE System SHALL show a summary of selected properties at the top of the modal
2. WHEN the user wants to change property selection, THE System SHALL provide a "Change Selection" button that closes the modal and returns to the inquiry history table
3. WHEN the user clicks "Change Selection", THE System SHALL preserve the current checkbox selections
4. WHEN the Email_Composition_Modal is reopened, THE System SHALL reflect any changes made to the checkbox selections
5. THE System SHALL clearly indicate the number of properties selected (e.g., "Sending email about 2 properties")

### Requirement 6: 既存の物件選択モーダルの削除

**User Story:** As a 営業担当者, I want a streamlined email sending process without redundant property selection steps, so that I can work more efficiently.

#### Acceptance Criteria

1. THE System SHALL NOT display the Property_Selection_Modal when the Gmail_Send_Button is clicked
2. THE System SHALL remove all code and UI components related to the Property_Selection_Modal
3. WHEN navigating from a property detail page to a buyer detail page, THE System SHALL pre-check the corresponding property checkbox in the inquiry history table
4. THE System SHALL maintain backward compatibility with email history records that reference single properties

### Requirement 7: エラーハンドリングとバリデーション

**User Story:** As a 営業担当者, I want clear feedback when there are issues with property selection, so that I can correct any problems before sending emails.

#### Acceptance Criteria

1. WHEN the Gmail_Send_Button is clicked AND no properties are selected, THE System SHALL display an error message instructing the user to select at least one property
2. WHEN checkbox selection state is inconsistent, THE System SHALL validate and correct the state before opening the Email_Composition_Modal
3. IF property data fails to load for a selected property, THEN THE System SHALL display an error message and prevent email sending
4. WHEN an email is successfully sent, THE System SHALL clear the checkbox selections and display a success notification
5. IF email sending fails, THEN THE System SHALL maintain the checkbox selections and allow retry

