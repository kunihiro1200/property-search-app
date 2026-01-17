# Requirements Document

## Introduction

物件リストページおよび物件詳細ページにおいて、地図URL（Google Map URL）と格納先URL（Storage Location）を手動で編集できる機能を追加します。現在これらのフィールドは表示のみですが、ユーザーが直接URLを入力・編集できるようにすることで、データの柔軟な管理を可能にします。

## Glossary

- **System**: 売主管理システム
- **Property Listings Page**: 物件リストページ（PropertyListingsPage）
- **Property Detail Page**: 物件詳細ページ（PropertyListingDetailPage）
- **Google Map URL**: 物件の地図URL（`google_map_url`カラム）- 物件の位置情報を示すGoogle MapsのURL
- **Storage Location**: 格納先URL（`storage_location`カラム）- 物件関連ドキュメントが保存されているGoogle DriveフォルダのURL
- **Property Number**: 物件番号（例: AA12345）

## Requirements

### Requirement 1: Google Map URL Manual Edit

**User Story:** As a user, I want to manually edit the Google Map URL for a property, so that I can update or correct the location information when needed.

#### Acceptance Criteria

1. WHEN a user views the property detail page THEN the System SHALL display the Google Map URL field as an editable text input
2. WHEN the user clicks on the Google Map URL field THEN the System SHALL allow the user to edit the URL
3. WHEN the user enters a valid URL THEN the System SHALL accept the input
4. WHEN the user enters an invalid URL format THEN the System SHALL display a validation error message
5. WHEN the user saves the changes THEN the System SHALL update the `google_map_url` field in the database
6. WHEN the Google Map URL is updated THEN the System SHALL recalculate the distribution areas based on the new location
7. WHEN the save operation succeeds THEN the System SHALL display a success message
8. WHEN the save operation fails THEN the System SHALL display an error message and retain the user's input

### Requirement 2: Storage Location URL Manual Edit

**User Story:** As a user, I want to manually edit the storage location URL for a property, so that I can update the link to the document storage folder.

#### Acceptance Criteria

1. WHEN a user views the property detail page THEN the System SHALL display the storage location URL field as an editable text input
2. WHEN the user clicks on the storage location URL field THEN the System SHALL allow the user to edit the URL
3. WHEN the user enters a valid Google Drive folder URL THEN the System SHALL accept the input
4. WHEN the user enters an invalid URL format THEN the System SHALL display a validation error message
5. WHEN the user saves the changes THEN the System SHALL update the `storage_location` field in the database
6. WHEN the save operation succeeds THEN the System SHALL display a success message
7. WHEN the save operation fails THEN the System SHALL display an error message and retain the user's input

### Requirement 3: URL Field Display and Validation

**User Story:** As a user, I want clear visual feedback when editing URLs, so that I can easily understand the current state and any validation errors.

#### Acceptance Criteria

1. WHEN displaying URL fields THEN the System SHALL show a clear label for each field ("地図URL" and "格納先URL")
2. WHEN a URL field is empty THEN the System SHALL display a placeholder text indicating the expected format
3. WHEN a URL is valid and saved THEN the System SHALL display it as a clickable link with an external link icon
4. WHEN a URL validation error occurs THEN the System SHALL display the error message below the input field in red text
5. WHEN the user is editing a URL THEN the System SHALL show a save button and a cancel button
6. WHEN the user clicks cancel THEN the System SHALL revert to the original URL value
7. WHEN the user clicks save THEN the System SHALL validate and save the URL

### Requirement 4: URL Format Validation

**User Story:** As a developer, I want to validate URL formats before saving, so that only valid URLs are stored in the database.

#### Acceptance Criteria

1. WHEN validating a Google Map URL THEN the System SHALL accept URLs matching the pattern `https://maps.google.com/*` or `https://www.google.com/maps/*`
2. WHEN validating a storage location URL THEN the System SHALL accept URLs matching the pattern `https://drive.google.com/drive/folders/*`
3. WHEN a URL does not match the expected pattern THEN the System SHALL display an error message: "有効なURL形式を入力してください"
4. WHEN a URL field is empty THEN the System SHALL accept it as valid (optional field)
5. WHEN a URL contains special characters THEN the System SHALL properly encode them before saving

### Requirement 5: Integration with Existing Features

**User Story:** As a user, I want URL editing to work seamlessly with existing property management features, so that my workflow is not disrupted.

#### Acceptance Criteria

1. WHEN the Google Map URL is updated THEN the System SHALL automatically recalculate distribution areas using the PropertyDistributionAreaCalculator
2. WHEN the storage location URL is updated THEN the System SHALL update the image display to reflect the new folder location
3. WHEN viewing the property detail page THEN the System SHALL display both the editable URL fields and the existing read-only fields in a logical layout
4. WHEN the property is synced from the spreadsheet THEN the System SHALL preserve manually edited URLs unless they are explicitly overwritten
5. WHEN a user has insufficient permissions THEN the System SHALL display URL fields as read-only

### Requirement 6: User Experience and Accessibility

**User Story:** As a user, I want the URL editing interface to be intuitive and accessible, so that I can efficiently manage property URLs.

#### Acceptance Criteria

1. WHEN displaying URL fields THEN the System SHALL use consistent styling with other editable fields in the property detail page
2. WHEN a URL field is focused THEN the System SHALL highlight the field with a visible border
3. WHEN hovering over a saved URL link THEN the System SHALL display the full URL in a tooltip
4. WHEN the page is responsive THEN the System SHALL ensure URL fields display correctly on mobile and desktop devices
5. WHEN using keyboard navigation THEN the System SHALL allow users to tab between URL fields and action buttons
6. WHEN a save operation is in progress THEN the System SHALL disable the save button and show a loading indicator

## Non-Functional Requirements

### Performance
- URL validation SHALL complete within 100ms
- Database updates SHALL complete within 500ms
- Distribution area recalculation SHALL complete within 2 seconds

### Security
- All URL inputs SHALL be sanitized to prevent XSS attacks
- Only authenticated users with appropriate permissions SHALL be able to edit URLs
- URL updates SHALL be logged in the activity log

### Usability
- Error messages SHALL be clear and actionable
- The interface SHALL follow existing design patterns in the application
- URL fields SHALL be easily discoverable on the property detail page

## Out of Scope

The following items are explicitly out of scope for this specification:

1. Bulk URL editing for multiple properties
2. URL history tracking and version control
3. Automatic URL validation by checking if the URL is accessible
4. Integration with external mapping services other than Google Maps
5. Automatic URL extraction from property data
