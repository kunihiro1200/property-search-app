# Requirements Document

## Introduction

通話モードページに「他」セクションを追加し、売主がどのサイトから問い合わせてきたかを記録できるようにする機能です。これにより、マーケティング効果の測定と顧客獲得チャネルの分析が可能になります。

## Glossary

- **通話モードページ (Call Mode Page)**: 売主との通話中に使用する専用ページで、売主情報、物件情報、ステータス更新などを一画面で管理できるインターフェース
- **他セクション (Other Section)**: 通話モードページの一番下に配置される新しいセクションで、その他の情報を記録するためのエリア
- **サイトフィールド (Site Field)**: 売主がどのウェブサイトや媒体から問い合わせてきたかを記録するドロップダウン選択フィールド
- **売主 (Seller)**: 不動産の売却を検討している顧客
- **System**: 不動産管理システム全体

## Requirements

### Requirement 1

**User Story:** As a sales representative, I want to record which website or channel a seller came from, so that I can track marketing effectiveness and customer acquisition sources.

#### Acceptance Criteria

1. WHEN the Call Mode Page loads THEN the System SHALL display an "Other" section at the bottom of the left panel
2. WHEN a user views the "Other" section THEN the System SHALL display a "Site" dropdown field with predefined options
3. WHEN a user selects a site option THEN the System SHALL save the selection to the seller record
4. WHEN a user views a seller with a previously saved site value THEN the System SHALL display the saved site value in the dropdown
5. THE System SHALL provide the following site options in the dropdown: "ウビ", "HおYすaL", "エ近所", "チP紹", "リ買", "HP", "知合", "at-home", "の掲載を見て", "2件目以降査定"

### Requirement 2

**User Story:** As a sales representative, I want to edit the site information easily, so that I can correct mistakes or update information during a call.

#### Acceptance Criteria

1. WHEN a user clicks the edit button in the "Other" section THEN the System SHALL enable editing mode for the site field
2. WHEN a user is in editing mode THEN the System SHALL allow the user to change the site selection
3. WHEN a user clicks save in editing mode THEN the System SHALL persist the updated site value to the database
4. WHEN a user clicks cancel in editing mode THEN the System SHALL revert to the previously saved site value
5. WHEN the save operation completes successfully THEN the System SHALL display a success message to the user

### Requirement 3

**User Story:** As a system administrator, I want the site information to be stored in the database, so that it can be used for reporting and analytics.

#### Acceptance Criteria

1. WHEN a user saves site information THEN the System SHALL store the value in the sellers table
2. WHEN retrieving seller data THEN the System SHALL include the site field in the response
3. WHEN updating seller data THEN the System SHALL validate that the site value is one of the predefined options or null
4. WHEN a database migration is required THEN the System SHALL add a new column to store site information without data loss
5. THE System SHALL allow the site field to be nullable to support existing seller records
