# Requirements Document - 売主詳細画面コンパクトレイアウト

## Introduction

売主詳細画面において、現在は多くの情報が縦に長く配置されており、スクロールが必要となっている。電話対応時などに素早く情報を確認できるよう、1画面に収まるコンパクトなレイアウトに改善する。

## Glossary

- **売主詳細画面**: 売主の基本情報、物件情報、買主リスト、活動履歴などを表示する画面
- **買主リスト**: 物件に関連する買主の一覧表示エリア
- **物件情報**: 物件の住所、種別、面積、築年などの詳細情報
- **コンパクトレイアウト**: スクロールを最小限にし、重要な情報を1画面に収める表示方式

## Requirements

### Requirement 1

**User Story:** As a 営業担当者, I want to view all critical seller information without scrolling, so that I can quickly reference information during phone calls.

#### Acceptance Criteria

1. WHEN the user opens the seller detail page THEN the system SHALL display all critical information (seller name, property address, buyer list, valuation amounts) within the initial viewport without scrolling
2. WHEN displaying the buyer list THEN the system SHALL allocate a fixed height area that displays approximately 5 rows regardless of the actual number of buyers
3. WHEN the buyer list contains more than 5 entries THEN the system SHALL provide vertical scrolling within the buyer list area only
4. WHEN displaying buyer information THEN the system SHALL show buyer name, inquiry date, viewing date, and purchase offer status in a compact format
5. WHEN the viewport height is less than 900px THEN the system SHALL adjust font sizes and spacing to maintain single-screen visibility

### Requirement 2

**User Story:** As a 営業担当者, I want property information displayed with smaller fonts, so that more information fits on one screen.

#### Acceptance Criteria

1. WHEN displaying property details THEN the system SHALL use font sizes 2-3px smaller than the current implementation
2. WHEN displaying property field labels THEN the system SHALL use 11-12px font size
3. WHEN displaying property field values THEN the system SHALL use 13-14px font size
4. WHEN reducing font sizes THEN the system SHALL maintain readability with appropriate line height and spacing
5. WHEN displaying property information THEN the system SHALL use a compact grid layout with minimal padding

### Requirement 3

**User Story:** As a 営業担当者, I want building area, structure, contract date, and settlement date information moved to the bottom of the property section, so that more frequently accessed information is visible first.

#### Acceptance Criteria

1. WHEN displaying property information THEN the system SHALL show address, property type, land area, and floor plan in the top section
2. WHEN displaying property information THEN the system SHALL show building area, build year, structure details in the bottom section
3. WHEN contract-related dates exist THEN the system SHALL display contract date and settlement date at the bottom of the property section
4. WHEN the user scrolls within the property section THEN the system SHALL maintain the visual hierarchy with top information always visible first
5. WHEN property information is incomplete THEN the system SHALL hide empty fields to save space

### Requirement 4

**User Story:** As a 営業担当者, I want the buyer list to show essential information at a glance, so that I can quickly assess buyer interest levels.

#### Acceptance Criteria

1. WHEN displaying each buyer in the list THEN the system SHALL show buyer name, inquiry date, viewing date, and purchase offer status in a single row
2. WHEN a buyer has a viewing date THEN the system SHALL display it in a prominent format (e.g., "内覧: 2025/01/15")
3. WHEN a buyer has submitted a purchase offer THEN the system SHALL display a clear indicator (e.g., "買付: あり")
4. WHEN displaying buyer confidence level THEN the system SHALL use color-coded badges (A: green, B: blue, C: orange)
5. WHEN the buyer list is empty THEN the system SHALL display a compact message "買主なし" without taking excessive vertical space

### Requirement 5

**User Story:** As a 営業担当者, I want the overall page layout optimized for information density, so that I can work efficiently without constant scrolling.

#### Acceptance Criteria

