# Requirements Document

## Introduction

物件詳細モーダル内買主タブ機能は、PropertyListingDetailModal内に新しい「買主」タブを追加し、その物件に問い合わせてきた買主の一覧をテーブル形式で表示する機能である。物件番号（property_number）をキーとして買主データを取得し、買主行をクリックすると買主詳細ページに遷移できるようにする。

## Glossary

- **Property_Detail_Modal**: 物件詳細情報を表示するモーダルダイアログ
- **Buyer_Tab**: 物件詳細モーダル内の買主リスト表示タブ
- **Buyer_Table**: 買主情報をテーブル形式で表示するコンポーネント
- **Property_Number**: 物件を一意に識別する番号（買主との紐づけキー）
- **Buyer_Linkage_Service**: 物件番号に基づいて買主データを取得するサービス（既存）
- **Buyer_Creation_Form**: 新規買主を作成するフォーム（既存のNewBuyerPage）
- **Inquiry_Property_Number**: 買主が問い合わせた物件番号（buyersテーブルのproperty_numberカラム）

## Requirements

### Requirement 1

**User Story:** As a user, I want to see a dedicated "Buyers" tab in the property detail modal, so that I can view all buyers interested in that property in one place.

#### Acceptance Criteria

1. WHEN a user opens the property detail modal THEN the Property_Detail_Modal SHALL display a "買主" tab alongside existing tabs
2. WHEN the property has linked buyers THEN the Buyer_Tab SHALL show the buyer count in the tab label (e.g., "買主 (3)")
3. WHEN the property has no linked buyers THEN the Buyer_Tab SHALL show "買主 (0)" in the tab label
4. WHEN a user clicks the Buyer_Tab THEN the Property_Detail_Modal SHALL display the buyer list table

### Requirement 2

**User Story:** As a user, I want to view buyer information in a table format within the property detail modal, so that I can easily scan and compare multiple buyers.

#### Acceptance Criteria

1. WHEN the Buyer_Tab is active THEN the Buyer_Table SHALL display buyers in a table format with columns for key information
2. WHEN displaying the buyer table THEN the Buyer_Table SHALL show columns: 買主番号, 氏名, 確度, ステータス, 受付日, 次電日, 連絡先
3. WHEN the buyer table is displayed THEN the Buyer_Table SHALL sort buyers by reception_date in descending order (most recent first)
4. WHEN the buyer table has no data THEN the Buyer_Table SHALL display "この物件への問い合わせはまだありません"

### Requirement 3

**User Story:** As a user, I want to click on a buyer row to navigate to the buyer detail page, so that I can access complete buyer information.

#### Acceptance Criteria

1. WHEN a user clicks on a buyer row in the table THEN the Property_Detail_Modal SHALL navigate to the buyer detail page
2. WHEN navigating to buyer detail THEN the Property_Detail_Modal SHALL pass the buyer_id as a URL parameter
3. WHEN navigating to buyer detail THEN the Property_Detail_Modal SHALL close the modal
4. WHEN a buyer row is hovered THEN the Buyer_Table SHALL show visual feedback (hover effect)

### Requirement 4

**User Story:** As a user, I want to see visual indicators for high-priority buyers in the table, so that I can quickly identify important leads.

#### Acceptance Criteria

1. WHEN displaying buyers in the table THEN the Buyer_Table SHALL show inquiry_confidence values with color coding
2. WHEN a buyer has high confidence (A or S rank) THEN the Buyer_Table SHALL highlight the confidence badge with red color
3. WHEN a buyer has next_call_date THEN the Buyer_Table SHALL display the date in a prominent color
4. WHEN a buyer has no next_call_date THEN the Buyer_Table SHALL display "-" in the next_call_date column

### Requirement 5

**User Story:** As a user, I want to see contact information in the buyer table, so that I can quickly reach out to buyers.

#### Acceptance Criteria

1. WHEN displaying buyers in the table THEN the Buyer_Table SHALL show phone_number and email in the 連絡先 column
2. WHEN a phone_number is displayed THEN the Buyer_Table SHALL format it as a clickable tel: link
3. WHEN an email is displayed THEN the Buyer_Table SHALL format it as a clickable mailto: link
4. WHEN contact information is missing THEN the Buyer_Table SHALL display "未登録"
5. WHEN clicking contact links THEN the Buyer_Table SHALL prevent row click navigation

### Requirement 6

**User Story:** As a user, I want the buyer data to load efficiently when I open the buyer tab, so that the modal remains responsive.

#### Acceptance Criteria

1. WHEN the Buyer_Tab is first activated THEN the Property_Detail_Modal SHALL fetch buyer data for that property
2. WHEN buyer data is already loaded THEN the Property_Detail_Modal SHALL not refetch the data
3. WHEN buyer data is loading THEN the Buyer_Table SHALL display a loading indicator
4. WHEN buyer data fetch fails THEN the Buyer_Table SHALL display an error message with retry option

### Requirement 7

**User Story:** As a user, I want the "売主・買主" tab to be updated or removed, so that the interface is not confusing with duplicate buyer information.

#### Acceptance Criteria

1. WHEN the Buyer_Tab is implemented THEN the Property_Detail_Modal MAY remove buyer information from the "売主・買主" tab
2. WHEN buyer information is removed from "売主・買主" tab THEN the tab SHALL be renamed to "売主"
3. WHEN the "売主・買主" tab is renamed THEN the Property_Detail_Modal SHALL only display seller information in that tab

### Requirement 8

**User Story:** As a user, I want to see the buyer table with proper formatting and spacing, so that the information is easy to read.

#### Acceptance Criteria

1. WHEN displaying the buyer table THEN the Buyer_Table SHALL use appropriate column widths for each field
2. WHEN the table has many rows THEN the Buyer_Table SHALL be scrollable within the modal
3. WHEN displaying dates THEN the Buyer_Table SHALL format dates in Japanese format (YYYY/MM/DD)
4. WHEN displaying the table THEN the Buyer_Table SHALL use consistent typography and spacing

### Requirement 9

**User Story:** As a user, I want to create a new buyer from the property detail modal with the property information pre-filled, so that I can quickly register buyers who inquired about that specific property.

#### Acceptance Criteria

1. WHEN the Buyer_Tab is displayed THEN the Buyer_Tab SHALL show a "新規作成" button at the top of the buyer table
2. WHEN a user clicks the "新規作成" button THEN the Property_Detail_Modal SHALL navigate to the new buyer creation page
3. WHEN navigating to the new buyer creation page THEN the Property_Detail_Modal SHALL pass the property_number as a URL parameter
4. WHEN the new buyer creation page loads with a property_number parameter THEN the Buyer_Creation_Form SHALL pre-fill the inquiry_property_number field
5. WHEN the inquiry_property_number field is pre-filled THEN the Buyer_Creation_Form SHALL display the property information (address, property type) as read-only reference
6. WHEN navigating to the new buyer creation page THEN the Property_Detail_Modal SHALL close the modal
