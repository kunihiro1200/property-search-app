# Requirements Document

## Introduction

物件詳細画面（PropertyListingDetailPage）のレイアウトを最適化し、重要な情報を優先的に表示し、画面のスクロール量を削減する。情報の優先順位に基づいて各セクションを再配置し、セクションの幅を適切に調整し、編集モードを明示的にすることで、ユーザーが効率的に物件情報を確認・編集できるようにする。

## Glossary

- **PropertyListingDetailPage**: 物件詳細を表示するページコンポーネント
- **買主リスト (Buyer List)**: 物件に関心を持つ買主の一覧
- **基本情報セクション (Basic Information Section)**: 物件の主要な情報を表示するセクション
- **所有者の状況セクション (Owner Situation Section)**: 売主の状況に関する情報を表示するセクション
- **その他情報セクション (Other Information Section)**: 追加の物件情報を表示するセクション
- **物件情報セクション (Property Details Section)**: 物件の物理的な詳細情報を表示するセクション
- **価格セクション (Price Section)**: 売買価格、売出価格、値下げ履歴を表示するセクション
- **編集モード (Edit Mode)**: ユーザーが明示的に編集ボタンを押すことで有効化される編集可能な状態

## Requirements

### Requirement 1

**User Story:** As a user, I want to see the most important property information at the top of the detail page, so that I can quickly assess the property's value and status.

#### Acceptance Criteria

1. WHEN the property detail page loads THEN the system SHALL display the price reduction history and sale price at the top of the basic information section
2. WHEN the basic information section is rendered THEN the system SHALL display special notes and memo fields immediately below the price information
3. WHEN displaying the basic information section THEN the system SHALL include the current status field from the owner situation section
4. WHEN the other information section contains non-empty fields THEN the system SHALL display those fields within the basic information section
5. WHEN the other information section contains only empty fields THEN the system SHALL hide those fields from view until edit mode is activated

### Requirement 2

**User Story:** As a user, I want the buyer list to be compact and show essential information, so that I can quickly scan interested buyers without excessive scrolling.

#### Acceptance Criteria

1. WHEN the buyer list contains more than 5 entries THEN the system SHALL limit the initial display to 5 rows with an expand option
2. WHEN displaying each buyer entry THEN the system SHALL include the reception date field
3. WHEN displaying each buyer entry THEN the system SHALL include the viewing date field
4. WHEN displaying each buyer entry THEN the system SHALL include the purchase offer status indicator
5. WHEN the user clicks the expand option THEN the system SHALL reveal all buyer entries

### Requirement 3

**User Story:** As a user, I want less important property details moved to the bottom of the page, so that I can focus on critical information first.

#### Acceptance Criteria

1. WHEN rendering the property detail page THEN the system SHALL move land area to the property details section at the bottom
2. WHEN rendering the property detail page THEN the system SHALL move building area to the property details section at the bottom
3. WHEN rendering the property detail page THEN the system SHALL move construction date to the property details section at the bottom
4. WHEN rendering the property detail page THEN the system SHALL move structure information to the property details section at the bottom
5. WHEN rendering the property detail page THEN the system SHALL move floor plan to the property details section at the bottom
6. WHEN rendering the property detail page THEN the system SHALL move contract date to the bottom section
7. WHEN rendering the property detail page THEN the system SHALL move settlement date to the bottom section

### Requirement 4

**User Story:** As a user, I want the map displayed as a URL link instead of an embedded image, so that the page loads faster and requires less scrolling.

#### Acceptance Criteria

1. WHEN the property has a Google Maps URL THEN the system SHALL display it as a clickable text link
2. WHEN the property has a Google Maps URL THEN the system SHALL NOT display an embedded map image
3. WHEN the user clicks the map URL link THEN the system SHALL open the map in a new browser tab

### Requirement 5

**User Story:** As a user, I want the page layout to minimize scrolling, so that I can view all critical information without excessive navigation.

#### Acceptance Criteria

1. WHEN the property detail page is rendered THEN the system SHALL organize sections in priority order from top to bottom
2. WHEN the property detail page is rendered THEN the system SHALL reduce vertical spacing between sections
3. WHEN the property detail page is rendered THEN the system SHALL use compact component layouts where appropriate
4. WHEN measuring the page height THEN the system SHALL reduce the total scrollable height by at least 30% compared to the current layout

### Requirement 6

**User Story:** As a user, I want the price section and buyer list to have appropriate widths, so that I can view all property information without unnecessary horizontal space.

#### Acceptance Criteria

1. WHEN the price section is displayed THEN the system SHALL limit the section width to approximately 33% of the available container width
2. WHEN the buyer list is displayed THEN the system SHALL limit the list width to approximately 50% of the right column width
3. WHEN the price section is rendered THEN the system SHALL maintain readability with appropriate padding and spacing
4. WHEN the buyer list is rendered THEN the system SHALL maintain readability with appropriate padding and spacing
5. WHEN the page is viewed on different screen sizes THEN the system SHALL maintain proportional width constraints

### Requirement 7

**User Story:** As a user, I want to explicitly enable edit mode before making changes, so that I can prevent accidental modifications to property data.

#### Acceptance Criteria

1. WHEN the property detail page loads THEN the system SHALL display all sections in read-only mode by default
2. WHEN a user clicks an edit button THEN the system SHALL enable edit mode for the corresponding section
3. WHEN edit mode is enabled for a section THEN the system SHALL display input fields in place of read-only text
4. WHEN a user saves changes THEN the system SHALL persist the data and return to read-only mode
5. WHEN a user cancels editing THEN the system SHALL discard changes and return to read-only mode without saving

### Requirement 8

**User Story:** As a user, I want the special notes and memo section to be more prominent with larger text, so that I can easily read important property remarks.

#### Acceptance Criteria

1. WHEN the special notes field is displayed THEN the system SHALL render the text with a font size of at least 16px
2. WHEN the memo field is displayed THEN the system SHALL render the text with a font size of at least 16px
3. WHEN the special notes and memo section is rendered THEN the system SHALL occupy approximately 67% of the available container width
4. WHEN the special notes field contains text THEN the system SHALL display it with adequate line height for readability
5. WHEN the memo field contains text THEN the system SHALL display it with adequate line height for readability

### Requirement 9

**User Story:** As a user, I want the price section to be smaller and the notes section to be larger, so that I can focus more on important remarks while still seeing price information.

#### Acceptance Criteria

1. WHEN the price section is displayed THEN the system SHALL limit the section width to approximately 33% of the available container width
2. WHEN the special notes and memo section is displayed THEN the system SHALL expand to occupy approximately 67% of the available container width
3. WHEN the special notes field is displayed THEN the system SHALL render the text with a font size of at least 18px
4. WHEN the memo field is displayed THEN the system SHALL render the text with a font size of at least 18px
5. WHEN both sections are rendered THEN the system SHALL display them side by side in the same row

### Requirement 10

**User Story:** As a user, I want the owner situation section removed from the property detail page, so that I can avoid redundant information that is already shown in the seller/buyer information section.

#### Acceptance Criteria

1. WHEN the property detail page is rendered THEN the system SHALL NOT display the owner situation section
2. WHEN the property detail page is rendered THEN the system SHALL display owner-related information only in the seller/buyer information section
3. WHEN the current status field is needed THEN the system SHALL display it in the basic information section instead of a separate owner situation section
