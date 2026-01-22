# Requirements Document

## Introduction

買主詳細画面において、左側の列（基本情報・問い合わせ履歴など）と右側の列（物件情報など）をそれぞれ独立してスクロールできるようにする機能を実装します。これにより、ユーザーは片方の列の情報を固定したまま、もう片方の列を自由にスクロールして閲覧できるようになります。

## Glossary

- **Buyer_Detail_Screen**: 買主詳細画面 - 個別の買主情報を表示・編集する画面
- **Left_Column**: 左側の列 - 買主の基本情報、問い合わせ履歴、ヒアリング内容などを表示する領域
- **Right_Column**: 右側の列 - 関連物件情報、物件カード、メール送信機能などを表示する領域
- **Independent_Scroll**: 独立スクロール - 各列が独自のスクロールバーを持ち、他の列に影響を与えずにスクロールできる機能

## Requirements

### Requirement 1: 左右列の独立スクロール実装

**User Story:** As a user, I want to scroll the left and right columns independently on the buyer detail screen, so that I can view information in one column while keeping the other column's position fixed.

#### Acceptance Criteria

1. WHEN the user scrolls the left column, THE Buyer_Detail_Screen SHALL scroll only the Left_Column content without affecting the Right_Column position
2. WHEN the user scrolls the right column, THE Buyer_Detail_Screen SHALL scroll only the Right_Column content without affecting the Left_Column position
3. THE Buyer_Detail_Screen SHALL display separate scrollbars for the Left_Column and Right_Column
4. WHEN the page loads, THE Buyer_Detail_Screen SHALL position both columns at the top of their respective content
5. THE Buyer_Detail_Screen SHALL maintain the scroll position of each column when the user switches between tabs or performs actions within the same page

### Requirement 2: レスポンシブ対応

**User Story:** As a user, I want the independent scroll functionality to work properly on different screen sizes, so that I can use the feature on various devices.

#### Acceptance Criteria

1. WHEN the screen width is below tablet breakpoint, THE Buyer_Detail_Screen SHALL stack the columns vertically and use a single scroll
2. WHEN the screen width is above tablet breakpoint, THE Buyer_Detail_Screen SHALL display columns side-by-side with independent scrolling
3. THE Buyer_Detail_Screen SHALL adjust column heights dynamically based on viewport height
4. WHEN the user resizes the browser window, THE Buyer_Detail_Screen SHALL maintain the scroll positions of both columns

### Requirement 3: パフォーマンスとユーザビリティ

**User Story:** As a user, I want the scrolling to be smooth and responsive, so that I can navigate the content efficiently.

#### Acceptance Criteria

1. WHEN the user scrolls either column, THE Buyer_Detail_Screen SHALL provide smooth scrolling without lag or jitter
2. THE Buyer_Detail_Screen SHALL display scrollbars only when the content exceeds the visible area
3. WHEN the user uses keyboard navigation (arrow keys, Page Up/Down), THE Buyer_Detail_Screen SHALL scroll the currently focused column
4. THE Buyer_Detail_Screen SHALL support mouse wheel scrolling for the column under the cursor
5. WHEN the user performs inline editing or opens modals, THE Buyer_Detail_Screen SHALL preserve the scroll positions of both columns

### Requirement 4: アクセシビリティ

**User Story:** As a user with accessibility needs, I want the independent scroll feature to be accessible, so that I can navigate the content using assistive technologies.

#### Acceptance Criteria

1. THE Buyer_Detail_Screen SHALL provide proper ARIA labels for each scrollable region
2. THE Buyer_Detail_Screen SHALL support keyboard-only navigation between columns
3. WHEN using screen readers, THE Buyer_Detail_Screen SHALL announce the current column and scroll position
4. THE Buyer_Detail_Screen SHALL maintain sufficient color contrast for scrollbars
