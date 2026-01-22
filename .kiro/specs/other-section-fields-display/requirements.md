# Requirements Document

## Introduction

AA12903の売主詳細ページで「他」セクションの「サイト等」フィールドが空欄になっている問題を修正します。データベースには`site`カラムと`exclusion_site`カラムが存在しますが、フロントエンドのUIに表示されていないため、ユーザーがこれらのフィールドを確認・編集できません。

## Glossary

- **System**: 売主管理システム（Seller Management System）
- **Seller Detail Page**: 売主詳細ページ - 個別の売主情報を表示・編集するページ
- **Other Section**: 「他」セクション - 売主詳細ページ内の追加情報を表示するセクション
- **Site Field**: サイト等フィールド - 売主がどのサイトから問い合わせたかを記録するフィールド（`site`カラム）
- **Exclusion Site Field**: 除外サイトフィールド - 除外対象のサイトURLを記録するフィールド（`exclusion_site`カラム）

## Requirements

### Requirement 1

**User Story:** As a user, I want to view the "site" and "exclusion_site" fields in the seller detail page, so that I can see all relevant information about the seller.

#### Acceptance Criteria

1. WHEN a user views the seller detail page THEN the System SHALL display the "site" field in the "Other" section
2. WHEN a user views the seller detail page THEN the System SHALL display the "exclusion_site" field in the "Other" section
3. WHEN the "site" field contains data THEN the System SHALL display the value in the UI
4. WHEN the "site" field is empty THEN the System SHALL display an empty input field
5. WHEN the "exclusion_site" field contains data THEN the System SHALL display the value in the UI
6. WHEN the "exclusion_site" field is empty THEN the System SHALL display an empty input field

### Requirement 2

**User Story:** As a user, I want to edit the "site" and "exclusion_site" fields in the seller detail page, so that I can update seller information.

#### Acceptance Criteria

1. WHEN a user edits the "site" field THEN the System SHALL update the local state with the new value
2. WHEN a user edits the "exclusion_site" field THEN the System SHALL update the local state with the new value
3. WHEN a user clicks the save button THEN the System SHALL persist the "site" field value to the database
4. WHEN a user clicks the save button THEN the System SHALL persist the "exclusion_site" field value to the database
5. WHEN the save operation completes successfully THEN the System SHALL display a success message to the user

### Requirement 3

**User Story:** As a user, I want the "site" and "exclusion_site" fields to be properly labeled, so that I can understand what information each field contains.

#### Acceptance Criteria

1. WHEN the "site" field is displayed THEN the System SHALL show the label "サイト等"
2. WHEN the "exclusion_site" field is displayed THEN the System SHALL show the label "除外サイト"
3. WHEN the fields are displayed THEN the System SHALL position them in the "Other" section of the seller detail page
4. WHEN the fields are displayed THEN the System SHALL use consistent styling with other fields in the same section

### Requirement 4

**User Story:** As a developer, I want the backend API to include the "site" and "exclusion_site" fields in the seller data response, so that the frontend can display these fields.

#### Acceptance Criteria

1. WHEN the backend retrieves seller data THEN the System SHALL include the "site" field in the response
2. WHEN the backend retrieves seller data THEN the System SHALL include the "exclusion_site" field in the response
3. WHEN the backend updates seller data THEN the System SHALL accept the "site" field in the request payload
4. WHEN the backend updates seller data THEN the System SHALL accept the "exclusion_site" field in the request payload
5. WHEN the backend updates seller data THEN the System SHALL persist both fields to the database
