# Requirements Document: Clear All Filters Button

## Introduction

公開物件一覧ページの「物件を絞り込む」セクションに、すべてのフィルター条件を一括でクリアできる「すべての条件をクリア」ボタンを追加します。これにより、ユーザーは複数のフィルターを個別に解除する手間を省き、効率的に検索条件をリセットできます。

## Glossary

- **Public_Properties_Page**: 公開物件一覧ページ (`PublicPropertiesPage.tsx`)
- **Filter_Section**: 物件を絞り込むセクション（物件タイプ、価格帯、築年数のフィルターを含む）
- **Clear_All_Button**: すべてのフィルター条件をクリアするボタン
- **Filter_State**: 現在適用されているフィルター条件の状態
- **Active_Filter**: 値が設定されているフィルター条件

## Requirements

### Requirement 1: Clear All Filters Button Display

**User Story:** As a user, I want to see a "Clear All Filters" button in the filter section, so that I can easily reset all my search criteria.

#### Acceptance Criteria

1. THE Public_Properties_Page SHALL display a "すべての条件をクリア" button in the filter section
2. THE Clear_All_Button SHALL be positioned at the bottom of the filter section, below all filter controls
3. THE Clear_All_Button SHALL use an outlined button style to distinguish it from primary actions
4. THE Clear_All_Button SHALL be visible at all times, regardless of whether filters are active
5. THE Clear_All_Button SHALL have appropriate spacing from other filter controls

### Requirement 2: Clear All Filters Functionality

**User Story:** As a user, I want to clear all active filters with one click, so that I can quickly start a new search.

#### Acceptance Criteria

1. WHEN a user clicks the Clear_All_Button, THE system SHALL reset all filter values to their default empty state
2. THE system SHALL clear the selected property types (selectedTypes state)
3. THE system SHALL clear the minimum price filter value
4. THE system SHALL clear the maximum price filter value
5. THE system SHALL clear the minimum building age filter value
6. THE system SHALL clear the maximum building age filter value
7. THE system SHALL clear the search query from UnifiedSearchBar
8. WHEN filters are cleared, THE system SHALL reset the current page to page 1
9. WHEN filters are cleared, THE system SHALL remove all filter-related URL parameters
10. WHEN filters are cleared, THE system SHALL immediately fetch and display all properties

### Requirement 3: Visual Feedback

**User Story:** As a user, I want immediate visual feedback when I clear filters, so that I know the action was successful.

#### Acceptance Criteria

1. WHEN a user clicks the Clear_All_Button, THE system SHALL provide immediate visual feedback (e.g., loading indicator)
2. THE Clear_All_Button SHALL be disabled during the filter clearing and data fetching process
3. WHEN filters are cleared, THE filter input fields SHALL visually update to show empty values
4. WHEN filters are cleared, THE property type buttons SHALL visually update to show no selection
5. THE system SHALL display the updated property count after filters are cleared

### Requirement 4: Button State Management

**User Story:** As a user, I want the clear button to be disabled when appropriate, so that I don't accidentally trigger unnecessary actions.

#### Acceptance Criteria

1. THE Clear_All_Button SHALL be disabled when a filter operation is in progress (filterLoading state)
2. THE Clear_All_Button MAY be disabled when no filters are active (optional enhancement)
3. WHEN disabled, THE Clear_All_Button SHALL have reduced opacity to indicate its disabled state
4. THE Clear_All_Button SHALL show a disabled cursor when disabled

### Requirement 5: Integration with Existing Filters

**User Story:** As a user, I want the clear button to work seamlessly with all existing filters, so that I have a consistent experience.

#### Acceptance Criteria

1. THE Clear_All_Button SHALL clear filters that are managed by PropertyTypeFilterButtons component
2. THE Clear_All_Button SHALL clear filters that are managed by TextField components (price, age)
3. THE Clear_All_Button SHALL clear filters that are managed by UnifiedSearchBar component
4. WHEN filters are cleared, THE system SHALL trigger the same data fetching logic as individual filter changes
5. THE Clear_All_Button SHALL not interfere with pagination controls

### Requirement 6: Accessibility

**User Story:** As a user with accessibility needs, I want the clear button to be accessible, so that I can use it with assistive technologies.

#### Acceptance Criteria

1. THE Clear_All_Button SHALL have an appropriate aria-label attribute
2. THE Clear_All_Button SHALL be keyboard accessible (focusable and activatable with Enter/Space)
3. THE Clear_All_Button SHALL have sufficient color contrast for visibility
4. THE Clear_All_Button SHALL announce its action to screen readers when clicked
5. THE Clear_All_Button SHALL have a minimum touch target size of 44x44 pixels for mobile devices

### Requirement 7: Error Handling

**User Story:** As a user, I want the system to handle errors gracefully when clearing filters, so that I don't lose my browsing session.

#### Acceptance Criteria

1. WHEN an error occurs during filter clearing, THE system SHALL display an appropriate error message
2. WHEN an error occurs, THE system SHALL not leave the UI in an inconsistent state
3. THE system SHALL log errors for debugging purposes
4. WHEN an error occurs, THE user SHALL be able to retry the clear action
5. THE system SHALL handle network errors gracefully without crashing the page
