# Requirements Document

## Introduction

物件詳細ページから買主案件をクリックした際の買主詳細画面において、詳細な物件情報カードを左上に配置し、ユーザーが物件の全情報を素早く確認できるようにする機能改善。現在は簡易的なテーブル表示のみだが、画像で示されたような詳細情報（atbb成約済み/非公開、配信日、所在地、住居表示、種別、担当名、価格、月々ローン支払い、買付有無、値下げ履歴、理由、Suumo URL、確済など）を含む物件情報カードを表示する。

## Glossary

- **買主詳細画面 (Buyer Detail Page)**: 買主の詳細情報を表示する画面
- **物件情報カード (Property Information Card)**: 物件の詳細情報を表示するカード形式のコンポーネント
- **案件 (Case/Buyer)**: 物件に紐づく買主情報
- **物件詳細ページ (Property Detail Page)**: 物件の詳細情報を表示するページ
- **紐づく物件 (Linked Properties)**: 買主に関連付けられた物件のリスト

## Requirements

### Requirement 1

**User Story:** As a user viewing a buyer from the property detail page, I want to see a detailed property information card in the top-left position of the buyer detail screen, so that I can quickly reference all property details while reviewing buyer information.

#### Acceptance Criteria

1. WHEN a user clicks on a buyer case from the property detail page THEN the system SHALL navigate to the buyer detail page with a detailed property information card displayed in the top-left position
2. WHEN the buyer detail page loads from a property detail page context THEN the system SHALL display the property information card including atbb status, distribution date, address, display address, property type, assignee name, price, monthly loan payment, offer status, price reduction history, reason, Suumo URL, and confirmation status
3. WHEN the property information card is displayed THEN the system SHALL position it in the top-left corner above all other content sections
4. WHEN a user views the buyer detail page THEN the system SHALL maintain the current layout for other sections (buyer information sections) below the property card
5. WHEN a user accesses the buyer detail page directly (not from property detail page) THEN the system SHALL display the existing table format for linked properties

### Requirement 2

**User Story:** As a user, I want the property information card to display all relevant property details in a structured format, so that I can quickly scan and understand the property context.

#### Acceptance Criteria

1. WHEN the property information card is displayed THEN the system SHALL use a card design with clear visual boundaries and organized field layout
2. WHEN displaying property information THEN the system SHALL show all fields including atbb status, distribution date, address, display address, property type, assignee, price, monthly loan payment, offer status, price reduction history, reason, Suumo URL, and confirmation status
3. WHEN the property information card is displayed THEN the system SHALL include a clickable link to navigate to the full property detail page
4. WHEN the Suumo URL field is populated THEN the system SHALL display it as a clickable external link with an icon
5. WHEN the layout is rendered THEN the system SHALL ensure the property information card is responsive and adapts to different screen sizes

### Requirement 3

**User Story:** As a developer, I want to distinguish between navigation contexts (from property detail vs. direct access), so that the system can render the appropriate property display format based on the user's journey.

#### Acceptance Criteria

1. WHEN a user navigates from property detail page to buyer detail THEN the system SHALL pass the property ID via route parameters or state
2. WHEN the buyer detail page component loads THEN the system SHALL detect whether a property ID context is available
3. WHEN property ID context is available THEN the system SHALL fetch full property details and render the detailed property information card in the top-left position
4. WHEN property ID context is not available THEN the system SHALL render the existing table format for linked properties
5. WHEN the component unmounts THEN the system SHALL clean up any context-specific state
