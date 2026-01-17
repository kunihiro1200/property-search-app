# Requirements Document

## Introduction

sellersテーブルの`comments`カラムを削除する。このカラムはマイグレーション009で追加されたが、売主リストスプレッドシートには対応するカラムが存在しないため、データベースとスプレッドシートのスキーマの不一致を解消する必要がある。

## Glossary

- **Sellers_Table**: データベース内の売主情報を格納するテーブル
- **Comments_Column**: sellersテーブル内の`comments`カラム（TEXT型）
- **Migration**: データベーススキーマの変更を管理するSQLスクリプト
- **Spreadsheet_Schema**: 売主リストスプレッドシートのカラム構造

## Requirements

### Requirement 1: commentsカラムの削除

**User Story:** As a developer, I want to remove the comments column from the sellers table, so that the database schema matches the spreadsheet schema.

#### Acceptance Criteria

1. WHEN the migration is executed, THE Sellers_Table SHALL no longer contain the comments column
2. WHEN the migration is executed, THE Migration SHALL preserve all other data in the sellers table
3. WHEN the migration is executed, THE Migration SHALL create a rollback script for recovery if needed
4. WHEN the migration completes, THE System SHALL verify that the comments column has been successfully removed

### Requirement 2: マイグレーションの実行と検証

**User Story:** As a developer, I want to execute the migration safely, so that I can ensure the database remains in a consistent state.

#### Acceptance Criteria

1. WHEN creating the migration file, THE System SHALL follow the existing migration naming convention (087_remove_comments_from_sellers.sql)
2. WHEN executing the migration, THE System SHALL log the execution status
3. WHEN the migration fails, THE System SHALL provide clear error messages
4. WHEN the migration completes, THE System SHALL verify the schema change through a verification script

### Requirement 3: ロールバック機能

**User Story:** As a developer, I want a rollback script, so that I can restore the comments column if needed.

#### Acceptance Criteria

1. WHEN creating the migration, THE System SHALL create a corresponding rollback script (087_remove_comments_from_sellers_rollback.sql)
2. WHEN the rollback is executed, THE Sellers_Table SHALL restore the comments column with the same data type (TEXT)
3. WHEN the rollback is executed, THE System SHALL restore the column comment documentation
4. WHEN the rollback completes, THE System SHALL verify that the comments column has been successfully restored

### Requirement 4: スキーマキャッシュの更新

**User Story:** As a developer, I want PostgREST schema cache to be updated, so that API endpoints reflect the schema changes immediately.

#### Acceptance Criteria

1. WHEN the migration completes, THE System SHALL send a NOTIFY signal to reload the PostgREST schema cache
2. WHEN the schema cache is reloaded, THE API SHALL no longer expose the comments column in the sellers endpoint
3. WHEN querying the sellers table through the API, THE System SHALL not return errors related to the comments column
