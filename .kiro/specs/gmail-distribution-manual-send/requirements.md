# Requirements Document

## Introduction

Gmail配信機能において、現在の「配信ボタンを押すと自動的にメール送信される」動作を変更し、「配信ボタンを押すとGmailの作成画面が開き、ユーザーが手動で送信ボタンを押して初めて送信される」仕様に変更します。これにより、ユーザーは送信前に内容を最終確認・編集できるようになります。

## Glossary

- **Gmail Distribution Button**: 物件リストページの「Gmailで配信」ボタン
- **Gmail Compose Window**: Gmailの新規メール作成画面
- **Email Template Selector**: メールテンプレート選択モーダル
- **Buyer Filter Summary Modal**: 買主フィルター確認モーダル
- **BCC**: Blind Carbon Copy（ブラインドカーボンコピー）
- **Sender Address**: 送信元メールアドレス
- **Direct Send**: システムから直接メール送信する機能（削除対象）
- **Manual Send**: ユーザーがGmail画面で手動送信する機能（実装対象）

## Requirements

### Requirement 1

**User Story:** As a user, I want the Gmail distribution button to open Gmail compose window instead of sending emails directly, so that I can review and edit the email content before sending.

#### Acceptance Criteria

1. WHEN a user clicks the "Gmailで配信" button THEN the system SHALL display the email template selector modal
2. WHEN a user selects a template and sender address THEN the system SHALL display the buyer filter summary modal
3. WHEN a user confirms in the buyer filter summary modal THEN the system SHALL open Gmail compose window with pre-populated content
4. WHEN the Gmail compose window opens THEN the system SHALL NOT send any emails automatically
5. WHEN the Gmail compose window opens THEN the user SHALL manually click the Gmail send button to send the email

### Requirement 2

**User Story:** As a user, I want the Gmail compose window to be pre-populated with all necessary information, so that I can send the email with minimal additional input.

#### Acceptance Criteria

1. WHEN the Gmail compose window opens THEN the system SHALL set the From address to the selected sender address
2. WHEN the Gmail compose window opens THEN the system SHALL populate the BCC field with all qualified buyer email addresses
3. WHEN the Gmail compose window opens THEN the system SHALL populate the subject line with the template subject
4. WHEN the Gmail compose window opens THEN the system SHALL populate the email body with the template content
5. WHEN the Gmail compose window opens THEN the system SHALL allow the user to edit any field before sending

### Requirement 3

**User Story:** As a user, I want to see a confirmation message after the Gmail compose window opens, so that I understand the next steps.

#### Acceptance Criteria

1. WHEN the Gmail compose window opens successfully THEN the system SHALL display a success notification
2. WHEN the success notification is displayed THEN the system SHALL show the number of recipients in BCC
3. WHEN the success notification is displayed THEN the system SHALL show the selected sender address
4. WHEN the success notification is displayed THEN the system SHALL instruct the user to review and send the email manually
5. WHEN the Gmail compose window fails to open THEN the system SHALL display an error message with troubleshooting guidance

### Requirement 4

**User Story:** As a developer, I want to remove the direct email sending functionality, so that the system no longer sends emails automatically.

#### Acceptance Criteria

1. WHEN the codebase is updated THEN the system SHALL remove all direct email sending API calls from the Gmail distribution flow
2. WHEN the codebase is updated THEN the system SHALL remove the EmailService integration from the Gmail distribution components
3. WHEN the codebase is updated THEN the system SHALL remove loading indicators related to email sending
4. WHEN the codebase is updated THEN the system SHALL remove success/failure messages related to direct email sending
5. WHEN the codebase is updated THEN the system SHALL maintain the Gmail compose URL generation logic

### Requirement 5

**User Story:** As a user, I want the buyer filter summary modal to clearly indicate that Gmail will open for manual sending, so that I have correct expectations.

#### Acceptance Criteria

1. WHEN the buyer filter summary modal is displayed THEN the system SHALL show a message indicating Gmail will open
2. WHEN the buyer filter summary modal is displayed THEN the system SHALL show the confirm button labeled "Gmailを開く" or similar
3. WHEN the buyer filter summary modal is displayed THEN the system SHALL show the selected sender address
4. WHEN the buyer filter summary modal is displayed THEN the system SHALL show the recipient count
5. WHEN the buyer filter summary modal is displayed THEN the system SHALL NOT show any loading indicators for email sending

### Requirement 6

**User Story:** As a system administrator, I want the change to be backward compatible with existing data and configurations, so that no data migration is required.

#### Acceptance Criteria

1. WHEN the feature is deployed THEN the system SHALL continue to use existing buyer filtering logic
2. WHEN the feature is deployed THEN the system SHALL continue to use existing email templates
3. WHEN the feature is deployed THEN the system SHALL continue to use existing sender address selection
4. WHEN the feature is deployed THEN the system SHALL continue to support all existing property listing data
5. WHEN the feature is deployed THEN the system SHALL require no database schema changes

### Requirement 7

**User Story:** As a user, I want the Gmail compose window to open in a new tab or window, so that I don't lose my current work context.

#### Acceptance Criteria

1. WHEN the Gmail compose window is triggered THEN the system SHALL open Gmail in a new browser tab
2. WHEN the Gmail compose window opens THEN the system SHALL keep the current property listing page open
3. WHEN the Gmail compose window opens THEN the system SHALL allow the user to switch back to the property listing page
4. WHEN multiple Gmail compose windows are opened THEN the system SHALL open each in a separate tab
5. WHEN the browser blocks pop-ups THEN the system SHALL display a message instructing the user to allow pop-ups
