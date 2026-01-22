# Requirements Document

## Introduction

Gmail配信機能において、送信元メールアドレスを選択しても、実際に送信されるメールは常に特定のアカウント(tomoko.kunihiro@ifoo-oita.com)から送信される問題を修正します。これは、Gmail APIの認証メカニズムとメール送信の仕組みに起因する問題です。

## Glossary

- **Gmail API**: Googleが提供するメール送信・受信のためのAPI
- **OAuth2認証**: Googleアカウントへのアクセスを許可するための認証方式
- **送信元アドレス**: メールの`From`ヘッダーに表示されるメールアドレス
- **認証アカウント**: Gmail APIの認証に使用されるGoogleアカウント
- **Send As機能**: Gmailで別のメールアドレスから送信できるようにする機能
- **Delegation**: 他のユーザーのメールボックスにアクセスする権限

## Requirements

### Requirement 1

**User Story:** As a user, I want to select a sender email address from a dropdown, so that emails are sent from the correct account.

#### Acceptance Criteria

1. WHEN a user selects a sender address from the dropdown THEN the system SHALL send emails from that selected address
2. WHEN the selected sender address is not properly configured THEN the system SHALL display a clear error message explaining the configuration issue
3. WHEN emails are sent THEN the recipient SHALL see the selected sender address in the "From" field
4. WHEN a user views sent emails in Gmail THEN the emails SHALL appear in the sent folder of the selected sender account
5. WHEN the system initializes THEN the system SHALL verify that all available sender addresses are properly configured for sending

### Requirement 2

**User Story:** As a system administrator, I want to configure multiple sender addresses, so that different users can send emails from appropriate accounts.

#### Acceptance Criteria

1. WHEN configuring sender addresses THEN the system SHALL support Gmail's "Send As" feature for each address
2. WHEN a sender address is added THEN the system SHALL verify that the address is authorized to send emails
3. WHEN using a sender address THEN the system SHALL use the appropriate OAuth2 credentials for that address
4. WHEN a sender address lacks proper configuration THEN the system SHALL prevent its use and log the configuration error
5. WHEN multiple sender addresses are configured THEN the system SHALL maintain separate authentication tokens for each address

### Requirement 3

**User Story:** As a developer, I want clear documentation on Gmail API sender configuration, so that I can properly set up and troubleshoot sender addresses.

#### Acceptance Criteria

1. WHEN setting up a new sender address THEN the documentation SHALL provide step-by-step instructions for Gmail "Send As" configuration
2. WHEN troubleshooting sender issues THEN the documentation SHALL include common error scenarios and their solutions
3. WHEN configuring OAuth2 THEN the documentation SHALL specify the required scopes and permissions
4. WHEN errors occur THEN the system SHALL log detailed diagnostic information including the authenticated account and attempted sender address
5. WHEN validating configuration THEN the documentation SHALL provide a checklist of required settings

### Requirement 4

**User Story:** As a user, I want to see which sender address will be used before sending, so that I can verify the correct account is selected.

#### Acceptance Criteria

1. WHEN composing an email THEN the system SHALL display the currently selected sender address prominently
2. WHEN the sender address is changed THEN the system SHALL update the display immediately
3. WHEN hovering over the sender address THEN the system SHALL show additional information about the account status
4. WHEN a sender address has configuration issues THEN the system SHALL display a warning icon with details
5. WHEN sending emails THEN the system SHALL confirm the sender address in the success message

## Technical Constraints

1. Gmail APIの制限により、送信元アドレスは以下のいずれかである必要があります:
   - 認証されたGoogleアカウント自身のアドレス
   - "Send As"機能で設定された別名アドレス
   - Domain-wide delegationが設定されている場合の組織内アドレス

2. 各送信元アドレスには適切なOAuth2トークンが必要です

3. "Send As"アドレスは事前にGmailの設定で追加・確認されている必要があります

## Out of Scope

- 複数のGoogleアカウント間での完全な切り替え機能
- リアルタイムでの"Send As"アドレスの追加
- Gmail以外のメールプロバイダーのサポート
