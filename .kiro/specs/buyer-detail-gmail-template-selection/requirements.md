# Requirements Document

## Introduction

買主詳細ページにおけるGmail送信機能を改善し、問合せ履歴が一つしかない場合でもGmail送信ボタンを表示し、複数のテンプレートから選択して送信できるようにする。また、複数の物件問合せがある場合は、送信対象の物件を選択できるようにする。

## Glossary

- **Buyer_Detail_Page**: 買主の詳細情報を表示するページ
- **Gmail_Send_Button**: Gmailでメールを送信するためのボタン
- **Email_Template**: メール送信時に使用できる定型文テンプレート
- **Inquiry_History**: 買主が問合せした物件の履歴
- **Property**: 物件情報
- **Template_Selector**: メールテンプレートを選択するためのUI要素
- **Property_Selector**: 送信対象の物件を選択するためのUI要素

## Requirements

### Requirement 1: Gmail送信ボタンの常時表示

**User Story:** As a 営業担当者, I want to see the Gmail send button even when there is only one inquiry, so that I can send emails to buyers regardless of inquiry count.

#### Acceptance Criteria

1. WHEN a buyer has one or more inquiry history records, THE Buyer_Detail_Page SHALL display the Gmail_Send_Button
2. WHEN a buyer has zero inquiry history records, THE Buyer_Detail_Page SHALL NOT display the Gmail_Send_Button
3. WHEN the Gmail_Send_Button is displayed, THE Buyer_Detail_Page SHALL position it prominently in the inquiry history section

### Requirement 2: メールテンプレート選択機能

**User Story:** As a 営業担当者, I want to select from multiple email templates when clicking the Gmail send button, so that I can quickly send appropriate messages for different situations.

#### Acceptance Criteria

1. WHEN the Gmail_Send_Button is clicked, THE System SHALL display a Template_Selector modal
2. WHEN the Template_Selector is displayed, THE System SHALL show all available email templates with preview text
3. WHEN a template is selected from the Template_Selector, THE System SHALL populate the email composition form with the selected template content
4. WHEN the Template_Selector is displayed, THE System SHALL allow the user to cancel without selecting a template
5. THE Template_Selector SHALL display template names and brief descriptions for each template

### Requirement 3: 単一物件問合せ時のデフォルト動作

**User Story:** As a 営業担当者, I want the system to automatically select the property when there is only one inquiry, so that I can send emails quickly without extra steps.

#### Acceptance Criteria

1. WHEN a buyer has exactly one inquiry history record AND the Gmail_Send_Button is clicked, THE System SHALL automatically set that property as the email recipient context
2. WHEN a buyer has exactly one inquiry history record, THE System SHALL NOT display a Property_Selector
3. WHEN the email is sent with a single inquiry, THE System SHALL associate the email with that property in the email history

### Requirement 4: 複数物件問合せ時の物件選択機能

**User Story:** As a 営業担当者, I want to select which property to send an email about when there are multiple inquiries, so that I can send targeted property information.

#### Acceptance Criteria

1. WHEN a buyer has multiple inquiry history records AND the Gmail_Send_Button is clicked, THE System SHALL display a Property_Selector
2. WHEN the Property_Selector is displayed, THE System SHALL show all properties from the inquiry history with property details
3. WHEN a property was clicked to open the buyer detail page, THE System SHALL pre-select that property in the Property_Selector
4. WHEN no specific property context exists, THE System SHALL pre-select the most recent inquiry property
5. WHEN a property is selected from the Property_Selector, THE System SHALL update the email context to reference that property
6. THE Property_Selector SHALL allow changing the selected property before sending the email

### Requirement 5: テンプレートと物件情報の統合

**User Story:** As a 営業担当者, I want email templates to automatically include relevant property information, so that I can send personalized emails efficiently.

#### Acceptance Criteria

1. WHEN a template is selected AND a property is selected, THE System SHALL merge property-specific information into the template
2. WHEN property information is merged, THE System SHALL replace template placeholders with actual property data
3. WHEN the email composition form is populated, THE System SHALL display the merged content for review before sending
4. THE System SHALL support common placeholders such as property address, price, and property number

### Requirement 6: メール送信履歴の記録

**User Story:** As a 営業担当者, I want sent emails to be recorded with the associated property and template, so that I can track communication history.

#### Acceptance Criteria

1. WHEN an email is sent, THE System SHALL record the email in the email history table
2. WHEN recording the email, THE System SHALL associate it with the buyer ID
3. WHEN recording the email, THE System SHALL associate it with the property ID if a property was selected
4. WHEN recording the email, THE System SHALL store the template name that was used
5. WHEN recording the email, THE System SHALL store the timestamp of when the email was sent

### Requirement 7: UIの応答性とエラーハンドリング

**User Story:** As a 営業担当者, I want clear feedback when interacting with the Gmail send feature, so that I understand what is happening and can handle any errors.

#### Acceptance Criteria

1. WHEN the Gmail_Send_Button is clicked, THE System SHALL provide visual feedback that the action is processing
2. WHEN the Template_Selector is loading, THE System SHALL display a loading indicator
3. IF template loading fails, THEN THE System SHALL display an error message and allow retry
4. WHEN an email is successfully sent, THE System SHALL display a success notification
5. IF email sending fails, THEN THE System SHALL display an error message with details and allow retry
6. WHEN the Property_Selector is displayed, THE System SHALL clearly indicate which property is currently selected
