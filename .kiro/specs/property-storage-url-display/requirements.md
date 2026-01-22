# Requirements Document

## Introduction

物件詳細画面に「格納先URL」フィールドを追加し、業務依頼シートから取得した格納先URLを表示する機能を実装します。格納先URLは、物件に関連するドキュメントやファイルが保存されている場所を示す重要な情報です。

## Glossary

- **System**: 売主管理システム
- **Property Listing Detail Page**: 物件詳細ページ（PropertyListingDetailPage）
- **Work Task**: 業務依頼データ（work_tasksテーブルに格納）
- **Storage URL**: 格納先URL（storage_urlカラム）
- **Property Number**: 物件番号（売主番号と同一）

## Requirements

### Requirement 1

**User Story:** As a user, I want to view the storage URL on the property detail page, so that I can quickly access the location where property-related documents are stored.

#### Acceptance Criteria

1. WHEN a user views the property detail page THEN the System SHALL display the storage URL field in the property details section
2. WHEN the storage URL exists for the property THEN the System SHALL display it as a clickable link
3. WHEN the storage URL does not exist THEN the System SHALL display a placeholder message indicating no URL is available
4. WHEN a user clicks on the storage URL link THEN the System SHALL open the URL in a new browser tab
5. WHEN the property details section is in edit mode THEN the System SHALL allow users to view but not edit the storage URL field

### Requirement 2

**User Story:** As a developer, I want the system to fetch storage URL from the work_tasks table, so that the data is synchronized with the business request spreadsheet.

#### Acceptance Criteria

1. WHEN the property detail page loads THEN the System SHALL query the work_tasks table using the property number
2. WHEN work task data exists for the property THEN the System SHALL extract the storage_url field
3. WHEN the work_tasks query fails THEN the System SHALL handle the error gracefully without breaking the page
4. WHEN no work task data exists for the property THEN the System SHALL display the storage URL field as empty

### Requirement 3

**User Story:** As a user, I want the storage URL to be displayed in a consistent format with other property information, so that the interface remains intuitive and easy to use.

#### Acceptance Criteria

1. WHEN displaying the storage URL THEN the System SHALL use the same styling as other URL fields in the property details section
2. WHEN the storage URL is displayed THEN the System SHALL include a label "格納先URL" or "Storage URL"
3. WHEN the storage URL is a valid URL THEN the System SHALL display it with an external link icon
4. WHEN the storage URL field is rendered THEN the System SHALL position it logically within the property details section
5. WHEN the page is responsive THEN the System SHALL ensure the storage URL field displays correctly on mobile and desktop devices
