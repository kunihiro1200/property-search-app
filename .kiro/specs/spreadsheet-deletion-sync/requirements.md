# Requirements Document

## Introduction

スプレッドシートとデータベース間の同期システムにおいて、現在は新規追加と更新のみが実装されており、削除の同期が未実装です。この機能により、スプレッドシートから削除された売主データがデータベースからも自動的に削除されるようになります。

## Glossary

- **System**: スプレッドシート同期システム
- **Spreadsheet**: Google Sheets上の売主リスト
- **Database**: Supabaseデータベース
- **Seller Record**: 売主データレコード
- **Sync Service**: 同期処理を実行するサービス
- **Deletion Sync**: スプレッドシートからの削除をデータベースに反映する処理

## Requirements

### Requirement 1

**User Story:** As a system administrator, I want deleted sellers from the spreadsheet to be automatically removed from the database, so that data consistency is maintained between the spreadsheet and database.

#### Acceptance Criteria

1. WHEN the Sync Service detects a Seller Record exists in the Database but not in the Spreadsheet THEN the System SHALL mark that Seller Record as deleted
2. WHEN a Seller Record is marked as deleted THEN the System SHALL remove all associated data including properties, activities, and relationships
3. WHEN deletion sync completes THEN the System SHALL log the deletion operation with seller number and timestamp
4. WHEN deletion sync encounters an error THEN the System SHALL rollback the deletion and log the error details
5. WHEN multiple Seller Records are deleted from the Spreadsheet THEN the System SHALL process all deletions in a single transaction

### Requirement 2

**User Story:** As a developer, I want the deletion sync to be safe and reversible, so that accidental deletions can be recovered.

#### Acceptance Criteria

1. WHEN a Seller Record is deleted THEN the System SHALL perform a soft delete by setting a deleted_at timestamp instead of hard deletion
2. WHEN a soft-deleted Seller Record exists THEN the System SHALL exclude it from all queries by default
3. WHEN a Seller Record is soft-deleted THEN the System SHALL preserve all associated data for potential recovery
4. WHEN the System performs deletion sync THEN the System SHALL create a backup record in the sync logs table
5. WHEN an administrator requests recovery THEN the System SHALL provide a mechanism to restore soft-deleted records

### Requirement 3

**User Story:** As a system operator, I want to monitor deletion sync operations, so that I can identify and resolve issues quickly.

#### Acceptance Criteria

1. WHEN deletion sync runs THEN the System SHALL record the number of deletions detected and processed
2. WHEN deletion sync completes THEN the System SHALL report success or failure status with details
3. WHEN deletion sync fails THEN the System SHALL send an alert notification to administrators
4. WHEN viewing sync logs THEN the System SHALL display deletion operations separately from additions and updates
5. WHEN a Seller Record is deleted THEN the System SHALL record the reason as "deleted from spreadsheet"

### Requirement 4

**User Story:** As a data integrity manager, I want validation before deletion, so that critical data is not accidentally removed.

#### Acceptance Criteria

1. WHEN the System detects a potential deletion THEN the System SHALL verify the Seller Record does not exist in the current Spreadsheet data
2. WHEN a Seller Record has active contracts or pending transactions THEN the System SHALL flag it for manual review before deletion
3. WHEN deletion validation fails THEN the System SHALL skip the deletion and log the validation failure
4. WHEN the System performs deletion sync THEN the System SHALL compare seller numbers case-insensitively
5. WHEN invalid seller number formats are detected THEN the System SHALL exclude them from deletion processing

### Requirement 5

**User Story:** As a system administrator, I want deletion sync to run automatically, so that data stays synchronized without manual intervention.

#### Acceptance Criteria

1. WHEN the auto-sync service runs THEN the System SHALL include deletion sync as part of the synchronization process
2. WHEN deletion sync is enabled THEN the System SHALL execute after addition and update syncs complete
3. WHEN the System performs deletion sync THEN the System SHALL respect the configured sync interval
4. WHEN deletion sync is disabled via configuration THEN the System SHALL skip deletion processing
5. WHEN the System starts THEN the System SHALL load deletion sync configuration from environment variables
