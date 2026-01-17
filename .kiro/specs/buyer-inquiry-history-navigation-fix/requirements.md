# Requirements Document

## Introduction

買主詳細ページの問合せ履歴テーブルにおいて、案件（物件番号）をクリックした際の遷移先を修正します。現在は物件詳細画面に遷移していますが、買主詳細画面に遷移するように変更し、元の画面に戻るためのナビゲーションボタンを追加します。

## Glossary

- **Buyer_Detail_Page**: 買主の詳細情報を表示するページ
- **Inquiry_History_Table**: 買主詳細ページに表示される問合せ履歴テーブル
- **Property_Number**: 物件を識別する番号（例: AA12345）
- **Buyer_Number**: 買主を識別する番号（例: 6648）
- **Navigation**: ユーザーがアプリケーション内の異なるページ間を移動する機能
- **Back_Button**: 前の画面に戻るためのボタン

## Requirements

### Requirement 1: 問合せ履歴の案件クリック時の遷移先変更

**User Story:** As a user, I want to navigate to the buyer detail page when clicking on a property in the inquiry history, so that I can view the buyer's information related to that inquiry.

#### Acceptance Criteria

1. WHEN a user clicks on a property number in the Inquiry_History_Table, THEN THE System SHALL navigate to the Buyer_Detail_Page for the buyer associated with that inquiry
2. WHEN navigating from the Inquiry_History_Table, THEN THE System SHALL pass the buyer_number as a navigation parameter
3. WHEN the Inquiry_History_Table renders property numbers, THEN THE System SHALL create links that navigate to buyer detail pages instead of property detail pages
4. IF an inquiry does not have an associated buyer_number, THEN THE System SHALL display the property number as plain text without a link

### Requirement 2: 戻るボタンの追加

**User Story:** As a user, I want a back button on the buyer detail page, so that I can easily return to the previous page after viewing buyer details.

#### Acceptance Criteria

1. WHEN a user navigates to the Buyer_Detail_Page from the Inquiry_History_Table, THEN THE System SHALL display a Back_Button
2. WHEN a user clicks the Back_Button, THEN THE System SHALL navigate back to the previous page
3. WHEN the Back_Button is displayed, THEN THE System SHALL position it in a prominent location (e.g., top-left of the page header)
4. WHEN the Back_Button is rendered, THEN THE System SHALL use an appropriate icon (e.g., arrow-left) and label (e.g., "戻る")

### Requirement 3: ナビゲーション履歴の管理

**User Story:** As a user, I want the navigation history to be properly maintained, so that the back button works correctly across different navigation paths.

#### Acceptance Criteria

1. WHEN a user navigates using the Inquiry_History_Table links, THEN THE System SHALL add the navigation to the browser history
2. WHEN a user clicks the Back_Button, THEN THE System SHALL use the browser's history API to navigate back
3. WHEN a user navigates back, THEN THE System SHALL restore the previous page state (e.g., scroll position, filters)
4. IF there is no previous page in the history, THEN THE System SHALL navigate to a default page (e.g., buyer list page)
