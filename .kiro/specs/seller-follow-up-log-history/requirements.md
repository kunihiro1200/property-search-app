# Requirements Document

## Introduction

売主追客ログの履歴データを通話モードページに表示する機能。これまでAPPSHEETで管理していた過去の追客活動記録を、KIROシステムの通話モードページで閲覧できるようにする。現在のシステムでは自動的に通話履歴が記録されるため、この機能は過去データの参照専用となる。

## Glossary

- **売主追客ログ**: 売主への追客活動を記録したデータ。日付、担当者、コメント、架電状況などを含む
- **通話モードページ**: 売主詳細ページ内の通話関連機能を集約したページ
- **追客ログフィールド**: 通話モードページ内の既存の追客ログ表示エリア
- **スプレッドシート**: Google Sheets上の売主追客ログデータ（ID: 1wKBRLWbT6pSKa9IlTDabjhjTnfs_GxX6Rn6M6kbio1I、シート名: 売主追客ログ）
- **System**: KIROの売主管理システム

## Requirements

### Requirement 1

**User Story:** As a real estate agent, I want to view historical follow-up log data from APPSHEET, so that I can understand past communication activities with sellers before the current system was implemented.

#### Acceptance Criteria

1. WHEN the System displays the call mode page THEN the System SHALL render a follow-up log history table below the current follow-up log field
2. WHEN the System retrieves follow-up log data from the spreadsheet THEN the System SHALL include the following columns: date, follow-up log ID, seller number, comment, assignee (first half), assignee (second half), assignee (all), assignee (half), first half completed, second half completed, and second call due to no answer
3. WHEN the System displays the follow-up log history table THEN the System SHALL present data in chronological order with the most recent entries first
4. WHEN the System loads the call mode page THEN the System SHALL fetch follow-up log data from the spreadsheet with ID "1wKBRLWbT6pSKa9IlTDabjhjTnfs_GxX6Rn6M6kbio1I" and sheet name "売主追客ログ"
5. WHEN the System filters follow-up log data THEN the System SHALL display only records matching the current seller number

### Requirement 2

**User Story:** As a real estate agent, I want the historical follow-up log data to be clearly separated from current system data, so that I can distinguish between legacy APPSHEET records and new automatic call logs.

#### Acceptance Criteria

1. WHEN the System displays the follow-up log history table THEN the System SHALL position it below the current follow-up log field with clear visual separation
2. WHEN the System renders the follow-up log history section THEN the System SHALL include a header label indicating this is historical data from APPSHEET
3. WHEN the System displays the table THEN the System SHALL use a distinct visual style to differentiate historical data from current system data
4. WHEN the System presents the follow-up log history THEN the System SHALL display it as read-only data without edit capabilities

### Requirement 3

**User Story:** As a real estate agent, I want the follow-up log history table to display all relevant columns from the spreadsheet, so that I can access complete historical information about past follow-up activities.

#### Acceptance Criteria

1. WHEN the System displays the date column THEN the System SHALL format dates in a consistent and readable format (YYYY/MM/DD HH:MM)
2. WHEN the System displays the assignee columns THEN the System SHALL show assignee initials or names as stored in the spreadsheet
3. WHEN the System displays boolean fields (first half completed, second half completed, second call due to no answer) THEN the System SHALL render them as clear visual indicators (checkmarks, icons, or text)
4. WHEN the System displays the comment column THEN the System SHALL show the full comment text with appropriate text wrapping
5. WHEN the System displays the follow-up log ID and seller number THEN the System SHALL present them as reference identifiers

### Requirement 4

**User Story:** As a real estate agent, I want the follow-up log history table to load efficiently, so that I can access historical data without significant delays.

#### Acceptance Criteria

1. WHEN the System fetches follow-up log data from the spreadsheet THEN the System SHALL complete the request within 3 seconds under normal network conditions
2. WHEN the System encounters an error fetching spreadsheet data THEN the System SHALL display an appropriate error message to the user
3. WHEN the System loads the call mode page THEN the System SHALL cache follow-up log data to minimize repeated spreadsheet API calls
4. WHEN the System displays a large number of historical records THEN the System SHALL implement pagination or virtual scrolling to maintain performance

### Requirement 5

**User Story:** As a system administrator, I want the follow-up log history feature to integrate with existing spreadsheet sync infrastructure, so that we can leverage established data access patterns.

#### Acceptance Criteria

1. WHEN the System accesses the follow-up log spreadsheet THEN the System SHALL use the existing Google Sheets API integration
2. WHEN the System maps spreadsheet columns to table fields THEN the System SHALL use a configurable column mapping similar to other sync services
3. WHEN the System syncs follow-up log data THEN the System SHALL respect existing authentication and authorization mechanisms
4. WHEN the System encounters spreadsheet access errors THEN the System SHALL log errors using the existing error logging infrastructure

### Requirement 6

**User Story:** As a real estate agent, I want to manually refresh the follow-up log history data, so that I can see the latest updates from the spreadsheet when needed.

#### Acceptance Criteria

1. WHEN the System displays the follow-up log history section THEN the System SHALL provide a refresh button or control
2. WHEN a user clicks the refresh button THEN the System SHALL fetch the latest data from the spreadsheet
3. WHEN the System refreshes follow-up log data THEN the System SHALL display a loading indicator during the fetch operation
4. WHEN the System completes the refresh operation THEN the System SHALL update the table with the latest data and display a success notification
5. WHEN the System encounters an error during refresh THEN the System SHALL display an appropriate error message without clearing existing data

### Requirement 7

**User Story:** As a real estate agent, I want the follow-up log history data to be automatically synced periodically, so that I can see recent updates without manual intervention.

#### Acceptance Criteria

1. WHEN the System loads the call mode page THEN the System SHALL check the age of cached follow-up log data
2. WHEN cached follow-up log data is older than 5 minutes THEN the System SHALL automatically fetch fresh data from the spreadsheet
3. WHEN the System performs automatic sync THEN the System SHALL do so in the background without blocking user interaction
4. WHEN automatic sync completes THEN the System SHALL update the display with new data if any changes are detected
5. WHEN automatic sync fails THEN the System SHALL continue displaying cached data and log the error without disrupting the user experience
