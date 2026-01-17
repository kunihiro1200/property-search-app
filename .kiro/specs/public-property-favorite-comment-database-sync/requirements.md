# Requirements Document

## Introduction

公開物件サイトの詳細画面で「お気に入り文言」が表示されない問題を解決します。

**問題の根本原因:**
`PropertyDetailsService.upsertPropertyDetails` メソッドが、渡されたフィールドのみを更新するのではなく、**渡されていないフィールドを null で上書き**しています。これにより、`recommended_comments` や `athome_data` を保存する際に、`favorite_comment` が null で上書きされてしまいます。

**2026年1月14日 3:10-3:11頃に大量の `property_details` が更新され、その際に `favorite_comment` が削除されました。**

**解決策:**
1. `PropertyDetailsService.upsertPropertyDetails` メソッドを修正し、渡されたフィールドのみを更新するようにする
2. スプレッドシートから「お気に入り文言」を再取得し、`property_details` テーブルに保存する

**対象物件:**
- 一般・公開中
- 専任・公開中
- 非公開（配信メールのみ）

**対象外物件:**
- 非公開（専任）
- E外し非公開
- 非公開（一般）
- 他社物件

## Glossary

- **Property_Details**: 物件追加詳細情報テーブル（データベース）
- **Favorite_Comment**: お気に入り文言（画像上に表示するテキスト）
- **Gyomu_List**: 業務リスト（物件情報を管理するスプレッドシート）
- **Athome_Sheet**: 個別物件スプレッドシート内の「athome」シート
- **Property_Type**: 物件種別（土地、戸建て、マンション）
- **FavoriteCommentService**: お気に入り文言を取得するサービス
- **Complete_Endpoint**: `/api/public/properties/:id/complete` エンドポイント
- **Public_Properties**: 公開対象の物件（一般・公開中、専任・公開中、非公開（配信メールのみ））

## Requirements

### Requirement 1: PropertyDetailsService の修正

**User Story:** As a developer, I want the upsertPropertyDetails method to only update provided fields, so that existing data is not overwritten with null.

#### Acceptance Criteria

1. WHEN upsertPropertyDetails is called with partial data, THE System SHALL only update the provided fields
2. WHEN a field is not provided in the details object, THE System SHALL preserve the existing value in the database
3. THE System SHALL use PostgreSQL's COALESCE or similar technique to preserve existing values
4. THE System SHALL maintain backward compatibility with existing code
5. THE System SHALL log which fields are being updated

### Requirement 2: データベースへのお気に入り文言の同期

**User Story:** As a system administrator, I want to sync favorite comments from spreadsheets to the property_details table, so that they can be displayed on the public property site.

#### Acceptance Criteria

1. THE System SHALL retrieve favorite comments from spreadsheets using FavoriteCommentService
2. WHEN a favorite comment is retrieved, THE System SHALL save it to the `favorite_comment` column in the `property_details` table
3. THE System SHALL process only properties with atbb_status in ['一般・公開中', '専任・公開中', '非公開（配信メールのみ）']
4. THE System SHALL skip properties with atbb_status in ['非公開（専任）', 'E外し非公開', '非公開（一般）', '他社物件']
5. THE System SHALL handle errors gracefully and continue processing other properties
6. THE System SHALL log the sync progress and results
7. THE System SHALL skip properties that already have a favorite_comment in the database (unless force update is specified)

### Requirement 2: 公開物件サイトでの表示

**User Story:** As a user viewing a property detail page, I want to see the favorite comment, so that I can quickly understand the property's appeal.

#### Acceptance Criteria

1. WHEN a property has a favorite_comment in the database, THE System SHALL display it on the public property detail page
2. THE System SHALL display the favorite comment above the property images
3. THE System SHALL style the favorite comment with a yellow background and star icon
4. WHEN no favorite_comment exists in the database, THE System SHALL not display any favorite comment section
5. THE System SHALL not attempt to fetch from spreadsheet in real-time (use database only)

### Requirement 3: Complete エンドポイントの修正

**User Story:** As a frontend application, I want the /complete endpoint to return favorite comments from the database, so that I can display them on the property detail page.

#### Acceptance Criteria

1. THE `/api/public/properties/:id/complete` endpoint SHALL return the `favorite_comment` from the database
2. THE System SHALL prioritize database data over spreadsheet data
3. THE System SHALL not attempt to fetch from spreadsheet if database value exists
4. THE System SHALL return null for favorite_comment if not found in database
5. THE System SHALL maintain backward compatibility with existing response format

### Requirement 4: バッチ同期スクリプト

**User Story:** As a system administrator, I want a batch script to sync all favorite comments, so that I can populate the database efficiently.

#### Acceptance Criteria

1. THE System SHALL provide a batch script to sync favorite comments for all properties
2. THE System SHALL support filtering by property status (e.g., only public properties)
3. THE System SHALL support dry-run mode to preview changes without saving
4. THE System SHALL provide progress indicators during batch processing
5. THE System SHALL generate a summary report after completion
6. THE System SHALL support force update mode to overwrite existing data

### Requirement 5: エラーハンドリングとロギング

**User Story:** As a system administrator, I want detailed error logging, so that I can troubleshoot sync issues.

#### Acceptance Criteria

1. THE System SHALL log each property processed with its result (success/failure)
2. THE System SHALL log the reason for any failures
3. THE System SHALL continue processing other properties after a failure
4. THE System SHALL provide a summary of successes and failures at the end
5. THE System SHALL not crash the entire sync process due to a single property error

