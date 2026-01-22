# Requirements Document

## Introduction

公開物件サイトにおいて、現在「物件番号、エリアで検索」バーと「所在地で検索」バーの2つの検索バーが存在し、ユーザーにとって紛らわしい状態となっている。この仕様では、検索機能を統一し、ユーザーエクスペリエンスを向上させる。

## Glossary

- **Hero_Section**: ページ上部のメインビジュアルエリア。現在「エリア、物件番号で検索...」の検索バーを含む
- **Filter_Section**: 物件一覧の上部にある絞り込みフィルターエリア。現在「所在地で検索」フィールドを含む
- **Unified_Search**: 物件番号、エリア、所在地を統合した単一の検索機能
- **Search_Query**: ユーザーが入力する検索文字列
- **Property_Number**: 物件を一意に識別する番号（例: AA12345）
- **Location**: 所在地情報（市区町村、町名など）

## Requirements

### Requirement 1: 検索バーの統一

**User Story:** As a user, I want to use a single search bar to find properties by property number or location, so that I can quickly find what I'm looking for without confusion.

#### Acceptance Criteria

1. THE Hero_Section SHALL contain a single unified search bar that accepts both property numbers and location queries
2. THE Filter_Section SHALL NOT contain a separate location search field
3. WHEN a user enters a search query in the unified search bar, THE System SHALL determine whether it is a property number or location based on the input format
4. WHEN a search query matches the property number format (starts with "AA" followed by digits), THE System SHALL search by property number
5. WHEN a search query does not match the property number format, THE System SHALL search by location

### Requirement 2: 検索プレースホルダーの明確化

**User Story:** As a user, I want clear guidance on what I can search for, so that I understand how to use the search functionality.

#### Acceptance Criteria

1. THE unified search bar placeholder text SHALL clearly indicate that users can search by property number or location
2. THE placeholder text SHALL be in Japanese and follow the format: "物件番号またはエリアで検索（例: AA12345、大分市）"
3. WHEN the search bar receives focus, THE System SHALL maintain the placeholder text visibility until the user starts typing

### Requirement 3: フィルターセクションの再構成

**User Story:** As a user, I want the filter section to focus on property attributes rather than location search, so that I can efficiently narrow down properties by their characteristics.

#### Acceptance Criteria

1. THE Filter_Section SHALL remove the "所在地で検索" text field
2. THE Filter_Section SHALL retain all other filter options (property type, price range, building age)
3. WHEN a user performs a search using the unified search bar, THE Filter_Section SHALL display the active search query as a filter chip
4. WHEN a user clicks the delete button on the search query filter chip, THE System SHALL clear the search query and refresh the results

### Requirement 4: 検索結果の表示

**User Story:** As a user, I want to see clear feedback when I search for properties, so that I understand what results are being displayed.

#### Acceptance Criteria

1. WHEN a search query is active, THE System SHALL display the search query in the active filters section
2. WHEN searching by property number, THE active filter chip SHALL display "物件番号: [query]"
3. WHEN searching by location, THE active filter chip SHALL display "所在地: [query]"
4. WHEN a search returns no results, THE System SHALL display a message indicating no properties match the search criteria
5. WHEN a user clears all filters, THE System SHALL also clear the search query

### Requirement 5: URL パラメータの同期

**User Story:** As a user, I want to share or bookmark search results, so that I can return to the same search later or share it with others.

#### Acceptance Criteria

1. WHEN a user performs a search, THE System SHALL update the URL with the search query parameter
2. WHEN a user loads a page with a search query parameter in the URL, THE System SHALL automatically populate the search bar and execute the search
3. THE URL parameter for property number search SHALL be "propertyNumber"
4. THE URL parameter for location search SHALL be "location"
5. WHEN a user clears the search, THE System SHALL remove the corresponding URL parameter

### Requirement 6: 検索のデバウンス処理

**User Story:** As a user, I want the search to wait until I finish typing, so that the system doesn't make unnecessary requests while I'm still entering my query.

#### Acceptance Criteria

1. THE System SHALL implement a debounce delay of 500 milliseconds for search queries
2. WHEN a user types in the search bar, THE System SHALL wait 500ms after the last keystroke before executing the search
3. WHEN a user presses Enter in the search bar, THE System SHALL immediately execute the search without waiting for the debounce delay
4. WHEN a user clears the search bar, THE System SHALL immediately clear the search results

### Requirement 7: レスポンシブデザイン

**User Story:** As a mobile user, I want the unified search bar to work well on my device, so that I can search for properties on the go.

#### Acceptance Criteria

1. THE unified search bar SHALL be fully responsive and usable on mobile devices
2. WHEN viewed on mobile devices, THE search bar SHALL maintain appropriate sizing and touch targets
3. THE search bar SHALL be easily accessible without requiring excessive scrolling on mobile devices
4. WHEN the mobile keyboard appears, THE search bar SHALL remain visible and functional

### Requirement 8: アクセシビリティ

**User Story:** As a user with accessibility needs, I want the search functionality to be accessible, so that I can use it with assistive technologies.

#### Acceptance Criteria

1. THE unified search bar SHALL have appropriate ARIA labels
2. THE search bar SHALL be keyboard navigable
3. WHEN a search is executed, THE System SHALL announce the number of results to screen readers
4. THE clear search button SHALL have an appropriate ARIA label
5. THE active filter chips SHALL be keyboard accessible and have appropriate ARIA labels
