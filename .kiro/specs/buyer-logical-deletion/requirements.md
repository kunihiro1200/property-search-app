# Requirements Document

## Introduction

買主リストの論理削除機能は、スプレッドシートから削除された買主をデータベースでも論理削除（`deleted_at`フィールドを設定）する機能です。物理削除ではなく論理削除を使用することで、誤削除時の復元を可能にし、データの完全性を保ちます。

現在、スプレッドシートと買主データベースの同期は「追加」と「更新」のみをサポートしており、「削除」の同期は実装されていません。そのため、スプレッドシートから削除された買主がデータベースに残り続けています。

この機能は、将来的に売主リストや物件リストでも使用できる汎用的な設計とします。

## Glossary

- **System**: 買主リスト管理システム
- **Buyer**: 買主（不動産の購入希望者）
- **Spreadsheet**: Google スプレッドシート（買主リストの元データ）
- **Database**: Supabase PostgreSQL データベース
- **Logical_Deletion**: 論理削除（データを物理的に削除せず、削除フラグを設定する方式）
- **Physical_Deletion**: 物理削除（データを完全に削除する方式）
- **Deletion_Flag**: 削除フラグ（スプレッドシートの列）
- **Auto_Sync_Service**: 自動同期サービス（EnhancedAutoSyncService）
- **Administrator**: 管理者（削除された買主を表示・復元できるユーザー）

## Requirements

### Requirement 1: 論理削除の実装

**User Story:** As a system administrator, I want to use logical deletion instead of physical deletion, so that I can restore accidentally deleted buyers.

#### Acceptance Criteria

1. WHEN a buyer is marked as deleted, THE System SHALL set the `deleted_at` timestamp field
2. WHEN a buyer is marked as deleted, THE System SHALL preserve all buyer data in the database
3. WHEN a deleted buyer is restored, THE System SHALL set the `deleted_at` field to NULL
4. THE System SHALL NOT physically delete buyer records from the database

### Requirement 2: スプレッドシートとの同期

**User Story:** As a system administrator, I want the deletion status to sync from the spreadsheet, so that spreadsheet deletions are reflected in the database.

#### Acceptance Criteria

1. WHEN the Auto_Sync_Service runs, THE System SHALL read the Deletion_Flag column from the Spreadsheet
2. WHEN a buyer has Deletion_Flag set to TRUE in the Spreadsheet, THE System SHALL set `deleted_at` in the Database
3. WHEN a buyer has Deletion_Flag set to FALSE or empty in the Spreadsheet, THE System SHALL set `deleted_at` to NULL in the Database
4. WHEN the Deletion_Flag column does not exist in the Spreadsheet, THE System SHALL continue normal operation without errors
5. THE System SHALL sync deletion status every 5 minutes as part of the automatic sync process

### Requirement 3: フロントエンドでの非表示

**User Story:** As a user, I want deleted buyers to be hidden from the list, so that I only see active buyers.

#### Acceptance Criteria

1. WHEN fetching buyers from the API, THE System SHALL exclude buyers where `deleted_at` is not NULL by default
2. WHEN displaying the buyer list, THE System SHALL NOT show deleted buyers
3. WHEN searching for buyers, THE System SHALL NOT include deleted buyers in search results
4. WHEN accessing a deleted buyer's detail page directly, THE System SHALL display an error message

### Requirement 4: 削除された買主の表示（管理者用）

**User Story:** As an administrator, I want to view deleted buyers, so that I can verify deletions and restore buyers if needed.

#### Acceptance Criteria

1. WHEN an Administrator enables "Show Deleted" option, THE System SHALL include buyers where `deleted_at` is not NULL
2. WHEN displaying deleted buyers, THE System SHALL visually indicate that they are deleted
3. WHEN an Administrator views a deleted buyer's detail page, THE System SHALL display a "Deleted" badge
4. THE System SHALL display the deletion timestamp for deleted buyers

### Requirement 5: 復元機能

**User Story:** As an administrator, I want to restore deleted buyers, so that I can recover from accidental deletions.

#### Acceptance Criteria

1. WHEN an Administrator clicks the restore button on a deleted buyer, THE System SHALL set `deleted_at` to NULL
2. WHEN a buyer is restored, THE System SHALL immediately show the buyer in the active buyer list
3. WHEN the Spreadsheet Deletion_Flag is cleared, THE Auto_Sync_Service SHALL automatically restore the buyer
4. WHEN a buyer is restored, THE System SHALL preserve all original buyer data

### Requirement 6: データベーススキーマの拡張

**User Story:** As a developer, I want to add a `deleted_at` column to the buyers table, so that I can implement logical deletion.

#### Acceptance Criteria

1. THE System SHALL add a `deleted_at` column of type TIMESTAMP WITH TIME ZONE to the `buyers` table
2. THE `deleted_at` column SHALL be nullable
3. THE `deleted_at` column SHALL default to NULL for existing records
4. THE System SHALL create a database index on the `deleted_at` column for query performance

### Requirement 7: APIエンドポイントの拡張

**User Story:** As a developer, I want API endpoints to support filtering by deletion status, so that the frontend can display or hide deleted buyers.

#### Acceptance Criteria

1. WHEN the API endpoint `/api/buyers` is called without parameters, THE System SHALL return only non-deleted buyers
2. WHEN the API endpoint `/api/buyers?includeDeleted=true` is called, THE System SHALL return all buyers including deleted ones
3. WHEN the API endpoint `/api/buyers/:id` is called for a deleted buyer, THE System SHALL return 404 unless `includeDeleted=true` is specified
4. THE System SHALL add a `DELETE /api/buyers/:id` endpoint that sets `deleted_at` to the current timestamp
5. THE System SHALL add a `POST /api/buyers/:id/restore` endpoint that sets `deleted_at` to NULL

### Requirement 8: 汎用性の確保

**User Story:** As a developer, I want the logical deletion implementation to be reusable, so that I can apply it to sellers and properties in the future.

#### Acceptance Criteria

1. THE System SHALL implement logical deletion logic in a reusable service or utility
2. THE System SHALL use consistent naming conventions for deletion-related fields across all entities
3. THE System SHALL document the logical deletion pattern for future implementations
4. WHEN implementing logical deletion for other entities, THE System SHALL reuse the same deletion flag column name in spreadsheets
