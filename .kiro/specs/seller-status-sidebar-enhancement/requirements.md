# Requirements Document

## Introduction

売主リストページの左側サイドバーに、特定の条件に基づいたステータスフィルターを表示する機能を強化する。ユーザーは「当日TEL」「未査定」「査定（郵送）」の3つのステータスカテゴリで売主をフィルタリングできるようになる。

## Glossary

- **売主リストシステム**: 売主情報を管理・表示するWebアプリケーション
- **当日TEL**: 次電日が当日で、状況（当社）が「追客中」で、「営担」（visitAssignee）が空欄の売主
- **未査定**: 査定額（valuationAmount1, valuationAmount2, valuationAmount3）が全て空欄で、反響日付が2025/12/8以降の売主
- **査定（郵送）**: 郵送ステータス（mailingStatus）が「未」になっている売主
- **営担**: 訪問査定担当者（visitAssignee フィールド）
- **次電日**: 次回電話予定日（nextCallDate フィールド）
- **状況（当社）**: 売主のステータス（status フィールド）
- **追客中**: ステータス値「following_up」または日本語の「追客中」

## Requirements

### Requirement 1

**User Story:** As a 営業担当者, I want to see sellers who need to be called today, so that I can prioritize my daily calls.

#### Acceptance Criteria

1. WHEN a user views the seller list page THEN the 売主リストシステム SHALL display a "当日TEL" button in the left sidebar
2. WHEN the 売主リストシステム calculates "当日TEL" count THEN the 売主リストシステム SHALL include only sellers where nextCallDate equals today AND status equals "追客中" or "following_up" AND visitAssignee is empty or null
3. WHEN a user clicks the "当日TEL" button THEN the 売主リストシステム SHALL filter the seller list to show only sellers matching the "当日TEL" criteria
4. WHEN the "当日TEL" filter is active THEN the 売主リストシステム SHALL visually indicate the active state with a distinct color

### Requirement 2

**User Story:** As a 査定担当者, I want to see sellers who have not been valuated yet, so that I can process new inquiries promptly.

#### Acceptance Criteria

1. WHEN a user views the seller list page THEN the 売主リストシステム SHALL display a "未査定" button in the left sidebar
2. WHEN the 売主リストシステム calculates "未査定" count THEN the 売主リストシステム SHALL include only sellers where valuationAmount1 is null or empty AND valuationAmount2 is null or empty AND valuationAmount3 is null or empty AND inquiryDate is on or after 2025-12-08
3. WHEN a user clicks the "未査定" button THEN the 売主リストシステム SHALL filter the seller list to show only sellers matching the "未査定" criteria
4. WHEN the "未査定" filter is active THEN the 売主リストシステム SHALL visually indicate the active state with a distinct color

### Requirement 3

**User Story:** As a 事務担当者, I want to see sellers who need mailing documents sent, so that I can manage document delivery efficiently.

#### Acceptance Criteria

1. WHEN a user views the seller list page THEN the 売主リストシステム SHALL display a "査定（郵送）" button in the left sidebar
2. WHEN the 売主リストシステム calculates "査定（郵送）" count THEN the 売主リストシステム SHALL include only sellers where mailingStatus equals "未"
3. WHEN a user clicks the "査定（郵送）" button THEN the 売主リストシステム SHALL filter the seller list to show only sellers matching the "査定（郵送）" criteria
4. WHEN the "査定（郵送）" filter is active THEN the 売主リストシステム SHALL visually indicate the active state with a distinct color

### Requirement 4

**User Story:** As a ユーザー, I want to see the count of sellers in each status category, so that I can understand the workload at a glance.

#### Acceptance Criteria

1. WHEN the seller list page loads THEN the 売主リストシステム SHALL display the count of sellers for each status category next to the category button
2. WHEN the seller data changes THEN the 売主リストシステム SHALL update the counts in real-time
3. WHEN a count is zero THEN the 売主リストシステム SHALL display "0" as the count value

### Requirement 5

**User Story:** As a ユーザー, I want to clear the status filter and see all sellers, so that I can return to the full list view.

#### Acceptance Criteria

1. WHEN a user views the seller list page THEN the 売主リストシステム SHALL display an "All" button in the left sidebar
2. WHEN a user clicks the "All" button THEN the 売主リストシステム SHALL remove any active status filter and display all sellers
3. WHEN the "All" filter is active THEN the 売主リストシステム SHALL visually indicate the active state
