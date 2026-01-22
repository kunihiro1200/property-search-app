# Requirements Document

## Introduction

物件公開サイトの詳細画面において、画像の上に「お気に入り文言」を表示する機能を実装します。この文言は、業務リストのスプレッドシートから物件種別に応じて取得します。

## Glossary

- **Public_Property_Site**: 物件公開サイト
- **Detail_Page**: 物件詳細画面
- **Favorite_Comment**: お気に入り文言（画像上に表示するテキスト）
- **Gyomu_List**: 業務リスト（物件情報を管理するスプレッドシート）
- **Athome_Sheet**: 業務リストスプレッドシート内の「athome」シート
- **Property_Type**: 物件種別（土地、戸建て、マンション）
- **Spreadsheet_URL_Column**: 業務リストの「スプシURL」カラム

## Requirements

### Requirement 1: お気に入り文言の取得

**User Story:** As a system, I want to retrieve the favorite comment from the Gyomu List spreadsheet, so that I can display it on the property detail page.

#### Acceptance Criteria

1. WHEN a property detail page is loaded, THE System SHALL retrieve the spreadsheet URL from the Gyomu List for the matching property number
2. WHEN the spreadsheet URL is retrieved, THE System SHALL access the "athome" sheet within that spreadsheet
3. WHEN the property type is "土地" (land), THE System SHALL retrieve the favorite comment from cell B53
4. WHEN the property type is "戸建て" (detached house), THE System SHALL retrieve the favorite comment from cell B142
5. WHEN the property type is "マンション" (apartment), THE System SHALL retrieve the favorite comment from cell B150
6. IF the spreadsheet URL is not found, THEN THE System SHALL handle the error gracefully and not display a favorite comment
7. IF the cell value is empty, THEN THE System SHALL not display a favorite comment

### Requirement 2: お気に入り文言の表示

**User Story:** As a user viewing a property detail page, I want to see the favorite comment overlaid on the property image, so that I can quickly understand the property's appeal.

#### Acceptance Criteria

1. WHEN a favorite comment exists for a property, THE System SHALL display it overlaid on the main property image
2. THE System SHALL position the favorite comment on top of the image in a visually prominent location
3. THE System SHALL style the favorite comment text to be readable against the image background
4. WHEN the favorite comment text is long, THE System SHALL ensure it fits within the image boundaries
5. THE System SHALL display the favorite comment with appropriate contrast (e.g., text shadow, background overlay)
6. WHEN no favorite comment exists, THE System SHALL display the image without any overlay text

### Requirement 3: 物件種別の判定

**User Story:** As a system, I want to correctly identify the property type, so that I can retrieve the favorite comment from the correct cell.

#### Acceptance Criteria

1. THE System SHALL determine the property type from the property_listings table
2. THE System SHALL map the property type value to the correct cell reference:
   - "土地" → B53
   - "戸建て" → B142
   - "マンション" → B150
3. IF the property type is not one of the three supported types, THEN THE System SHALL not attempt to retrieve a favorite comment
4. THE System SHALL handle property type variations (e.g., different spellings or formats) consistently

### Requirement 4: キャッシュとパフォーマンス

**User Story:** As a system administrator, I want the favorite comment retrieval to be performant, so that page load times remain acceptable.

#### Acceptance Criteria

1. THE System SHALL cache retrieved favorite comments for a reasonable duration
2. WHEN a favorite comment is cached, THE System SHALL serve it from cache on subsequent requests
3. THE System SHALL implement a cache invalidation strategy to ensure comments stay up-to-date
4. THE System SHALL handle Google Sheets API rate limits gracefully
5. IF the Google Sheets API is unavailable, THEN THE System SHALL fail gracefully and display the page without the favorite comment

### Requirement 5: エラーハンドリング

**User Story:** As a user, I want the property detail page to load successfully even if the favorite comment cannot be retrieved, so that I can still view the property information.

#### Acceptance Criteria

1. IF the spreadsheet URL is invalid, THEN THE System SHALL log the error and continue rendering the page
2. IF the Google Sheets API returns an error, THEN THE System SHALL log the error and continue rendering the page
3. IF the specified cell is not found, THEN THE System SHALL log a warning and continue rendering the page
4. THE System SHALL not block page rendering while waiting for the favorite comment
5. THE System SHALL implement a timeout for favorite comment retrieval
