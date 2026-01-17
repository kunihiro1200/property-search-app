# Requirements Document

## Introduction

物件リスト買主表示機能は、物件リストページ内で各物件に紐づく買主リストを表示する機能である。物件番号（property_number）をキーとして、その物件に問い合わせてきた買主の一覧を表示し、買主の詳細情報へのアクセスを提供する。既存の買主リスト管理機能（buyer-list-management）と物件リスト機能を統合し、物件視点から買主情報を確認できるようにする。

## Glossary

- **Property_Listing_System**: 物件リストを管理するシステムコンポーネント
- **Buyer_Display_Component**: 物件リスト内で買主情報を表示するUIコンポーネント
- **Property_Number**: 物件を一意に識別する番号（物件リストと買主リストの紐づけキー）
- **Buyer_Linkage_Service**: 物件番号に基づいて買主データを取得するサービス
- **Buyer_List**: 特定の物件に紐づく買主のリスト

## Requirements

### Requirement 1

**User Story:** As a user, I want to see a list of buyers linked to each property in the property list page, so that I can understand which buyers are interested in each property.

#### Acceptance Criteria

1. WHEN a user views the property list page THEN the Property_Listing_System SHALL display a buyer count indicator for each property that has linked buyers
2. WHEN a property has linked buyers THEN the Buyer_Display_Component SHALL show the number of buyers interested in that property
3. WHEN a property has no linked buyers THEN the Property_Listing_System SHALL display "0" or hide the buyer indicator
4. WHEN displaying buyer counts THEN the Property_Listing_System SHALL query buyers by property_number efficiently

### Requirement 2

**User Story:** As a user, I want to expand and view the buyer list for a specific property, so that I can see detailed information about interested buyers.

#### Acceptance Criteria

1. WHEN a user clicks on a property's buyer indicator THEN the Buyer_Display_Component SHALL expand to show the list of linked buyers
2. WHEN displaying the buyer list THEN the Buyer_Display_Component SHALL show key buyer information including buyer_number, name, phone_number, latest_status, and inquiry_confidence
3. WHEN the buyer list is expanded THEN the Buyer_Display_Component SHALL display buyers sorted by reception_date in descending order
4. WHEN a user clicks outside the expanded buyer list THEN the Buyer_Display_Component SHALL collapse the buyer list

### Requirement 3

**User Story:** As a user, I want to navigate to buyer detail pages from the property list, so that I can access complete buyer information.

#### Acceptance Criteria

1. WHEN a user clicks on a buyer in the expanded list THEN the Property_Listing_System SHALL navigate to the buyer detail page
2. WHEN navigating to buyer detail THEN the Property_Listing_System SHALL pass the buyer_id as a URL parameter
3. WHEN the buyer detail page loads THEN the Property_Listing_System SHALL display all buyer information including the linked property_number

### Requirement 4

**User Story:** As a user, I want to see buyer status indicators in the property list, so that I can quickly identify high-priority buyers.

#### Acceptance Criteria

1. WHEN displaying buyers in the expanded list THEN the Buyer_Display_Component SHALL show visual indicators for inquiry_confidence levels
2. WHEN a buyer has high confidence (A or S rank) THEN the Buyer_Display_Component SHALL highlight the buyer with a distinct color or icon
3. WHEN displaying buyer status THEN the Buyer_Display_Component SHALL show the latest_status field value
4. WHEN a buyer has a next_call_date THEN the Buyer_Display_Component SHALL display the date prominently

### Requirement 5

**User Story:** As a user, I want the buyer list to load efficiently, so that the property list page remains responsive.

#### Acceptance Criteria

1. WHEN loading the property list page THEN the Buyer_Linkage_Service SHALL fetch buyer counts for all visible properties in a single batch query
2. WHEN a user expands a buyer list THEN the Buyer_Linkage_Service SHALL fetch detailed buyer data only for that specific property
3. WHEN buyer data is fetched THEN the Buyer_Linkage_Service SHALL cache the results for 5 minutes to reduce database queries
4. WHEN the property list is paginated THEN the Buyer_Linkage_Service SHALL only fetch buyer counts for properties on the current page

### Requirement 6

**User Story:** As a user, I want to filter properties by buyer interest, so that I can find properties with active buyer inquiries.

#### Acceptance Criteria

1. WHEN a user applies a "has buyers" filter THEN the Property_Listing_System SHALL display only properties with at least one linked buyer
2. WHEN a user applies a "high confidence buyers" filter THEN the Property_Listing_System SHALL display only properties with buyers having inquiry_confidence of A or S rank
3. WHEN filters are applied THEN the Property_Listing_System SHALL update the property list and buyer counts accordingly

### Requirement 7

**User Story:** As a user, I want to see buyer contact information in the property list, so that I can quickly reach out to interested buyers.

#### Acceptance Criteria

1. WHEN displaying buyers in the expanded list THEN the Buyer_Display_Component SHALL show phone_number and email fields
2. WHEN a phone_number is displayed THEN the Buyer_Display_Component SHALL format it as a clickable tel: link
3. WHEN an email is displayed THEN the Buyer_Display_Component SHALL format it as a clickable mailto: link
4. WHEN contact information is missing THEN the Buyer_Display_Component SHALL display "未登録" (not registered)

### Requirement 8

**User Story:** As a user, I want to see the buyer inquiry timeline, so that I can understand the history of buyer interest in a property.

#### Acceptance Criteria

1. WHEN displaying buyers in the expanded list THEN the Buyer_Display_Component SHALL show reception_date for each buyer
2. WHEN displaying buyers THEN the Buyer_Display_Component SHALL show latest_viewing_date if available
3. WHEN multiple buyers exist THEN the Buyer_Display_Component SHALL sort buyers by reception_date with most recent first
4. WHEN a buyer has multiple inquiry dates THEN the Buyer_Display_Component SHALL display the most recent date prominently
