# Requirements Document

## Introduction

買主一覧ページ（BuyersPage）から、チェックボックス選択機能とそれに関連するUI要素を完全に削除します。この機能は現在使用されておらず、UIを簡素化し、保守性を向上させるために削除します。

## Glossary

- **BuyersPage**: 買主一覧を表示するフロントエンドページコンポーネント
- **Checkbox_Column**: テーブルの各行に表示されるチェックボックス列
- **Selection_State**: 選択されたバイヤーのIDを管理するReact state
- **InquiryResponseButton**: 選択された買主に対して問い合わせ応答を送信するボタン
- **Clear_Selection_Button**: すべての選択を解除するボタン
- **Selection_Count_Display**: 選択された買主の件数を表示するUI要素

## Requirements

### Requirement 1: チェックボックス列の削除

**User Story:** As a developer, I want to remove the checkbox column from the buyer list table, so that the UI is simplified and maintenance is easier.

#### Acceptance Criteria

1. THE BuyersPage SHALL NOT display checkbox elements in the table header
2. THE BuyersPage SHALL NOT display checkbox elements in each table row
3. WHEN the buyer list table is rendered, THE BuyersPage SHALL NOT allocate space for checkbox columns
4. THE BuyersPage SHALL maintain all other table columns in their current positions

### Requirement 2: 選択関連UIコンポーネントの削除

**User Story:** As a developer, I want to remove all selection-related UI components, so that users are not confused by non-functional elements.

#### Acceptance Criteria

1. THE BuyersPage SHALL NOT display the InquiryResponseButton component
2. THE BuyersPage SHALL NOT display the Clear_Selection_Button
3. THE BuyersPage SHALL NOT display the Selection_Count_Display
4. WHEN the page is rendered, THE BuyersPage SHALL NOT show any UI elements related to buyer selection

### Requirement 3: 選択状態管理コードの削除

**User Story:** As a developer, I want to remove all selection state management code, so that the codebase is cleaner and easier to maintain.

#### Acceptance Criteria

1. THE BuyersPage SHALL NOT contain state variables for managing selected buyer IDs
2. THE BuyersPage SHALL NOT contain functions for handling checkbox selection changes
3. THE BuyersPage SHALL NOT contain functions for clearing selections
4. THE BuyersPage SHALL NOT contain event handlers for checkbox interactions
5. WHEN the component is initialized, THE BuyersPage SHALL NOT allocate memory for selection-related state

### Requirement 4: 未使用コードのクリーンアップ

**User Story:** As a developer, I want to remove all unused imports and type definitions, so that the code is clean and maintainable.

#### Acceptance Criteria

1. THE BuyersPage SHALL NOT import components that are only used for selection functionality
2. THE BuyersPage SHALL NOT contain type definitions for selection-related data structures
3. THE BuyersPage SHALL NOT contain utility functions that are only used for selection operations
4. WHEN the file is analyzed, THE BuyersPage SHALL NOT have any unused imports or dead code related to selection

### Requirement 5: テーブルレイアウトの最適化

**User Story:** As a user, I want the buyer list table to use the space efficiently, so that I can see more information without scrolling.

#### Acceptance Criteria

1. WHEN the checkbox column is removed, THE BuyersPage SHALL redistribute the available space to remaining columns
2. THE BuyersPage SHALL maintain responsive design for all screen sizes
3. THE BuyersPage SHALL ensure all existing columns remain readable and properly aligned
4. THE BuyersPage SHALL NOT introduce horizontal scrolling on standard screen sizes

### Requirement 6: 既存機能の保持

**User Story:** As a user, I want all other buyer list functionality to continue working, so that I can perform my normal tasks without disruption.

#### Acceptance Criteria

1. WHEN a user clicks on a table row, THE BuyersPage SHALL navigate to the buyer detail page
2. THE BuyersPage SHALL continue to support search functionality
3. THE BuyersPage SHALL continue to support pagination
4. THE BuyersPage SHALL continue to support sorting by columns
5. THE BuyersPage SHALL continue to support filtering by buyer attributes
6. WHEN any existing feature is used, THE BuyersPage SHALL function exactly as before the checkbox removal
