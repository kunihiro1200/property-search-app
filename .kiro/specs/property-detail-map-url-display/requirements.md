# Requirements Document

## Introduction

物件詳細ページの「地図　サイトURL等」セクションに、SUUMO URLと業務依頼の格納先URLを表示する機能を追加します。これにより、ユーザーは物件詳細ページから直接これらのURLにアクセスできるようになります。

## Glossary

- **System**: 売主管理システムのフロントエンドアプリケーション
- **PropertyListingDetailPage**: 物件詳細ページコンポーネント
- **SUUMO URL**: 物件のSUUMO掲載ページへのリンク（データベースフィールド: `suumo_url`）
- **格納先URL**: 業務依頼の格納先URL（データベースフィールド: `storage_location`）
- **地図　サイトURL等セクション**: 物件詳細ページ内の、Google MapやPDF URLなどを表示するセクション

## Requirements

### Requirement 1

**User Story:** As a 営業担当者, I want to view SUUMO URL in the property detail page, so that I can quickly access the SUUMO listing for the property.

#### Acceptance Criteria

1. WHEN the property detail page loads AND the property has a SUUMO URL THEN the System SHALL display the SUUMO URL in the "地図　サイトURL等" section
2. WHEN a user clicks on the displayed SUUMO URL THEN the System SHALL open the SUUMO page in a new browser tab
3. WHEN the property does not have a SUUMO URL THEN the System SHALL not display the SUUMO URL field in the section
4. WHEN displaying the SUUMO URL THEN the System SHALL show a clear label "SUUMO URL" above the link

### Requirement 2

**User Story:** As a 営業担当者, I want to view the storage location URL (格納先URL) in the property detail page, so that I can access the work task storage location.

#### Acceptance Criteria

1. WHEN the property detail page loads AND the property has a storage location URL THEN the System SHALL display the storage location URL in the "地図　サイトURL等" section
2. WHEN a user clicks on the displayed storage location URL THEN the System SHALL open the URL in a new browser tab
3. WHEN the property does not have a storage location URL THEN the System SHALL not display the storage location URL field in the section
4. WHEN displaying the storage location URL THEN the System SHALL show a clear label "格納先URL" above the link

### Requirement 3

**User Story:** As a 営業担当者, I want the URL fields to be displayed consistently with other fields in the section, so that the interface remains clean and easy to use.

#### Acceptance Criteria

1. WHEN displaying SUUMO URL and storage location URL THEN the System SHALL use the same styling and layout as existing URL fields in the section
2. WHEN multiple URL fields are present THEN the System SHALL display them in a logical order within the "地図　サイトURL等" section
3. WHEN the URLs are long THEN the System SHALL handle text overflow appropriately to maintain layout integrity
4. WHEN hovering over a URL link THEN the System SHALL provide visual feedback consistent with other links in the application
