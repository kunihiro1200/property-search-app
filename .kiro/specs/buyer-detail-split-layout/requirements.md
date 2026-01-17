# Requirements Document

## Introduction

買主詳細ページのレイアウトを変更し、左側に物件情報、右側に買主情報を表示する2カラムレイアウトを実装する。現在は買主情報のみが縦に並んで表示されているが、物件情報を左側に固定表示することで、買主と物件の関連性を視覚的に分かりやすくする。

## Glossary

- **Buyer_Detail_Page**: 買主詳細ページ
- **Split_Layout**: 2カラム分割レイアウト
- **Property_Info_Panel**: 物件情報パネル（左側）
- **Buyer_Info_Panel**: 買主情報パネル（右側）
- **Linked_Properties**: 買主に紐づく物件リスト

## Requirements

### Requirement 1

**User Story:** As a user, I want to see property information on the left and buyer information on the right, so that I can easily understand the relationship between buyers and properties.

#### Acceptance Criteria

1. WHEN a user opens the buyer detail page THEN the Buyer_Detail_Page SHALL display a two-column layout with property information on the left and buyer information on the right
2. WHEN the page is displayed THEN the Property_Info_Panel SHALL occupy approximately 40% of the width
3. WHEN the page is displayed THEN the Buyer_Info_Panel SHALL occupy approximately 60% of the width
4. WHEN the buyer has linked properties THEN the Property_Info_Panel SHALL display the first linked property by default
5. WHEN the buyer has no linked properties THEN the Property_Info_Panel SHALL display a message indicating no properties are linked

### Requirement 2

**User Story:** As a user, I want to switch between multiple linked properties, so that I can view different properties associated with the same buyer.

#### Acceptance Criteria

1. WHEN the buyer has multiple linked properties THEN the Property_Info_Panel SHALL display a property selector dropdown
2. WHEN a user selects a different property from the dropdown THEN the Property_Info_Panel SHALL update to show the selected property information
3. WHEN displaying property information THEN the Property_Info_Panel SHALL show property number, address, type, price, status, and assignee
4. WHEN the property selector is displayed THEN the Property_Info_Panel SHALL show the count of linked properties

### Requirement 3

**User Story:** As a user, I want the buyer information panel to be scrollable independently, so that I can view all buyer details while keeping property information visible.

#### Acceptance Criteria

1. WHEN the buyer information exceeds the viewport height THEN the Buyer_Info_Panel SHALL be independently scrollable
2. WHEN scrolling the buyer information THEN the Property_Info_Panel SHALL remain fixed in position
3. WHEN the page is displayed THEN both panels SHALL have consistent styling and spacing
4. WHEN viewing on smaller screens THEN the layout SHALL stack vertically with property information on top

### Requirement 4

**User Story:** As a user, I want to navigate to the property detail page from the property panel, so that I can view complete property information.

#### Acceptance Criteria

1. WHEN viewing property information THEN the Property_Info_Panel SHALL display a link to the property detail page
2. WHEN a user clicks the property link THEN the Buyer_Detail_Page SHALL navigate to the property detail page
3. WHEN navigating to the property detail page THEN the Buyer_Detail_Page SHALL pass the buyer context for potential back navigation
4. WHEN the property information is displayed THEN the Property_Info_Panel SHALL show a visual indicator that the property is clickable
