# Requirements Document

## Introduction

物件詳細ページの包括的なレイアウト再設計を行います。価格情報セクションの縮小、特記・備忘録の拡大、ヘッダー情報の追加、セクション順序の最適化、地図・URL情報の改善、および複数セクションへの編集機能追加を実施します。

## Glossary

- **System**: 物件管理システムのフロントエンドアプリケーション
- **Property Detail Page**: 物件詳細ページ
- **Price Section**: 価格情報セクション
- **Notes Section**: 特記・備忘録セクション
- **Header**: ページ上部のヘッダー領域
- **Editable Section**: 編集可能なセクション
- **Google Map URL**: GoogleマップのURL
- **SUUMO URL**: SUUMOサイトのURL
- **Storage URL**: 格納先URL(物件依頼の中にある)

## Requirements

### Requirement 1

**User Story:** As a user, I want to see key property information in the header, so that I can quickly identify the property without scrolling.

#### Acceptance Criteria

1. WHEN a user views the property detail page THEN the system SHALL display the property address in the header
2. WHEN a user views the property detail page THEN the system SHALL display the property type in the header
3. WHEN a user views the property detail page THEN the system SHALL display the current status in the header
4. WHEN a user views the property detail page THEN the system SHALL display the assigned staff name in the header

### Requirement 2

**User Story:** As a user, I want the price section to be more compact, so that I can see more important information without scrolling.

#### Acceptance Criteria

1. WHEN the price section is rendered THEN the system SHALL display it at approximately 67% of its current width
2. WHEN the price section is resized THEN the system SHALL maintain all existing price information fields
3. WHEN the price section is resized THEN the system SHALL ensure text remains readable

### Requirement 3

**User Story:** As a user, I want the notes and memo section to be larger with bigger text, so that I can read important notes more easily.

#### Acceptance Criteria

1. WHEN the notes section is rendered THEN the system SHALL expand it to fill the space freed by the price section reduction
2. WHEN the notes section is rendered THEN the system SHALL increase the font size for better readability
3. WHEN the notes section is rendered THEN the system SHALL maintain all existing note content

### Requirement 4

**User Story:** As a user, I want the owner situation section removed, so that I don't see duplicate information that already exists in the seller/buyer section.

#### Acceptance Criteria

1. WHEN the property detail page is rendered THEN the system SHALL NOT display the owner situation section
2. WHEN the property detail page is rendered THEN the system SHALL ensure seller/buyer information section contains all necessary owner information

### Requirement 5

**User Story:** As a user, I want sections displayed in a logical order, so that I can find information efficiently.

#### Acceptance Criteria

1. WHEN the property detail page is rendered THEN the system SHALL display sections in the following order: price information, notes/memo, frequently asked items, viewing information, basic information, map/site URLs, property details, seller/buyer information, commission information
2. WHEN sections are reordered THEN the system SHALL maintain all section content and functionality

### Requirement 6

**User Story:** As a user, I want to see and copy map and site URLs easily, so that I can share them with customers via email.

#### Acceptance Criteria

1. WHEN the map section is rendered THEN the system SHALL display the section title as "地図、サイトURL等"
2. WHEN the map section is rendered THEN the system SHALL display the Google Map URL as a clickable link with the full URL text visible
3. WHEN the map section is rendered THEN the system SHALL display the SUUMO URL as a clickable link with the full URL text visible
4. WHEN the map section is rendered THEN the system SHALL display the storage URL from the property request data as a clickable link with the full URL text visible
5. WHEN a user clicks on any URL THEN the system SHALL open the link in a new tab

### Requirement 7

**User Story:** As a user, I want to edit frequently asked items, so that I can update common questions and answers.

#### Acceptance Criteria

1. WHEN the frequently asked items section is rendered THEN the system SHALL display an edit button
2. WHEN a user clicks the edit button THEN the system SHALL enable editing mode for the section
3. WHEN editing mode is enabled THEN the system SHALL display a save button
4. WHEN a user clicks the save button THEN the system SHALL save the changes and exit editing mode
5. WHEN the section has no content THEN the system SHALL hide the section in view mode
6. WHEN the section has no content and editing mode is enabled THEN the system SHALL display empty editable fields

### Requirement 8

**User Story:** As a user, I want to edit viewing information, so that I can update visit details and notes.

#### Acceptance Criteria

1. WHEN the viewing information section is rendered THEN the system SHALL display an edit button
2. WHEN a user clicks the edit button THEN the system SHALL enable editing mode for the section
3. WHEN editing mode is enabled THEN the system SHALL display a save button
4. WHEN a user clicks the save button THEN the system SHALL save the changes and exit editing mode
5. WHEN the section has no content THEN the system SHALL hide the section in view mode
6. WHEN the section has no content and editing mode is enabled THEN the system SHALL display empty editable fields

### Requirement 9

**User Story:** As a user, I want to edit seller and buyer information, so that I can update contact details and transaction information.

#### Acceptance Criteria

1. WHEN the seller/buyer information section is rendered THEN the system SHALL display an edit button
2. WHEN a user clicks the edit button THEN the system SHALL enable editing mode for the section
3. WHEN editing mode is enabled THEN the system SHALL display a save button
4. WHEN a user clicks the save button THEN the system SHALL save the changes and exit editing mode
5. WHEN the section has no content THEN the system SHALL hide the section in view mode
6. WHEN the section has no content and editing mode is enabled THEN the system SHALL display empty editable fields

### Requirement 10

**User Story:** As a user, I want sections to be read-only by default, so that I don't accidentally modify important information.

#### Acceptance Criteria

1. WHEN any editable section is rendered THEN the system SHALL display it in read-only mode by default
2. WHEN a section is in read-only mode THEN the system SHALL prevent direct text editing
3. WHEN a section is in read-only mode THEN the system SHALL display an edit button to enable editing
