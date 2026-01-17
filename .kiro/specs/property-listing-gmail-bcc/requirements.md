# Requirements Document

## Introduction

物件リストページから、条件に合致する買主のメールアドレスをBCCに自動追加してGmailを立ち上げる機能を実装します。これにより、物件情報を効率的に複数の買主に配信できるようになります。

## Glossary

- **System**: 物件リスト管理システム
- **Property Listing**: 物件リスト（property_listingsテーブル）
- **Buyer**: 買主（buyersテーブル）
- **★エリア**: 買主の希望エリアフィールド（desired_area）
- **配信フィールド**: 買主の配信要否を示すフィールド（distribution_typeまたは専用フィールド）
- **Gmail Compose**: Gmailの新規メール作成画面
- **BCC**: Blind Carbon Copy（ブラインドカーボンコピー）
- **Reference Location**: 基準地点（https://maps.app.goo.gl/6SUp2oApoATE4R336）
- **Radius**: 半径3km

## Requirements

### Requirement 1

**User Story:** As a sales staff member, I want to send property information to multiple qualified buyers via Gmail with BCC using predefined templates, so that I can efficiently distribute property listings to interested parties with consistent messaging.

#### Acceptance Criteria

1. WHEN a user clicks the "Gmailで配信" button on a property listing THEN the system SHALL display a template selection menu
2. WHEN a user selects the "値下げメール配信" template THEN the system SHALL open Gmail compose window with tenant@ifoo-oita.com as the sender
3. WHEN the Gmail compose window opens THEN the system SHALL populate the BCC field with email addresses of all qualified buyers
4. WHEN the Gmail compose window opens THEN the system SHALL pre-populate the email body with the selected template content
5. WHEN no qualified buyers exist THEN the system SHALL display a notification message and not open Gmail
6. WHEN a buyer has no email address THEN the system SHALL exclude that buyer from the BCC list
7. WHEN the Gmail compose window opens THEN the system SHALL pre-populate the subject line based on the selected template

### Requirement 2

**User Story:** As a sales staff member, I want buyers to be filtered by their desired area containing "①" and distribution preference set to "要", so that only relevant buyers receive the property information.

#### Acceptance Criteria

1. WHEN filtering buyers for a property THEN the system SHALL include buyers whose ★エリア field contains "①"
2. WHEN filtering buyers for a property THEN the system SHALL include only buyers whose 配信 field equals "要"
3. WHEN a buyer meets both area and distribution criteria THEN the system SHALL include that buyer's email in the BCC list
4. WHEN a buyer does not meet both criteria THEN the system SHALL exclude that buyer from the BCC list
5. WHEN multiple buyers meet the criteria THEN the system SHALL include all their email addresses separated by commas in the BCC field

### Requirement 3

**User Story:** As a sales staff member, I want buyers within 3km radius of a reference location to also receive property information, so that geographically relevant buyers are included even if their area preference doesn't contain "①".

#### Acceptance Criteria

1. WHEN a property has a Google Maps URL THEN the system SHALL extract the property's geographic coordinates
2. WHEN the reference location coordinates are available THEN the system SHALL calculate the distance between the property and the reference location
3. WHEN the property is within 3km of the reference location THEN the system SHALL include buyers whose ★エリア contains "①" and 配信 equals "要"
4. WHEN the property is outside 3km of the reference location THEN the system SHALL apply only the standard area and distribution filters
5. WHEN geographic calculation fails THEN the system SHALL fall back to standard filtering without radius check

### Requirement 4

**User Story:** As a sales staff member, I want to manage multiple email templates for different distribution scenarios, so that I can use appropriate messaging for various property updates.

#### Acceptance Criteria

1. WHEN the system initializes THEN the system SHALL provide a "値下げメール配信" template as the initial template
2. WHEN additional templates are needed THEN the system SHALL support adding new templates through configuration
3. WHEN a template is selected THEN the system SHALL populate the email subject and body with template-specific content
4. WHEN template content includes property placeholders THEN the system SHALL replace placeholders with actual property data
5. WHEN a template is displayed THEN the system SHALL show the template name clearly to the user

### Requirement 5

**User Story:** As a system administrator, I want the buyer filtering logic to be maintainable and testable, so that the feature can be easily updated and verified.

#### Acceptance Criteria

1. WHEN the system filters buyers THEN the filtering logic SHALL be implemented in a dedicated service class
2. WHEN geographic calculations are performed THEN the system SHALL use a reliable geocoding and distance calculation library
3. WHEN errors occur during filtering THEN the system SHALL log the error details and continue with available data
4. WHEN the BCC list exceeds Gmail's recipient limit THEN the system SHALL truncate the list and notify the user
5. WHEN the feature is deployed THEN the system SHALL maintain backward compatibility with existing buyer data

