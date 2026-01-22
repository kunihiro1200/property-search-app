# Requirements Document

## Introduction

現在のGmail配信機能は、ユーザーがボタンをクリックするとGmail Web UIが開き、ユーザーが手動で送信ボタンを押す必要があります。この仕様を変更し、Gmail APIを使用してバックエンドから直接メールを送信する機能を実装します。ただし、送信前にユーザーに確認モーダルを表示し、ユーザーが明示的に承認した後にのみ送信を実行します。

## Glossary

- **Gmail API**: Googleが提供するメール送信・管理のためのAPI
- **Distribution Button**: 物件リストページの「Gmailで配信」ボタン
- **Confirmation Modal**: 送信前にユーザーに表示される確認モーダル
- **Email Template Selector**: メールテンプレート選択モーダル
- **Buyer Filter Summary Modal**: 買主フィルター確認モーダル
- **BCC**: Blind Carbon Copy（ブラインドカーボンコピー）
- **Sender Address**: 送信元メールアドレス（FromおよびReply-Toヘッダーに使用）
- **Backend API**: バックエンドのメール送信エンドポイント
- **EmailService**: バックエンドのメール送信サービスクラス

## Requirements

### Requirement 1

**User Story:** As a user, I want to send distribution emails via Gmail API after confirming the details, so that I can efficiently distribute property information without manually clicking send in Gmail.

#### Acceptance Criteria

1. WHEN a user clicks the "Gmailで配信" button THEN the system SHALL display the email template selector modal
2. WHEN a user selects a template and sender address THEN the system SHALL display the buyer filter summary modal
3. WHEN a user confirms in the buyer filter summary modal THEN the system SHALL display a final confirmation modal showing sender address and recipient count
4. WHEN a user confirms in the final confirmation modal THEN the system SHALL send the email via backend Gmail API
5. WHEN the email is sent successfully THEN the system SHALL display a success message with the number of recipients

### Requirement 2

**User Story:** As a user, I want to see the sender address prominently in the confirmation modal, so that I can verify I'm sending from the correct address.

#### Acceptance Criteria

1. WHEN the confirmation modal is displayed THEN the system SHALL show the selected sender address in a prominent position
2. WHEN the confirmation modal is displayed THEN the system SHALL show the sender address label as "送信元"
3. WHEN the confirmation modal is displayed THEN the system SHALL show the recipient count
4. WHEN the confirmation modal is displayed THEN the system SHALL show the email subject
5. WHEN the confirmation modal is displayed THEN the system SHALL allow the user to cancel or confirm

### Requirement 3

**User Story:** As a developer, I want to implement a backend API endpoint for Gmail distribution, so that emails are sent securely from the server.

#### Acceptance Criteria

1. WHEN the backend receives a distribution request THEN the system SHALL validate the sender address
2. WHEN the backend receives a distribution request THEN the system SHALL validate the recipient list
3. WHEN the backend receives a distribution request THEN the system SHALL send emails using Gmail API
4. WHEN sending via Gmail API THEN the system SHALL set the From header to the selected sender address
5. WHEN sending via Gmail API THEN the system SHALL set the Reply-To header to the selected sender address

### Requirement 4

**User Story:** As a user, I want the system to handle BCC limits properly, so that all recipients receive the email even if there are more than 100 recipients.

#### Acceptance Criteria

1. WHEN the recipient count exceeds 100 THEN the system SHALL split the recipients into multiple batches
2. WHEN sending in batches THEN the system SHALL send each batch with a maximum of 100 BCC recipients
3. WHEN sending in batches THEN the system SHALL wait between batches to avoid rate limiting
4. WHEN all batches are sent THEN the system SHALL display the total number of recipients
5. WHEN any batch fails THEN the system SHALL display an error message with details

### Requirement 5

**User Story:** As a user, I want to see loading indicators during email sending, so that I know the system is processing my request.

#### Acceptance Criteria

1. WHEN the user confirms sending THEN the system SHALL display a loading indicator
2. WHEN the loading indicator is displayed THEN the system SHALL show "送信中..." message
3. WHEN the loading indicator is displayed THEN the system SHALL disable the confirm button
4. WHEN the email is sent successfully THEN the system SHALL hide the loading indicator
5. WHEN an error occurs THEN the system SHALL hide the loading indicator and show an error message

### Requirement 6

**User Story:** As a user, I want the system to fall back to Gmail Web UI if the API fails, so that I can still send emails manually.

#### Acceptance Criteria

1. WHEN the Gmail API fails THEN the system SHALL display an error message
2. WHEN the Gmail API fails THEN the system SHALL offer a fallback option to open Gmail Web UI
3. WHEN the user selects the fallback option THEN the system SHALL open Gmail compose window with pre-populated content
4. WHEN the fallback is used THEN the system SHALL log the error for debugging
5. WHEN the fallback is used THEN the system SHALL display instructions for manual sending

### Requirement 7

**User Story:** As a system administrator, I want proper error handling and logging, so that I can troubleshoot issues effectively.

#### Acceptance Criteria

1. WHEN an error occurs during sending THEN the system SHALL log the error details to the backend
2. WHEN an error occurs during sending THEN the system SHALL display a user-friendly error message
3. WHEN an error occurs during sending THEN the system SHALL include the error type in the log
4. WHEN an error occurs during sending THEN the system SHALL include the timestamp in the log
5. WHEN an error occurs during sending THEN the system SHALL NOT expose sensitive information to the user

### Requirement 8

**User Story:** As a developer, I want to use the existing buyer filtering and template logic, so that the implementation is consistent with current functionality.

#### Acceptance Criteria

1. WHEN fetching qualified buyers THEN the system SHALL use the existing EnhancedBuyerDistributionService
2. WHEN applying email templates THEN the system SHALL use the existing template replacement logic
3. WHEN selecting sender addresses THEN the system SHALL use the existing sender address options
4. WHEN validating distribution areas THEN the system SHALL use the existing validation logic
5. WHEN the feature is deployed THEN the system SHALL require no database schema changes

### Requirement 9

**User Story:** As a user, I want the confirmation modal to be clear and concise, so that I can quickly review and confirm the sending.

#### Acceptance Criteria

1. WHEN the confirmation modal is displayed THEN the system SHALL show a clear title like "メール送信確認"
2. WHEN the confirmation modal is displayed THEN the system SHALL show the sender address with a label
3. WHEN the confirmation modal is displayed THEN the system SHALL show the recipient count with a label
4. WHEN the confirmation modal is displayed THEN the system SHALL show the email subject
5. WHEN the confirmation modal is displayed THEN the system SHALL show confirm and cancel buttons

### Requirement 10

**User Story:** As a user, I want the system to preserve my sender address selection, so that I don't have to select it every time.

#### Acceptance Criteria

1. WHEN a user selects a sender address THEN the system SHALL store it in session storage
2. WHEN a user returns to the page THEN the system SHALL load the saved sender address
3. WHEN a user closes the browser THEN the system SHALL clear the saved sender address
4. WHEN no saved address exists THEN the system SHALL default to 'tenant@ifoo-oita.com'
5. WHEN the saved address is invalid THEN the system SHALL default to 'tenant@ifoo-oita.com'
