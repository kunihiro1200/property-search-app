# Requirements Document

## Introduction

物件公開サイトの詳細画面において、業務リストのスプレッドシート「athome」シートから物件種別に応じた特定のセル範囲の値を取得し、基本情報セクションの下に新しいセクションとして表示する機能を実装する。

## Glossary

- **System**: 物件公開サイトシステム
- **Athome_Sheet**: 業務リストスプレッドシートの「athome」シート
- **Property_Type**: 物件種別（土地、戸建て、マンション）
- **Cell_Range**: 物件種別ごとに定義されたセル範囲
- **Property_Number**: 物件番号（業務リストの物件を識別する番号）
- **Detail_Page**: 物件公開サイトの詳細画面
- **Basic_Info_Section**: 詳細画面の基本情報セクション
- **Athome_Section**: 新しく追加するathome情報表示セクション

## Requirements

### Requirement 1: Athomeシートデータ取得

**User Story:** As a システム管理者, I want to retrieve data from the athome sheet based on property number, so that I can display property-specific information on the public site

#### Acceptance Criteria

1. WHEN a property detail page is loaded, THE System SHALL retrieve the spreadsheet URL from the property_listings table using the property number
2. WHEN the spreadsheet URL is retrieved, THE System SHALL access the "athome" sheet within that spreadsheet
3. WHEN accessing the athome sheet fails, THE System SHALL log the error and continue rendering the page without the athome section
4. THE System SHALL cache the spreadsheet data for 5 minutes to reduce API calls

### Requirement 2: 物件種別に応じたセル範囲取得

**User Story:** As a システム管理者, I want to retrieve different cell ranges based on property type, so that the correct information is displayed for each property category

#### Acceptance Criteria

1. WHEN the property type is "土地" (land), THE System SHALL retrieve values from cells B63 to B79 in the athome sheet
2. WHEN the property type is "戸建て" (detached house), THE System SHALL retrieve values from cells B152 to B166 in the athome sheet
3. WHEN the property type is "マンション" (apartment), THE System SHALL retrieve values from cells B149 to B163 in the athome sheet
4. WHEN the property type is not recognized, THE System SHALL not display the athome section
5. THE System SHALL handle empty cells by displaying them as empty strings

### Requirement 3: 文頭記号の変換

**User Story:** As a ユーザー, I want to see clear visual indicators for important information, so that I can quickly identify key points

#### Acceptance Criteria

1. WHEN a cell value starts with "★" (star), THE System SHALL replace it with a different symbol or indicator
2. THE System SHALL use "●" (filled circle) as the replacement symbol for "★"
3. WHEN a cell value does not start with "★", THE System SHALL display the value as-is
4. THE System SHALL preserve all other text content after the symbol replacement

### Requirement 4: Athome情報セクションの表示

**User Story:** As a ユーザー, I want to see athome information below the basic information section, so that I can access additional property details

#### Acceptance Criteria

1. WHEN the detail page is rendered, THE System SHALL display the athome section immediately below the basic information section
2. WHEN athome data is available, THE System SHALL display each non-empty cell value as a separate line item
3. WHEN no athome data is available, THE System SHALL not display the athome section
4. THE System SHALL display the section with a clear heading "物件詳細情報" or similar
5. THE System SHALL apply consistent styling with the rest of the detail page

### Requirement 5: エラーハンドリング

**User Story:** As a システム管理者, I want the system to handle errors gracefully, so that users can still view the property details even if athome data is unavailable

#### Acceptance Criteria

1. WHEN the spreadsheet URL is null or invalid, THE System SHALL skip the athome section without displaying an error to the user
2. WHEN the athome sheet does not exist in the spreadsheet, THE System SHALL log a warning and skip the athome section
3. WHEN the Google Sheets API returns an error, THE System SHALL retry once after 1 second before giving up
4. WHEN all retry attempts fail, THE System SHALL log the error details for debugging purposes
5. THE System SHALL never display raw error messages to end users

### Requirement 6: パフォーマンス最適化

**User Story:** As a システム管理者, I want the system to load athome data efficiently, so that page load times remain acceptable

#### Acceptance Criteria

1. WHEN athome data is requested, THE System SHALL use cached data if available and not expired
2. WHEN multiple requests for the same property occur within the cache period, THE System SHALL serve all requests from cache
3. THE System SHALL fetch athome data asynchronously to avoid blocking the main page render
4. WHEN athome data takes longer than 3 seconds to load, THE System SHALL timeout and skip the section
5. THE System SHALL implement batch fetching when multiple properties are displayed on a list page
