# Requirements Document

## Introduction

通話モードページ（CallModePage）において、Email送信ドロップダウンがグレーアウトしてクリックできない問題を修正します。現在、送信元メールアドレス（tenant@ifoo-oita.com）が送信元アドレスの選択肢に含まれていないため、SenderAddressSelectorコンポーネントが正しく初期化されず、ドロップダウンが無効化されています。

## Glossary

- **Call Mode Page**: 通話専用ページ（/sellers/:id/call）
- **Email Dropdown**: Email送信テンプレート選択ドロップダウン
- **Seller**: 売主
- **Email Template**: メール配信時に使用するテンプレート
- **Sender Address**: Email送信時の送信元（From）メールアドレス
- **Default Sender Address**: デフォルトの送信元アドレス（tenant@ifoo-oita.com）
- **System**: 売主リスト管理システム

## Requirements

### Requirement 1

**User Story:** As a user, I want to be able to open the email template dropdown even when the seller has no email address, so that I can preview templates and prepare to send an email once I obtain the email address.

#### Acceptance Criteria

1. WHEN the Call Mode Page is displayed THEN the System SHALL display the Email dropdown as enabled regardless of whether the seller has an email address
2. WHEN a user clicks the Email dropdown THEN the System SHALL display all available email templates
3. WHEN a user selects an email template THEN the System SHALL open the email composition dialog
4. WHEN the email composition dialog is opened and the seller has no email address THEN the System SHALL display a warning message indicating that an email address is required
5. WHEN the email composition dialog is opened and the seller has an email address THEN the System SHALL pre-fill the recipient field with the seller's email address

### Requirement 2

**User Story:** As a user, I want to see a clear indication when the seller has no email address, so that I know I need to add one before sending.

#### Acceptance Criteria

1. WHEN the email composition dialog is displayed and the seller has no email address THEN the System SHALL display a prominent warning message at the top of the dialog
2. WHEN the warning message is displayed THEN the System SHALL include text such as "売主のメールアドレスが登録されていません。送信前にメールアドレスを追加してください。"
3. WHEN the email composition dialog is displayed and the seller has no email address THEN the System SHALL allow the user to edit the recipient email field
4. WHEN the user enters a valid email address in the recipient field THEN the System SHALL enable the send button
5. WHEN the user attempts to send without entering an email address THEN the System SHALL display an error message and prevent sending

### Requirement 3

**User Story:** As a user, I want to be able to add the seller's email address directly from the email composition dialog, so that I can quickly update the information without leaving the current workflow.

#### Acceptance Criteria

1. WHEN the email composition dialog is displayed and the seller has no email address THEN the System SHALL display a link or button to edit the seller's information
2. WHEN the user clicks the edit seller information link THEN the System SHALL open the seller information edit section
3. WHEN the user saves the updated seller information with a valid email address THEN the System SHALL automatically populate the recipient field in the email composition dialog
4. WHEN the seller information is updated THEN the System SHALL refresh the seller data in the Call Mode Page
5. WHEN the email composition dialog is reopened after adding an email address THEN the System SHALL no longer display the warning message

### Requirement 4

**User Story:** As a user, I want the email dropdown to remain functional during template sending, so that I can queue multiple emails if needed.

#### Acceptance Criteria

1. WHEN an email is being sent (sendingTemplate is true) THEN the System SHALL disable the Email dropdown to prevent duplicate submissions
2. WHEN the email sending is complete THEN the System SHALL re-enable the Email dropdown
3. WHEN the email sending fails THEN the System SHALL re-enable the Email dropdown and display an error message
4. WHEN the user closes the email composition dialog without sending THEN the System SHALL re-enable the Email dropdown immediately
5. WHEN multiple email templates are selected in sequence THEN the System SHALL handle each selection independently without conflicts

### Requirement 5

**User Story:** As a user, I want to see visual feedback about the email dropdown state, so that I understand why it might be disabled.

#### Acceptance Criteria

1. WHEN the Email dropdown is disabled due to sending in progress THEN the System SHALL display a loading indicator or spinner
2. WHEN the Email dropdown is enabled THEN the System SHALL display the normal dropdown icon
3. WHEN the user hovers over the Email dropdown THEN the System SHALL display a tooltip indicating its current state
4. WHEN the Email dropdown is disabled due to sending THEN the tooltip SHALL indicate "メール送信中..."
5. WHEN the Email dropdown is enabled THEN the tooltip SHALL indicate "メールテンプレートを選択"

### Requirement 6

**User Story:** As a developer, I want the email dropdown logic to be maintainable and clear, so that future changes are easy to implement.

#### Acceptance Criteria

1. WHEN the Email dropdown disabled state is evaluated THEN the System SHALL only check if sendingTemplate is true
2. WHEN the email composition dialog is opened THEN the System SHALL validate the seller's email address separately
3. WHEN the email validation logic is implemented THEN the System SHALL use a dedicated validation function
4. WHEN the email sending logic is implemented THEN the System SHALL check for a valid recipient email address before sending
5. WHEN the code is reviewed THEN the System SHALL have clear comments explaining the disabled state logic