1. WHEN the page loads THEN the system SHALL use a multi-column layout for desktop viewports (>1200px width)
2. WHEN displaying sections THEN the system SHALL reduce vertical padding between sections from current values to 8-12px
3. WHEN displaying section headers THEN the system SHALL use compact typography (16-18px) instead of large headers
4. WHEN displaying form fields THEN the system SHALL use dense Material-UI variants with reduced padding
5. WHEN the user resizes the browser window THEN the system SHALL maintain the compact layout principles across different viewport sizes

### Requirement 6

**User Story:** As a 営業担当者, I want less frequently used information (activity logs, email history) to remain accessible but not take up primary screen space, so that I can focus on current transaction details.

#### Acceptance Criteria

1. WHEN the page loads THEN the system SHALL display activity logs and email history in collapsible sections that are initially collapsed
2. WHEN the user clicks on a collapsed section header THEN the system SHALL expand that section to show its contents
3. WHEN a section is expanded THEN the system SHALL provide smooth animation and maintain scroll position
4. WHEN multiple sections are expanded THEN the system SHALL allow the user to collapse them independently
5. WHEN sections are collapsed THEN the system SHALL show a count indicator (e.g., "追客ログ (15件)")

### Requirement 7

**User Story:** As a 営業担当者, I want the valuation information prominently displayed at the top, so that I can quickly reference pricing during conversations.

#### Acceptance Criteria

1. WHEN the page loads THEN the system SHALL display valuation amounts in the top section with large, readable fonts (18-20px)
2. WHEN multiple valuation amounts exist THEN the system SHALL display them in a horizontal layout (e.g., "3,500万円 ～ 3,800万円 ～ 4,000万円")
3. WHEN valuation amounts are not set THEN the system SHALL display a compact alert message
4. WHEN displaying the valuation section THEN the system SHALL include the valuation assignee name in small text below the amounts
5. WHEN the user needs to edit valuations THEN the system SHALL provide a link to the call mode page without taking up additional space

### Requirement 8

**User Story:** As a 営業担当者, I want the buyer list area to have a fixed, scrollable height, so that it doesn't push other important information off screen.

#### Acceptance Criteria

1. WHEN displaying the buyer list THEN the system SHALL set a maximum height of approximately 300-350px
2. WHEN the buyer list content exceeds the maximum height THEN the system SHALL enable vertical scrolling within the buyer list container only
3. WHEN scrolling within the buyer list THEN the system SHALL maintain the position of other page sections
4. WHEN the buyer list has fewer than 5 entries THEN the system SHALL adjust the container height to fit the content without excessive white space
5. WHEN the buyer list is scrollable THEN the system SHALL provide a visual indicator (e.g., fade effect at bottom) to show more content is available

### Requirement 9

**User Story:** As a 営業担当者, I want each information section to have its own edit and save buttons, so that I can edit specific sections without affecting other data.

#### Acceptance Criteria

1. WHEN viewing any editable section (seller info, property info, management info) THEN the system SHALL display an "編集" button in the section header
2. WHEN the user clicks the edit button THEN the system SHALL enable editing mode for that section only and change the button to "キャンセル"
3. WHEN a section is in edit mode THEN the system SHALL display a "保存" button alongside the cancel button
4. WHEN the user clicks save THEN the system SHALL submit only the changes from that specific section to the backend
5. WHEN the save is successful THEN the system SHALL exit edit mode, refresh the section data, and display a success message

### Requirement 10

**User Story:** As a 営業担当者, I want sections to start in view-only mode by default, so that I don't accidentally modify data.

#### Acceptance Criteria

1. WHEN the page loads THEN the system SHALL display all sections in read-only mode with data displayed as text
2. WHEN a section is in read-only mode THEN the system SHALL hide all input fields and show formatted text values instead
3. WHEN the user clicks the edit button for a section THEN the system SHALL replace text displays with appropriate input fields (TextField, Select, etc.)
4. WHEN the user clicks cancel in edit mode THEN the system SHALL revert all changes and return to read-only mode
5. WHEN multiple sections exist THEN the system SHALL allow only one section to be in edit mode at a time
