# Requirements Document

## Introduction

公開物件サイトの詳細画面において、「お気に入り文言」と「アピールポイント」が表示されなくなった問題を修正します。既存の実装では、アピールポイントの仕様が間違っており（単一セルではなくセル範囲から取得する必要がある）、また両方の機能が現在表示されていません。

## Glossary

- **Public_Property_Site**: 物件公開サイト
- **Detail_Page**: 物件詳細画面
- **Favorite_Comment**: お気に入り文言（画像の上セクションに表示するテキスト）
- **Appeal_Points**: アピールポイント（基本情報の下セクションに表示するテキスト）
- **Gyomu_List**: 業務リスト（物件情報を管理するスプレッドシート）
- **Athome_Sheet**: 業務リストスプレッドシート内の「athome」シート
- **Property_Type**: 物件種別（土地、戸建て、マンション）
- **Spreadsheet_URL_Column**: 業務リストの「スプシURL」カラム
- **Cell_Range**: セル範囲（例: B63からL79）

## Requirements

### Requirement 1: お気に入り文言の表示修正

**User Story:** As a user viewing a property detail page, I want to see the favorite comment displayed above the property images, so that I can quickly understand the property's key selling point.

#### Acceptance Criteria

1. WHEN a property detail page is loaded, THE System SHALL retrieve the favorite comment from the Gyomu List spreadsheet
2. WHEN the property type is "土地" (land), THE System SHALL retrieve the favorite comment from cell B53 of the "athome" sheet
3. WHEN the property type is "戸建て" or "戸建" (detached house), THE System SHALL retrieve the favorite comment from cell B142 of the "athome" sheet
4. WHEN the property type is "マンション" (apartment), THE System SHALL retrieve the favorite comment from cell B150 of the "athome" sheet
5. THE System SHALL display the favorite comment in a section above the property images
6. WHEN the favorite comment is empty or null, THE System SHALL not display the favorite comment section
7. THE System SHALL handle errors gracefully and continue displaying the page even if the favorite comment cannot be retrieved

### Requirement 2: アピールポイントの取得と表示（セル範囲対応）

**User Story:** As a user viewing a property detail page, I want to see the appeal points displayed below the basic information section, so that I can understand the property's detailed features and benefits.

#### Acceptance Criteria

1. WHEN a property detail page is loaded, THE System SHALL retrieve the appeal points from the Gyomu List spreadsheet
2. WHEN the property type is "土地" (land), THE System SHALL retrieve the appeal points from cell range B63 to L79 of the "athome" sheet
3. WHEN the property type is "戸建て" or "戸建" (detached house), THE System SHALL retrieve the appeal points from cell range B152 to L166 of the "athome" sheet
4. WHEN the property type is "マンション" (apartment), THE System SHALL retrieve the appeal points from cell range B149 to L163 of the "athome" sheet
5. THE System SHALL concatenate all non-empty cells in the range into a single text block
6. THE System SHALL preserve line breaks between cells when concatenating
7. THE System SHALL display the appeal points in a section below the basic information section
8. WHEN all cells in the range are empty, THE System SHALL not display the appeal points section
9. THE System SHALL handle errors gracefully and continue displaying the page even if the appeal points cannot be retrieved

### Requirement 3: スプレッドシートからのデータ取得

**User Story:** As a system, I want to retrieve data from the correct spreadsheet and sheet, so that I can display accurate property information.

#### Acceptance Criteria

1. THE System SHALL retrieve the spreadsheet URL from the property_listings table's storage_location column
2. THE System SHALL extract the spreadsheet ID from the URL
3. THE System SHALL access the "athome" sheet within the spreadsheet
4. THE System SHALL use the Google Sheets API to read cell values
5. IF the spreadsheet URL is not found, THEN THE System SHALL log an error and not display the comments
6. IF the "athome" sheet is not found, THEN THE System SHALL log an error and not display the comments
7. THE System SHALL handle Google Sheets API rate limits gracefully

### Requirement 4: 物件種別の判定

**User Story:** As a system, I want to correctly identify the property type, so that I can retrieve data from the correct cells or cell ranges.

#### Acceptance Criteria

