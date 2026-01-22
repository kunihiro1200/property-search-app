# Requirements Document

## Introduction

売主リストおよび物件リストのEmail送信機能において、送信元メールアドレスを選択できるようにする機能を追加します。現在は送信者（ログインユーザー）のメールアドレスが自動的に使用されていますが、スタッフ管理（employees テーブル）に登録されている有効なメールアドレスから選択できるようにし、初期値として`tenant@ifoo-oita.com`を設定します。

## Glossary

- **Email Sending**: 売主に対してテンプレートメールを送信する機能
- **Sender Address**: Email送信時の送信元（From）メールアドレス
- **Reply-To Address**: メール返信先アドレス（本要件では送信元と同一）
- **Seller List**: 売主リスト画面（CallModePage）
- **Property Listing**: 物件リスト画面
- **Email Template**: メール配信時に使用するテンプレート
- **Employee**: スタッフ管理に登録されている社員情報
- **Active Employee**: 有効（通常）ステータスの社員

## Requirements

### Requirement 1

**User Story:** As a user, I want to select the sender email address when sending emails to sellers, so that I can control which email address sellers will reply to.

#### Acceptance Criteria

1. WHEN a user opens the email template selector THEN the system SHALL display a dropdown to select the sender email address
2. WHEN the email template selector is first opened THEN the system SHALL set the default sender address to "tenant@ifoo-oita.com"
3. WHEN a user selects a different sender address THEN the system SHALL remember the selection for the current session
4. WHEN a user sends an email THEN the system SHALL use the selected sender address as the From address
5. WHEN the email is sent THEN the system SHALL use the selected sender address as the reply-to address

### Requirement 2

**User Story:** As a system administrator, I want the available sender email addresses to be automatically loaded from the employee database, so that only active employees' email addresses can be used.

#### Acceptance Criteria

1. WHEN the system loads sender addresses THEN the system SHALL query the employees table for active employees
2. WHEN displaying the sender address dropdown THEN the system SHALL show all email addresses from active employees excluding GYOSHA users
3. WHEN an employee has no email address THEN the system SHALL exclude that employee from the sender list
4. WHEN an employee's email contains "GYOSHA" (case-insensitive) THEN the system SHALL exclude that employee from the sender list
5. WHEN the default address "tenant@ifoo-oita.com" is present THEN the system SHALL always include it regardless of other filtering rules
6. WHEN a sender address is selected THEN the system SHALL validate that it belongs to an active employee or is the default address
7. WHEN an invalid sender address is detected THEN the system SHALL revert to the default address "tenant@ifoo-oita.com"

### Requirement 3

**User Story:** As a user, I want the sender address selection to be intuitive and easy to use, so that I can quickly send emails without confusion.

#### Acceptance Criteria

1. WHEN the sender address dropdown is displayed THEN the system SHALL show the employee name and email address
2. WHEN a user hovers over a sender address option THEN the system SHALL display a tooltip with the employee's role
3. WHEN the email template selector modal is displayed THEN the system SHALL position the sender address dropdown prominently above the template selection
4. WHEN a user has selected a sender address THEN the system SHALL display the selected address clearly in the email preview
5. WHEN the user confirms the email sending THEN the system SHALL show a confirmation message including the selected sender address

### Requirement 4

**User Story:** As a developer, I want the sender address selection to be maintainable and extensible, so that new employees' addresses are automatically available.

#### Acceptance Criteria

1. WHEN a new employee is added to the database THEN the system SHALL automatically include their email address in the sender list
2. WHEN an employee is deactivated THEN the system SHALL automatically exclude their email address from the sender list
3. WHEN the sender address list is loaded THEN the system SHALL sort addresses alphabetically by employee name
4. WHEN an employee's email address is updated THEN the system SHALL reflect the change immediately
5. WHEN the system cannot load employee data THEN the system SHALL log an error and use only the default address "tenant@ifoo-oita.com"

### Requirement 5

**User Story:** As a user, I want the sender address selection to work consistently across both seller list and property listing email functions, so that I have a unified experience.

#### Acceptance Criteria

1. WHEN sending an email from the seller list THEN the system SHALL display the same sender address dropdown
2. WHEN sending an email from the property listing THEN the system SHALL display the same sender address dropdown
3. WHEN a sender address is selected in one context THEN the system SHALL remember the selection for the current session across both contexts
4. WHEN the default sender address is used THEN the system SHALL use "tenant@ifoo-oita.com" in both contexts
5. WHEN the email is sent from either context THEN the system SHALL use the selected sender address as the From and Reply-To address

### Requirement 6

**User Story:** As a user, I want to send distribution emails directly from the system with the selected sender address, so that emails are sent automatically without manual intervention.

#### Acceptance Criteria

1. WHEN a user clicks the Gmail distribution button THEN the system SHALL display the email template selector with a sender address dropdown
2. WHEN the email template selector is opened THEN the system SHALL set the default sender address to "tenant@ifoo-oita.com"
3. WHEN a user selects a sender address THEN the system SHALL remember the selection for the current session
4. WHEN a user confirms the email distribution THEN the system SHALL send emails directly using the existing email API with the selected sender address
5. WHEN emails are sent THEN the system SHALL use the selected sender address as the From and Reply-To address

### Requirement 7

**User Story:** As a user, I want to see confirmation of successful email sending, so that I know the distribution was completed.

#### Acceptance Criteria

1. WHEN the EmailTemplateSelector modal is displayed THEN the system SHALL show a sender address dropdown at the top of the modal
2. WHEN the sender address dropdown is displayed THEN the system SHALL default to "tenant@ifoo-oita.com"
3. WHEN a user selects a different sender address in the EmailTemplateSelector THEN the system SHALL save the selection to session storage
4. WHEN the BuyerFilterSummaryModal is displayed THEN the system SHALL display the selected sender address and recipient count
5. WHEN emails are being sent THEN the system SHALL display a loading indicator
6. WHEN all emails are sent successfully THEN the system SHALL display a success message with the number of emails sent and the sender address used

