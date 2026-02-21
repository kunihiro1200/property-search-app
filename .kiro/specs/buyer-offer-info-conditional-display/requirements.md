# Requirements Document

## Introduction

買主詳細ページの内覧結果ページ（BuyerViewingResultPage）における「買付情報」セクションの表示条件と機能を改善します。現在は常に表示されていますが、「★最新状況」フィールドに「買」という文字が含まれる場合のみ表示し、Google Chat への自動送信機能を実装します。

## Glossary

- **Buyer**: 買主（不動産購入希望者）
- **Property**: 物件（不動産物件）
- **Viewing_Result_Page**: 内覧結果ページ（買主詳細ページの一部）
- **Offer_Info_Section**: 買付情報セクション（買付に関する情報を表示・入力するUI領域）
- **Latest_Status**: ★最新状況（買主の現在の状態を示すフィールド）
- **Google_Chat_API**: Google Chat メッセージ送信API
- **ATBB_Status**: atbb_status（物件の媒介契約種別を含むステータス）
- **Broker_Inquiry**: 業者問合せ（買主が業者経由での問い合わせかどうかを示すフィールド）

## Requirements

### Requirement 1: 買付情報セクションの条件付き表示

**User Story:** As a 営業担当者, I want to see the 買付情報セクション only when relevant, so that I can focus on active offer situations.

#### Acceptance Criteria

1. WHEN Latest_Status contains the character "買", THEN THE Viewing_Result_Page SHALL display the Offer_Info_Section
2. WHEN Latest_Status contains "買付外れました", THEN THE Viewing_Result_Page SHALL hide the Offer_Info_Section
3. WHEN Latest_Status does not contain "買", THEN THE Viewing_Result_Page SHALL hide the Offer_Info_Section
4. WHEN the Offer_Info_Section is hidden, THEN THE Viewing_Result_Page SHALL not render any offer-related input fields

### Requirement 2: 買付情報フィールドの表示

**User Story:** As a 営業担当者, I want to input offer details and send them to the team, so that everyone is informed about the offer status.

#### Acceptance Criteria

1. WHEN the Offer_Info_Section is displayed, THEN THE System SHALL show a text input field for 買付コメント（任意）
2. WHEN the Offer_Info_Section is displayed, THEN THE System SHALL show a button labeled "買付チャット送信"
3. THE System SHALL allow the 買付コメント field to be empty
4. THE System SHALL require the 買付チャット送信 button to be clicked before saving

### Requirement 3: Google Chat メッセージ送信

**User Story:** As a 営業担当者, I want to send offer information to Google Chat, so that the team is immediately notified.

#### Acceptance Criteria

1. WHEN the 買付チャット送信 button is clicked, THEN THE System SHALL send a POST request to the Google_Chat_API endpoint
2. THE System SHALL use the endpoint URL "https://chat.googleapis.com/v1/spaces/AAAA6iEDkiU/messages?key=AIzaSyDdI0hCZtE6vySjMm-WEfRq3CPzqKqqsHI&token=azlyf21pENCpLLUdJPjnRNXOzsIAP550xebOMVxYRMQ"
3. WHEN the API request succeeds, THEN THE System SHALL display a success message to the user
4. WHEN the API request fails, THEN THE System SHALL display an error message with details
5. WHEN the 買付チャット送信 button has not been clicked, THEN THE System SHALL prevent saving the form

### Requirement 4: チャットメッセージ内容の動的生成

**User Story:** As a 営業担当者, I want the chat message to include relevant property and buyer details, so that the team has all necessary information.

#### Acceptance Criteria

1. WHEN Broker_Inquiry is not "業者問合せ" AND ATBB_Status contains "専任", THEN THE System SHALL generate a message with "⚠atbbの業者向けを非公開お願いします！！"
2. WHEN Broker_Inquiry is not "業者問合せ" AND ATBB_Status contains "一般", THEN THE System SHALL generate a message with "⚠一般媒介なので、atbbは公開のままにしてください！！"
3. WHEN Broker_Inquiry is "業者問合せ" AND ATBB_Status contains "専任", THEN THE System SHALL generate a message with "⚠atbbの業者向けを非公開お願いします！！" and include "他社名：[other_company_name]"
4. WHEN Broker_Inquiry is "業者問合せ" AND ATBB_Status contains "一般", THEN THE System SHALL generate a message with "⚠一般媒介なので、atbbは公開のままにしてください！！" and include "他社名：[other_company_name]"
5. FOR ALL message patterns, THE System SHALL include buyer_number, latest_status, campaign_eligible, offer_comment, property_number, display_address, price, sales_assignee, and follow_up_assignee

### Requirement 5: データソースの統合

**User Story:** As a システム, I want to retrieve all necessary data from the database, so that the message contains accurate information.

#### Acceptance Criteria

1. THE System SHALL retrieve buyer_number from buyers.buyer_number
2. THE System SHALL retrieve latest_status from buyers.latest_status
3. THE System SHALL retrieve campaign_eligible from buyers table
4. THE System SHALL retrieve offer_comment from buyers table
5. THE System SHALL retrieve property_number from property_listings.property_number
6. THE System SHALL retrieve display_address from property_listings.display_address
7. THE System SHALL retrieve price from property_listings.price
8. THE System SHALL retrieve sales_assignee from property_listings.sales_assignee
9. THE System SHALL retrieve follow_up_assignee from buyers.follow_up_assignee
10. THE System SHALL retrieve broker_inquiry from buyers table
11. THE System SHALL retrieve other_company_name from buyers table
12. THE System SHALL retrieve atbb_status from property_listings.atbb_status

### Requirement 6: エラーハンドリング

**User Story:** As a 営業担当者, I want to be informed when something goes wrong, so that I can take appropriate action.

#### Acceptance Criteria

1. WHEN required buyer data is missing, THEN THE System SHALL display an error message and prevent message sending
2. WHEN required property data is missing, THEN THE System SHALL display an error message and prevent message sending
3. WHEN the Google_Chat_API returns an error, THEN THE System SHALL display the error message to the user
4. WHEN network connectivity fails, THEN THE System SHALL display a network error message
5. THE System SHALL log all errors for debugging purposes