1. THE System SHALL determine the property type from the property_listings table's property_type column
2. THE System SHALL map the property type value to the correct cell references:
   - "土地" → Favorite: B53, Appeal: B63:L79
   - "戸建て" or "戸建" → Favorite: B142, Appeal: B152:L166
   - "マンション" → Favorite: B150, Appeal: B149:L163
3. THE System SHALL handle property type variations (e.g., "戸建て" vs "戸建") consistently
4. IF the property type is not one of the three supported types, THEN THE System SHALL not attempt to retrieve comments

### Requirement 5: 表示位置とスタイリング

**User Story:** As a user, I want the comments to be displayed in visually distinct sections, so that I can easily identify and read them.

#### Acceptance Criteria

1. THE System SHALL display the favorite comment section above the property images
2. THE System SHALL display the appeal points section below the basic information section
3. THE System SHALL style the favorite comment section with:
   - Clear visual separation from other content
   - Readable font size and line height
   - Appropriate padding and margins
4. THE System SHALL style the appeal points section with:
   - Clear visual separation from other content
   - Readable font size and line height
   - Appropriate padding and margins
   - Support for multi-line text
5. THE System SHALL ensure both sections are responsive and display correctly on mobile, tablet, and desktop devices

### Requirement 6: エラーハンドリングとパフォーマンス

**User Story:** As a user, I want the property detail page to load quickly and reliably, even if the comments cannot be retrieved.

#### Acceptance Criteria

1. THE System SHALL not block page rendering while retrieving comments
2. THE System SHALL implement a timeout for comment retrieval (maximum 10 seconds)
3. IF comment retrieval fails, THEN THE System SHALL log the error and continue rendering the page
4. THE System SHALL cache retrieved comments for 5 minutes to reduce API calls
5. THE System SHALL implement graceful degradation for all error scenarios
6. THE System SHALL not display error messages to end users

### Requirement 7: 既存機能との互換性

**User Story:** As a developer, I want the fix to be compatible with existing functionality, so that no other features are broken.

#### Acceptance Criteria

1. THE System SHALL maintain compatibility with the existing PropertyImageGallery component
2. THE System SHALL maintain compatibility with the existing PublicPropertyDetailPage layout
3. THE System SHALL not modify the database schema
4. THE System SHALL use existing Google Sheets API integration
5. THE System SHALL use existing caching infrastructure (Redis)

### Requirement 8: 診断とデバッグ

**User Story:** As a developer, I want to be able to diagnose why comments are not displaying, so that I can quickly identify and fix issues.

#### Acceptance Criteria

1. THE System SHALL log detailed information when comments cannot be retrieved
2. THE System SHALL log the property ID, property type, and spreadsheet URL
3. THE System SHALL log the specific cell or cell range being accessed
4. THE System SHALL log any API errors with full error details
5. THE System SHALL provide a diagnostic endpoint to test comment retrieval for a specific property

## Data Specifications

### お気に入り文言のセル位置

| 物件種別 | セル位置 |
|---------|---------|
| 土地 | B53 |
| 戸建て/戸建 | B142 |
| マンション | B150 |

### アピールポイントのセル範囲

| 物件種別 | セル範囲 |
|---------|---------|
| 土地 | B63:L79 (17行 × 11列) |
| 戸建て/戸建 | B152:L166 (15行 × 11列) |
| マンション | B149:L163 (15行 × 11列) |

## Non-Functional Requirements

1. **Performance**: Comment retrieval should not add more than 500ms to page load time (with cache)
2. **Reliability**: Page should display successfully even if comments cannot be retrieved
3. **Maintainability**: Code should follow existing patterns and be easy to understand
4. **Testability**: All functionality should be unit testable
5. **Security**: No sensitive information should be exposed in error messages

## Constraints

1. スプレッドシートの構造は変更できない
2. セル位置とセル範囲は固定値として扱う
3. 既存のGoogle Sheets API認証を使用する
4. 既存のRedisキャッシュインフラを使用する

## Success Criteria

1. お気に入り文言が画像の上セクションに正しく表示される
2. アピールポイントが基本情報の下セクションに正しく表示される
3. セル範囲からのデータ取得が正しく動作する
4. エラー時もページが正常に表示される
5. パフォーマンスが許容範囲内である（キャッシュ使用時 < 500ms）
6. すべてのテストが成功する

