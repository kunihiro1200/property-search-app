# Requirements Document

## Introduction

買主詳細ページのレイアウトを改善し、重要な情報セクションの視認性を向上させ、重複コンテンツを削除する。

## Glossary

- **買主詳細ページ (Buyer Detail Page)**: 個別の買主情報を表示・編集するページ
- **伝達事項 (Transfer Notes)**: 買主に関する一般的な伝達事項
- **内覧前伝達事項 (Pre-Viewing Notes)**: 内覧前に確認すべき特記事項
- **System**: 買主管理システム

## Requirements

### Requirement 1: 伝達事項セクションの背景色変更

**User Story:** As a user, I want the transfer notes section to have a light yellow background, so that I can easily identify important communication information.

#### Acceptance Criteria

1. THE System SHALL display the "伝達事項" section with a light yellow background color
2. THE System SHALL display the "内覧前伝達事項" section with a light yellow background color
3. THE System SHALL maintain readability of text content on the yellow background
4. THE System SHALL apply consistent styling across both sections

### Requirement 2: 重複セクションの削除

**User Story:** As a user, I want duplicate sections removed from the buyer detail page, so that the interface is cleaner and less confusing.

#### Acceptance Criteria

1. THE System SHALL display only one instance of the "内覧前伝達事項" section
2. WHEN the page loads, THE System SHALL not display duplicate content sections
3. THE System SHALL maintain all functionality of the remaining section
4. THE System SHALL preserve any existing data in the section
