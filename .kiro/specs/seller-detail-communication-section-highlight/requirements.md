# Requirements Document

## Introduction

売主詳細ページにおいて、伝達事項セクションの視認性を向上させ、重複表示を解消することで、ユーザーが重要な情報を見落とさないようにする。

## Glossary

- **伝達事項セクション**: 売主に関する重要な伝達事項を表示するUIセクション
- **内覧前伝達事項セクション**: 内覧前に確認すべき伝達事項を表示するUIセクション
- **売主詳細ページ**: 個別の売主情報を表示するページ (SellerDetailPage)

## Requirements

### Requirement 1: 伝達事項セクションの背景色変更

**User Story:** As a user, I want the communication sections to have a light yellow background, so that I can easily identify important information at a glance.

#### Acceptance Criteria

1. WHEN the seller detail page is displayed, THE System SHALL apply a light yellow background color to the "伝達事項" section
2. WHEN the seller detail page is displayed, THE System SHALL apply a light yellow background color to the "内覧前伝達事項" section
3. WHEN the background color is applied, THE System SHALL maintain text readability with appropriate contrast
4. THE System SHALL use a consistent yellow shade (e.g., #FFF9E6 or similar) across both sections

### Requirement 2: 重複セクションの削除

**User Story:** As a user, I want to see only one instance of the "内覧前伝達事項" section, so that I am not confused by duplicate information.

#### Acceptance Criteria

1. WHEN the seller detail page is displayed, THE System SHALL render only one "内覧前伝達事項" section
2. WHEN duplicate section code exists, THE System SHALL remove the redundant section from the component
3. WHEN the duplicate is removed, THE System SHALL preserve all functionality of the remaining section
4. THE System SHALL maintain the correct positioning of the remaining "内覧前伝達事項" section within the page layout
