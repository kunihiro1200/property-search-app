# Requirements Document

## Introduction

物件詳細ページ（PropertyListingDetailPage）と買主詳細ページ（BuyerDetailPage）の物件情報カード（PropertyInfoCard）において、Google Mapsの埋め込み表示を追加し、値下げ履歴を改行して見やすく表示する機能改善。

## Glossary

- **物件詳細ページ (Property Listing Detail Page)**: 物件の詳細情報を表示するフルページ
- **買主詳細ページ (Buyer Detail Page)**: 買主の詳細情報を表示する画面
- **物件情報カード (Property Information Card)**: 物件の詳細情報を表示するカード形式のコンポーネント
- **Google Maps埋め込み (Google Maps Embed)**: Google Maps Embed APIを使用した地図表示
- **値下げ履歴 (Price Reduction History)**: 物件の価格変更履歴

## Requirements

### Requirement 1

**User Story:** As a user viewing property details, I want to see the property location on Google Maps using the existing map URL from the spreadsheet, so that I can quickly understand the geographical context and surrounding area.

#### Acceptance Criteria

1. WHEN a user views the property listing detail page THEN the system SHALL display the Google Map URL from the spreadsheet as an embedded iframe
2. WHEN a user views the buyer detail page with property context THEN the system SHALL display the Google Map iframe in the property information card
3. WHEN the google_map_url field is populated THEN the system SHALL render it as an embedded map iframe
4. WHEN the google_map_url field is empty THEN the system SHALL hide the map section or display a placeholder message
5. WHEN the map iframe is displayed THEN the system SHALL set appropriate dimensions for optimal viewing

### Requirement 2

**User Story:** As a user viewing property information, I want the price reduction history to be displayed with line breaks, so that I can easily read and understand each price change event.

#### Acceptance Criteria

1. WHEN the property information card displays price reduction history THEN the system SHALL format each entry on a separate line
2. WHEN multiple price reduction entries exist THEN the system SHALL separate them with line breaks for readability
3. WHEN the price reduction history field is empty THEN the system SHALL display a placeholder or hide the field
4. WHEN displaying price reduction history THEN the system SHALL preserve the chronological order of entries
5. WHEN the price reduction history text contains newline characters THEN the system SHALL render them as visual line breaks in the UI

### Requirement 3

**User Story:** As a developer, I want to display the Google Maps URL from the spreadsheet safely, so that the map displays correctly without security concerns.

#### Acceptance Criteria

1. WHEN the map iframe is rendered THEN the system SHALL apply appropriate security attributes (allow, referrerpolicy)
2. WHEN the google_map_url is invalid or malformed THEN the system SHALL handle the error gracefully and display a fallback message
3. WHEN the iframe loads THEN the system SHALL allow necessary permissions for map interaction
4. WHEN the map is displayed THEN the system SHALL ensure responsive sizing across different screen sizes
5. WHEN the google_map_url is a valid Google Maps URL THEN the system SHALL render it without modification
