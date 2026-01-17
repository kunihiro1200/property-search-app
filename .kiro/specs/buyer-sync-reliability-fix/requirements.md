# Requirements Document

## Introduction

買主リストの同期において、356人（全体の8.6%）の買主がデータベースに同期されていない深刻な問題が発見されました。この問題は、データベースのVARCHAR(50)フィールド長制限により、長いテキストを含む買主データが同期エラーになることが原因です。この問題を根本的に解決し、今後同様の問題が発生しないようにする必要があります。

## Glossary

- **System**: 買主同期システム
- **Buyer_Sync_Service**: 買主データをスプレッドシートからデータベースに同期するサービス
- **Migration_050**: すべてのVARCHAR(50)フィールドをTEXT型に変更するデータベースマイグレーション
- **Sync_Error_Log**: 同期エラーを記録するログテーブル
- **Retry_Queue**: 失敗した同期をリトライするためのキュー
- **Monitoring_Service**: 同期状況を監視し、異常を検知するサービス

## Requirements

### Requirement 1: データベーススキーマの修正

**User Story:** As a system administrator, I want all VARCHAR(50) fields to be converted to TEXT, so that long text data can be stored without errors.

#### Acceptance Criteria

1. THE System SHALL execute Migration 050 to convert all VARCHAR(50) fields to TEXT
2. WHEN Migration 050 is executed, THE System SHALL verify that all text fields in the buyers table are TEXT type
3. IF Migration 050 fails, THEN THE System SHALL provide clear error messages and manual execution instructions
4. WHEN Migration 050 completes, THE System SHALL log the successful conversion of all fields

### Requirement 2: 未同期買主の特定と同期

**User Story:** As a system administrator, I want to identify and sync all missing buyers, so that the database is complete and accurate.

#### Acceptance Criteria

1. THE System SHALL compare buyer counts between spreadsheet and database
2. WHEN buyer counts differ, THE System SHALL identify specific buyer numbers that are missing
3. THE System SHALL provide a report listing all missing buyer numbers with their row numbers
4. THE System SHALL sync all missing buyers after Migration 050 is complete
5. WHEN syncing missing buyers, THE System SHALL log each successful sync with buyer number and timestamp

### Requirement 3: 同期エラーの記録と追跡

**User Story:** As a system administrator, I want all sync errors to be logged, so that I can identify and fix recurring problems.

#### Acceptance Criteria

1. WHEN a buyer sync fails, THE System SHALL record the error in Sync_Error_Log table
2. THE Sync_Error_Log SHALL include buyer_number, row_number, error_message, error_type, and timestamp
3. THE System SHALL categorize errors by type (field_length, data_type, constraint_violation, unknown)
4. THE System SHALL provide a query interface to retrieve error logs by date range, error type, or buyer number
5. THE System SHALL retain error logs for at least 90 days

### Requirement 4: 自動リトライメカニズム

**User Story:** As a system administrator, I want failed syncs to be automatically retried, so that transient errors don't result in missing data.

#### Acceptance Criteria

1. WHEN a buyer sync fails with a retryable error, THE System SHALL add it to Retry_Queue
2. THE System SHALL retry failed syncs up to 3 times with exponential backoff (1min, 5min, 15min)
3. WHEN a retry succeeds, THE System SHALL remove the entry from Retry_Queue and log the success
4. WHEN all retries fail, THE System SHALL mark the entry as permanently failed and send an alert
5. THE System SHALL not retry errors that are not retryable (schema errors, constraint violations)

### Requirement 5: 同期状況の監視とアラート

**User Story:** As a system administrator, I want to be alerted when sync issues occur, so that I can take action before data loss becomes significant.

#### Acceptance Criteria

1. THE Monitoring_Service SHALL check sync health every 5 minutes
2. WHEN the difference between spreadsheet and database exceeds 10 buyers, THE System SHALL send an alert
3. WHEN sync error rate exceeds 5% in the last hour, THE System SHALL send an alert
4. WHEN a buyer has failed all retry attempts, THE System SHALL send an alert with buyer details
5. THE System SHALL provide a dashboard showing sync statistics (success rate, error rate, missing count)

### Requirement 6: 同期の冪等性保証

**User Story:** As a system administrator, I want syncs to be idempotent, so that running sync multiple times doesn't create duplicate or inconsistent data.

#### Acceptance Criteria

1. THE System SHALL use buyer_number as the unique identifier for upsert operations
2. WHEN syncing a buyer that already exists, THE System SHALL update the existing record
3. THE System SHALL preserve the original created_at timestamp when updating
4. THE System SHALL update synced_at and db_updated_at timestamps on every sync
5. THE System SHALL not create duplicate buyers even if sync is run concurrently

### Requirement 7: スキーマ検証の自動化

**User Story:** As a developer, I want schema changes to be validated automatically, so that field length issues are caught before deployment.

#### Acceptance Criteria

1. THE System SHALL validate that all text fields in buyers table are TEXT type before sync
2. WHEN a VARCHAR field is detected, THE System SHALL fail the sync and report the field name
3. THE System SHALL provide a schema validation script that can be run manually
4. THE System SHALL include schema validation in the CI/CD pipeline
5. THE System SHALL document all text fields that must be TEXT type

### Requirement 8: 同期パフォーマンスの最適化

**User Story:** As a system administrator, I want syncs to complete quickly, so that data is up-to-date and system resources are used efficiently.

#### Acceptance Criteria

1. THE System SHALL process buyers in batches of 100
2. THE System SHALL complete a full sync of 4000+ buyers within 10 minutes
3. THE System SHALL use connection pooling to minimize database connection overhead
4. THE System SHALL log sync duration and throughput (buyers per second)
5. WHEN sync takes longer than 15 minutes, THE System SHALL send a performance alert

### Requirement 9: データ整合性の検証

**User Story:** As a system administrator, I want to verify data integrity after sync, so that I can trust the synced data is accurate.

#### Acceptance Criteria

1. THE System SHALL verify that all buyers in spreadsheet exist in database after sync
2. THE System SHALL compare sample buyer data between spreadsheet and database
3. WHEN data mismatches are detected, THE System SHALL report the specific fields and values
4. THE System SHALL provide a verification report with pass/fail status
5. THE System SHALL fail the sync if critical data integrity checks fail

### Requirement 10: ドキュメントとトラブルシューティングガイド

**User Story:** As a developer or system administrator, I want clear documentation, so that I can understand and troubleshoot sync issues.

#### Acceptance Criteria

1. THE System SHALL provide a troubleshooting guide for common sync errors
2. THE System SHALL document the complete sync process flow with diagrams
3. THE System SHALL provide runbooks for manual intervention scenarios
4. THE System SHALL document all environment variables and configuration options
5. THE System SHALL include examples of how to query error logs and interpret results

