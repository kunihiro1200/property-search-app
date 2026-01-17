# Requirements Document

## Introduction

買主同期システムにおいて、`last_synced_at`と`updated_at`カラムがPostgRESTのスキーマキャッシュに認識されない問題が発生しています。Supabaseプロジェクトの再起動を何度も試みましたが失敗しているため、これらのカラムに依存しない全件同期方式に変更する必要があります。

## Glossary

- **System**: 買主同期システム
- **Buyer_Sync_Service**: 買主データをスプレッドシートからデータベースに同期するサービス
- **PostgREST**: SupabaseのREST APIレイヤー
- **Schema_Cache**: PostgRESTがデータベーススキーマ情報をキャッシュする仕組み
- **Full_Sync**: すべての買主データを毎回同期する方式
- **Incremental_Sync**: 変更された買主データのみを同期する方式（現在使用不可）

## Requirements

### Requirement 1: 全件同期方式への移行

**User Story:** As a system administrator, I want the sync to work without relying on last_synced_at and updated_at columns, so that buyer 6648 and other buyers can be synced successfully.

#### Acceptance Criteria

1. THE System SHALL fetch all buyers from the spreadsheet on every sync
2. THE System SHALL not use last_synced_at or updated_at columns for filtering
3. WHEN syncing all buyers, THE System SHALL use upsert operations based on buyer_number
4. THE System SHALL complete a full sync of 4000+ buyers within 15 minutes
5. THE System SHALL log the total number of buyers processed in each sync

### Requirement 2: 同期パフォーマンスの最適化

**User Story:** As a system administrator, I want full sync to be performant, so that it doesn't overload the system or take too long.

#### Acceptance Criteria

1. THE System SHALL process buyers in batches of 50 to balance speed and memory usage
2. THE System SHALL use connection pooling to minimize database connection overhead
3. THE System SHALL implement rate limiting to avoid overwhelming the Supabase API
4. WHEN sync is in progress, THE System SHALL provide progress updates every 500 buyers
5. THE System SHALL measure and log sync duration and throughput (buyers per second)

### Requirement 3: データ整合性の保証

**User Story:** As a system administrator, I want to ensure that full sync maintains data integrity, so that no data is lost or corrupted.

#### Acceptance Criteria

1. THE System SHALL use buyer_number as the unique identifier for all upsert operations
2. WHEN a buyer already exists, THE System SHALL update all fields except created_at
3. THE System SHALL preserve the original created_at timestamp when updating
4. THE System SHALL update a synced_at timestamp on every successful sync
5. THE System SHALL verify that the final buyer count in database matches spreadsheet

### Requirement 4: エラーハンドリングと回復

**User Story:** As a system administrator, I want robust error handling, so that sync failures don't result in data loss or inconsistency.

#### Acceptance Criteria

1. WHEN a buyer sync fails, THE System SHALL log the error with buyer_number and error details
2. THE System SHALL continue syncing remaining buyers even if one buyer fails
3. THE System SHALL provide a summary report at the end showing success and failure counts
4. WHEN sync completes with errors, THE System SHALL send an alert with failed buyer numbers
5. THE System SHALL provide a retry mechanism for failed buyers

### Requirement 5: 同期状況の監視

**User Story:** As a system administrator, I want to monitor sync progress and health, so that I can identify issues quickly.

#### Acceptance Criteria

1. THE System SHALL log sync start time, end time, and duration
2. THE System SHALL log the number of buyers created, updated, and failed
3. THE System SHALL calculate and log the sync success rate (percentage)
4. WHEN sync success rate is below 95%, THE System SHALL send an alert
5. THE System SHALL provide a dashboard or API endpoint to query sync statistics

### Requirement 6: 買主6648の同期検証

**User Story:** As a system administrator, I want to verify that buyer 6648 is synced correctly, so that I can confirm the fix works.

#### Acceptance Criteria

1. THE System SHALL sync buyer 6648 from the spreadsheet
2. WHEN buyer 6648 is synced, THE System SHALL verify all fields match the spreadsheet
3. THE System SHALL log the successful sync of buyer 6648 with timestamp
4. THE System SHALL provide a verification script to check buyer 6648 in the database
5. THE System SHALL confirm that buyer 6648 appears in the buyers list API

### Requirement 7: 後方互換性の維持

**User Story:** As a developer, I want the sync service to maintain backward compatibility, so that existing code doesn't break.

#### Acceptance Criteria

1. THE System SHALL keep the last_synced_at and updated_at columns in the schema
2. THE System SHALL continue to update these columns even though they're not used for filtering
3. THE System SHALL not break existing queries or reports that reference these columns
4. THE System SHALL document that these columns are no longer used for incremental sync
5. THE System SHALL provide a migration path if incremental sync is restored in the future

### Requirement 8: ドキュメントと運用ガイド

**User Story:** As a system administrator, I want clear documentation, so that I understand the new sync approach and can troubleshoot issues.

#### Acceptance Criteria

1. THE System SHALL document why full sync was chosen over incremental sync
2. THE System SHALL provide a comparison of full sync vs incremental sync performance
3. THE System SHALL document the sync process flow with diagrams
4. THE System SHALL provide troubleshooting steps for common sync issues
5. THE System SHALL document how to verify sync success and data integrity
