# Requirements Document - 物件詳細フルページ表示

## Introduction

お客様からの急な電話対応時に、物件詳細を確認しながら買主情報を入力できるよう、物件詳細をブラウザ全体で表示する専用ページを作成する。現在のモーダル表示では、新規買主作成時に物件情報が見えなくなり、よく聞かれる項目（内覧前伝達事項、固定資産税等）を確認しながらの入力が困難である。

## Glossary

- **System**: 売主管理システム
- **User**: 不動産営業担当者
- **Property Listing**: 物件リスト情報
- **Buyer**: 買主
- **Modal**: モーダルダイアログ（現在の実装）
- **Full Page**: ブラウザ全体を使用した専用ページ

## Requirements

### Requirement 1

**User Story:** As a User, I want to view property details in a full browser page, so that I can see all information while handling customer phone calls.

#### Acceptance Criteria

1. WHEN a user clicks on a property from the property list THEN the system SHALL navigate to a dedicated full-page view at `/property-listings/:propertyNumber`
2. WHEN the full-page view loads THEN the system SHALL display all property information without using a modal dialog
3. WHEN viewing the full-page THEN the system SHALL provide a back button to return to the property list
4. WHEN the user navigates to the full-page view THEN the system SHALL preserve the previous page's filter and pagination state
5. WHEN the user uses browser back button THEN the system SHALL return to the property list with preserved state

### Requirement 2

**User Story:** As a User, I want to see frequently asked information prominently displayed, so that I can quickly answer customer questions during phone calls.

#### Acceptance Criteria

1. WHEN viewing property details THEN the system SHALL display a "Frequently Asked" section at the top
2. WHEN displaying frequently asked information THEN the system SHALL include 内覧前伝達事項 (pre-viewing notes)
3. WHEN displaying frequently asked information THEN the system SHALL include 固定資産税 (property tax)
4. WHEN displaying frequently asked information THEN the system SHALL include 管理費 (management fee)
5. WHEN displaying frequently asked information THEN the system SHALL include 積立金 (reserve fund)
6. WHEN displaying frequently asked information THEN the system SHALL include 駐車場 (parking information)
7. WHEN displaying frequently asked information THEN the system SHALL include 引渡し (delivery information)
8. WHEN displaying frequently asked information THEN the system SHALL use large, readable fonts for quick reference

### Requirement 3

**User Story:** As a User, I want to create a new buyer while viewing property details, so that I can input customer information during phone calls without losing sight of property information.

#### Acceptance Criteria

1. WHEN viewing property details THEN the system SHALL display a "新規買主作成" (Create New Buyer) button
2. WHEN the user clicks "新規買主作成" THEN the system SHALL open the buyer creation form in a side panel or split view
3. WHEN the buyer creation form is open THEN the system SHALL keep property details visible on the same page
4. WHEN creating a new buyer THEN the system SHALL automatically populate the property number field
5. WHEN the user saves a new buyer THEN the system SHALL refresh the buyer list without closing the property details page
6. WHEN the user cancels buyer creation THEN the system SHALL close the form and return focus to property details

### Requirement 4

**User Story:** As a User, I want to see the buyer list alongside property details, so that I can quickly add customers to the list during phone calls.

#### Acceptance Criteria

1. WHEN viewing property details THEN the system SHALL display the buyer list in a dedicated section
2. WHEN displaying the buyer list THEN the system SHALL show buyer name, confidence level, and contact information
3. WHEN the buyer list is empty THEN the system SHALL display a message encouraging the user to add buyers
4. WHEN a new buyer is added THEN the system SHALL update the buyer list immediately
5. WHEN the user clicks on a buyer THEN the system SHALL navigate to the buyer detail page in a new tab

### Requirement 5

**User Story:** As a User, I want to edit property information inline, so that I can update details quickly during phone calls.

#### Acceptance Criteria

1. WHEN viewing property details THEN the system SHALL display editable fields for all property information
2. WHEN the user modifies a field THEN the system SHALL enable a "保存" (Save) button
3. WHEN the user clicks "保存" THEN the system SHALL save changes to the database
4. WHEN save is successful THEN the system SHALL display a success message
5. WHEN save fails THEN the system SHALL display an error message and preserve user input

### Requirement 6

**User Story:** As a User, I want property information organized in logical sections, so that I can find information quickly during phone calls.

#### Acceptance Criteria

1. WHEN viewing property details THEN the system SHALL organize information into sections: よく聞かれる項目, 基本情報, 売主情報, 買主リスト, 手数料・価格, 物件詳細
2. WHEN displaying sections THEN the system SHALL use clear headings and visual separation
3. WHEN a section contains many fields THEN the system SHALL use a grid layout for efficient space usage
4. WHEN displaying dates THEN the system SHALL format them in Japanese format (YYYY年MM月DD日)
5. WHEN displaying prices THEN the system SHALL format them with commas and 万円 suffix

### Requirement 7

**User Story:** As a User, I want to access property details from multiple entry points, so that I can view information from different workflows.

#### Acceptance Criteria

1. WHEN a user clicks a property row in PropertyListingsPage THEN the system SHALL navigate to the full-page view
2. WHEN a user accesses a property via direct URL THEN the system SHALL load the full-page view
3. WHEN a user accesses a property from search results THEN the system SHALL navigate to the full-page view
4. WHEN a user accesses a property from buyer detail page THEN the system SHALL navigate to the full-page view
5. WHEN navigation occurs THEN the system SHALL maintain consistent URL structure `/property-listings/:propertyNumber`

### Requirement 8

**User Story:** As a User, I want responsive layout on different screen sizes, so that I can use the system on various devices.

#### Acceptance Criteria

1. WHEN viewing on desktop (>1200px) THEN the system SHALL display property details and buyer form side-by-side
2. WHEN viewing on tablet (768px-1200px) THEN the system SHALL stack sections vertically with full width
3. WHEN viewing on mobile (<768px) THEN the system SHALL display single column layout with collapsible sections
4. WHEN the buyer creation form is open on mobile THEN the system SHALL display it as a full-screen overlay
5. WHEN resizing the browser THEN the system SHALL adjust layout smoothly without data loss
