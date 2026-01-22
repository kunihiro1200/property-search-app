# Requirements Document

## Introduction

Gmail配信機能において、送信元メールアドレスのドロップダウンは正常に動作しているが、初期値が常に`tenant@ifoo-oita.com`にならず、セッションストレージに保存された前回の選択値が表示されてしまう問題を修正します。要件では「メールテンプレートセレクターが最初に開かれたとき」に初期値を`tenant@ifoo-oita.com`に設定する必要がありますが、現在の実装ではセッションストレージの値が優先されています。

## Glossary

- **Email Template Selector**: メールテンプレートを選択するモーダルダイアログ
- **Sender Address Dropdown**: 送信元メールアドレスを選択するドロップダウン
- **Default Sender**: デフォルトの送信元アドレス（tenant@ifoo-oita.com）
- **Session Storage**: ブラウザのセッションストレージ（タブを閉じるまで保持される）
- **GmailDistributionButton**: Gmail配信ボタンコンポーネント

## Requirements

### Requirement 1

**User Story:** As a user, I want the sender email address to always default to "tenant@ifoo-oita.com" when I open the email template selector, so that I have a consistent starting point for each distribution.

#### Acceptance Criteria

1. WHEN a user opens the email template selector for the first time in a session THEN the system SHALL set the sender address to "tenant@ifoo-oita.com"
2. WHEN a user opens the email template selector again in the same session THEN the system SHALL set the sender address to "tenant@ifoo-oita.com"
3. WHEN a user selects a different sender address THEN the system SHALL use that address for the current email distribution only
4. WHEN a user completes or cancels an email distribution THEN the system SHALL not persist the selected sender address
5. WHEN a user opens a new email distribution THEN the system SHALL reset the sender address to "tenant@ifoo-oita.com"

### Requirement 2

**User Story:** As a user, I want to be able to change the sender address during the email distribution workflow, so that I can use a different address if needed.

#### Acceptance Criteria

1. WHEN a user changes the sender address in the EmailTemplateSelector modal THEN the system SHALL update the sender address for the current distribution
2. WHEN a user proceeds to the BuyerFilterSummaryModal THEN the system SHALL display the selected sender address
3. WHEN a user changes the sender address in the BuyerFilterSummaryModal THEN the system SHALL update the sender address for the current distribution
4. WHEN a user proceeds to the DistributionConfirmationModal THEN the system SHALL display the selected sender address
5. WHEN a user changes the sender address in the DistributionConfirmationModal THEN the system SHALL update the sender address for the current distribution

### Requirement 3

**User Story:** As a developer, I want the sender address state management to be clear and maintainable, so that the behavior is predictable and easy to modify.

#### Acceptance Criteria

1. WHEN the GmailDistributionButton component is mounted THEN the system SHALL initialize the sender address to "tenant@ifoo-oita.com"
2. WHEN the email template selector is opened THEN the system SHALL not load any saved sender address from session storage
3. WHEN the email distribution workflow is completed or cancelled THEN the system SHALL reset the sender address to "tenant@ifoo-oita.com"
4. WHEN the component is unmounted THEN the system SHALL not persist the sender address to session storage
5. WHEN the sender address state is updated THEN the system SHALL propagate the change to all child modals

### Requirement 4

**User Story:** As a user, I want the sender address selection to work consistently across all three modals in the distribution workflow, so that I can change it at any point if needed.

#### Acceptance Criteria

1. WHEN a user changes the sender address in any modal THEN the system SHALL update the sender address in all subsequent modals
2. WHEN a user goes back to a previous modal THEN the system SHALL display the currently selected sender address
3. WHEN a user closes a modal without completing the distribution THEN the system SHALL reset the sender address to "tenant@ifoo-oita.com" for the next distribution
4. WHEN a user completes the distribution THEN the system SHALL reset the sender address to "tenant@ifoo-oita.com" for the next distribution
5. WHEN the sender address is displayed in any modal THEN the system SHALL show the same value across all modals

## Technical Notes

現在の問題点：
- `GmailDistributionButton`コンポーネントで`useEffect`を使用してセッションストレージから送信元アドレスを復元している
- この復元処理により、初期値が`DEFAULT_SENDER`ではなく、前回選択した値になってしまう
- セッションストレージへの保存処理（`handleSenderAddressChange`）も不要

修正方針：
- セッションストレージの使用を完全に削除
- 常に`DEFAULT_SENDER`を初期値として使用
- モーダルが閉じられたら、送信元アドレスを`DEFAULT_SENDER`にリセット
- 配信完了後も`DEFAULT_SENDER`にリセット
