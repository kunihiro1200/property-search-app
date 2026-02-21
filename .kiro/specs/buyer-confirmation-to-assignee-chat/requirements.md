# Requirements Document

## Introduction

買主詳細画面に「担当への確認事項」フィールドを使ったGoogle Chat送信機能を追加します。この機能により、買主担当者が物件担当者へ質問や伝言を簡単に送信できるようになります。

## Glossary

- **System**: 買主管理システム（Buyer Management System）
- **Buyer_Detail_Page**: 買主詳細画面
- **Confirmation_Field**: 「担当への確認事項」フィールド（buyers.confirmation_to_assignee）
- **Property_Assignee**: 物件担当者（property_listings.sales_assignee）
- **Staff_Spreadsheet**: スタッフ管理スプレッドシート（ID: 19yAuVYQRm-_zhjYX7M7zjiGbnBibkG77Mpz93sN1xxs）
- **Chat_Webhook**: Google Chat Webhook URL（Staff_Spreadsheetのカラム「Chat webhook」）
- **Buyer_Number**: 買主番号（buyers.buyer_number）
- **Property_Number**: 物件番号（buyers.property_number）

## Requirements

### Requirement 1: フィールドの移動と表示条件

**User Story:** As a 買主担当者, I want to see the 担当への確認事項 field below the 問合時ヒアリング field, so that I can easily send questions to the property assignee.

#### Acceptance Criteria

1. WHEN Buyer_Detail_Page is displayed, THE System SHALL move Confirmation_Field from the "その他" section to below the "問合時ヒアリング" field in the "問合せ内容" section
2. WHEN Property_Number exists in buyers table AND Property_Assignee exists in property_listings table, THE System SHALL display Confirmation_Field
3. WHEN Property_Number does not exist OR Property_Assignee does not exist, THE System SHALL hide Confirmation_Field
4. WHEN Confirmation_Field is displayed, THE System SHALL show it as an inline editable textarea field

### Requirement 2: 送信UIの表示

**User Story:** As a 買主担当者, I want to see a send button when I enter confirmation text, so that I can send the message to the property assignee.

#### Acceptance Criteria

1. WHEN Confirmation_Field has text content, THE System SHALL display a "伝言/質問事項を送信" section below Confirmation_Field
2. WHEN the send section is displayed, THE System SHALL show a "送信" button
3. WHEN the send section is displayed, THE System SHALL show the Property_Assignee name in the format "担当者 {Property_Assignee} に送信"
4. WHEN Confirmation_Field is empty, THE System SHALL hide the send section

### Requirement 3: 送信先の決定

**User Story:** As a システム管理者, I want the system to automatically determine the correct Chat webhook URL, so that messages are sent to the correct property assignee.

#### Acceptance Criteria

1. WHEN the send button is clicked, THE System SHALL fetch data from Staff_Spreadsheet sheet "スタッフ"
2. WHEN searching for the staff member, THE System SHALL match Property_Assignee against column C (名前) OR column A (イニシャル)
3. WHEN a matching staff member is found, THE System SHALL retrieve the Chat_Webhook from column F (Chat webhook)
4. WHEN no matching staff member is found, THE System SHALL return an error message "担当者が見つかりませんでした"
5. WHEN Chat_Webhook is empty, THE System SHALL return an error message "担当者のChat webhook URLが設定されていません"

### Requirement 4: メッセージ送信

**User Story:** As a 買主担当者, I want to send confirmation messages via Google Chat, so that the property assignee receives my questions immediately.

#### Acceptance Criteria

1. WHEN the send button is clicked AND Chat_Webhook is valid, THE System SHALL send a message to the Chat_Webhook URL
2. WHEN sending the message, THE System SHALL format it as follows:
   ```
   【買主からの確認事項】
   買主番号: {Buyer_Number}
   買主名: {name}
   物件番号: {Property_Number}
   
   確認事項:
   {Confirmation_Field content}
   ```
3. WHEN the message is sent successfully, THE System SHALL display a success message "送信しました"
4. WHEN the message fails to send, THE System SHALL display an error message with the failure reason
5. WHEN the message is sent successfully, THE System SHALL NOT clear Confirmation_Field content

### Requirement 5: エラーハンドリング

**User Story:** As a 買主担当者, I want to see clear error messages when sending fails, so that I can understand what went wrong and retry if needed.

#### Acceptance Criteria

1. IF Staff_Spreadsheet cannot be accessed, THEN THE System SHALL display an error message "スタッフ情報の取得に失敗しました"
2. IF Chat_Webhook URL is invalid, THEN THE System SHALL display an error message "無効なWebhook URLです"
3. IF Google Chat API returns an error, THEN THE System SHALL display an error message "メッセージの送信に失敗しました: {error details}"
4. WHEN an error occurs, THE System SHALL allow the user to retry sending
5. WHEN an error occurs, THE System SHALL log the error details for debugging

### Requirement 6: データベース整合性

**User Story:** As a システム管理者, I want to ensure the confirmation_to_assignee field exists in the buyers table, so that the feature works correctly.

#### Acceptance Criteria

1. THE System SHALL verify that buyers table has a confirmation_to_assignee column of type TEXT
2. IF confirmation_to_assignee column does not exist, THEN THE System SHALL create it via database migration
3. WHEN Confirmation_Field is updated, THE System SHALL save the value to buyers.confirmation_to_assignee
4. WHEN Confirmation_Field is saved, THE System SHALL sync the value to the Google Spreadsheet (if sync is enabled)

### Requirement 7: システム隔離

**User Story:** As a システム管理者, I want to ensure this feature only affects the Buyer Management system, so that other systems remain unaffected.

#### Acceptance Criteria

1. THE System SHALL only modify files in the Buyer Management system
2. THE System SHALL NOT modify files in Seller Management, Property Management, Work Task Management, or Public Property Site systems
3. THE System SHALL use buyer_number as the primary key (NOT buyer_id)
4. THE System SHALL follow the project isolation rules defined in `.kiro/steering/system-isolation-rule.md`

