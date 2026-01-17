# Requirements Document: Auto-Sync Diagnostic Tool

## Introduction

自動同期の状態を診断するツールを作成します。同期ログ、最終更新日時、データ件数、エラーログ、環境変数の設定状況を確認し、問題を特定できるようにします。

## Glossary

- **Auto_Sync_System**: スプレッドシートからデータベースへの自動同期を管理するシステム
- **Sync_Log**: 同期の実行履歴を記録するログテーブル
- **Diagnostic_Script**: 自動同期の状態を診断するスクリプト

## Requirements

### Requirement 1: Sync Log Verification

**User Story:** As a developer, I want to check the sync logs, so that I can verify if auto-sync is running.

#### Acceptance Criteria

1. WHEN the Diagnostic_Script executes THEN it SHALL query the sync_logs table and display the latest 10 sync records
2. WHEN sync logs exist THEN the script SHALL display sync type, status, timestamp, and message for each log
3. WHEN no sync logs exist THEN the script SHALL display a warning message

### Requirement 2: Data Freshness Check

**User Story:** As a developer, I want to check when data was last updated, so that I can identify stale data.

#### Acceptance Criteria

1. WHEN the Diagnostic_Script executes THEN it SHALL query the latest updated_at timestamp from property_listings table
2. WHEN the Diagnostic_Script executes THEN it SHALL query the latest updated_at timestamp from buyers table
3. WHEN data hasn't been updated for more than 24 hours THEN the script SHALL display a warning

### Requirement 3: Data Count Verification

**User Story:** As a developer, I want to check the total count of records, so that I can verify data completeness.

#### Acceptance Criteria

1. WHEN the Diagnostic_Script executes THEN it SHALL count total records in property_listings table
2. WHEN the Diagnostic_Script executes THEN it SHALL count total records in buyers table
3. WHEN counts are retrieved THEN the script SHALL display them clearly

### Requirement 4: Error Log Analysis

**User Story:** As a developer, I want to see recent sync errors, so that I can troubleshoot issues.

#### Acceptance Criteria

1. WHEN the Diagnostic_Script executes THEN it SHALL query sync_logs for records with status='error'
2. WHEN error logs exist THEN the script SHALL display the latest 5 errors with timestamps and error messages
3. WHEN no errors exist THEN the script SHALL display a success message

### Requirement 5: Environment Variable Check

**User Story:** As a developer, I want to verify environment variables, so that I can ensure proper configuration.

#### Acceptance Criteria

1. WHEN the Diagnostic_Script executes THEN it SHALL check if GOOGLE_SHEETS_SPREADSHEET_ID is set
2. WHEN the Diagnostic_Script executes THEN it SHALL check if GOOGLE_SERVICE_ACCOUNT_EMAIL is set
3. WHEN the Diagnostic_Script executes THEN it SHALL check if GOOGLE_PRIVATE_KEY is set
4. WHEN an environment variable is missing THEN the script SHALL display an error message
5. WHEN environment variables are set THEN the script SHALL validate their format (e.g., email format, key format)
6. WHEN environment variable validation fails THEN the script SHALL provide specific guidance on correct format

### Requirement 6: Database Connection Verification

**User Story:** As a developer, I want to verify database connectivity, so that I can identify connection issues.

#### Acceptance Criteria

1. WHEN the Diagnostic_Script executes THEN it SHALL attempt to connect to the database
2. WHEN database connection fails THEN the script SHALL display the specific error message
3. WHEN database connection succeeds THEN the script SHALL verify table existence (sync_logs, property_listings, buyers)
4. WHEN required tables are missing THEN the script SHALL recommend running migrations
5. WHEN connection timeout occurs THEN the script SHALL suggest checking DATABASE_URL and network connectivity

### Requirement 7: Google Sheets Connection Verification

**User Story:** As a developer, I want to verify Google Sheets connectivity, so that I can identify authentication issues.

#### Acceptance Criteria

1. WHEN the Diagnostic_Script executes THEN it SHALL attempt to authenticate with Google Sheets API
2. WHEN authentication fails THEN the script SHALL display the specific error (e.g., invalid credentials, permission denied)
3. WHEN authentication succeeds THEN the script SHALL attempt to read the first row of the spreadsheet
4. WHEN spreadsheet access fails THEN the script SHALL suggest checking spreadsheet ID and sharing permissions
5. WHEN API quota is exceeded THEN the script SHALL display quota information and suggest waiting

### Requirement 8: Actionable Recommendations

**User Story:** As a developer, I want to receive actionable recommendations, so that I can fix issues quickly.

#### Acceptance Criteria

1. WHEN the Diagnostic_Script completes THEN it SHALL provide a list of recommended actions based on findings
2. WHEN sync logs are stale THEN the script SHALL recommend checking if auto-sync is enabled and restarting the backend
3. WHEN errors exist THEN the script SHALL recommend reviewing error messages and provide links to relevant documentation
4. WHEN environment variables are missing THEN the script SHALL recommend updating .env file with example values
5. WHEN database connection fails THEN the script SHALL provide step-by-step troubleshooting guide
6. WHEN Google Sheets authentication fails THEN the script SHALL provide authentication setup guide
7. WHEN multiple issues are detected THEN the script SHALL prioritize recommendations by severity (critical, warning, info)


### Requirement 9: Error Classification and Handling

**User Story:** As a developer, I want errors to be classified by type, so that I can quickly identify the root cause.

#### Acceptance Criteria

1. WHEN the Diagnostic_Script encounters an error THEN it SHALL classify it into one of the following categories:
   - DATABASE_CONNECTION_ERROR: Cannot connect to database
   - DATABASE_QUERY_ERROR: Query execution failed
   - GOOGLE_SHEETS_AUTH_ERROR: Authentication with Google Sheets failed
   - GOOGLE_SHEETS_ACCESS_ERROR: Cannot access spreadsheet
   - ENVIRONMENT_CONFIG_ERROR: Missing or invalid environment variables
   - SYNC_EXECUTION_ERROR: Sync process failed during execution
   - UNKNOWN_ERROR: Unclassified error
2. WHEN an error is classified THEN the script SHALL display the error category prominently
3. WHEN an error is classified THEN the script SHALL provide category-specific troubleshooting steps
4. WHEN multiple errors occur THEN the script SHALL continue diagnosis and report all errors at the end

### Requirement 10: Diagnostic Report Generation

**User Story:** As a developer, I want a comprehensive diagnostic report, so that I can share it with the team or save it for later reference.

#### Acceptance Criteria

1. WHEN the Diagnostic_Script completes THEN it SHALL generate a summary report including:
   - Diagnostic execution timestamp
   - Overall health status (HEALTHY, WARNING, CRITICAL)
   - List of all checks performed with pass/fail status
   - List of all errors encountered with details
   - List of all recommendations prioritized by severity
2. WHEN the report is generated THEN it SHALL be displayed in a clear, formatted manner
3. WHEN the report is generated THEN it SHALL optionally save to a file (e.g., diagnostic-report-YYYY-MM-DD-HH-mm-ss.txt)
4. WHEN the overall status is CRITICAL THEN the script SHALL exit with a non-zero exit code

### Requirement 11: Retry Logic for Transient Errors

**User Story:** As a developer, I want the diagnostic tool to retry transient errors, so that temporary network issues don't cause false alarms.

#### Acceptance Criteria

1. WHEN a database connection attempt fails THEN the script SHALL retry up to 3 times with exponential backoff (1s, 2s, 4s)
2. WHEN a Google Sheets API call fails with a transient error (e.g., 429 rate limit, 503 service unavailable) THEN the script SHALL retry up to 3 times
3. WHEN all retry attempts fail THEN the script SHALL report the error as persistent
4. WHEN a retry succeeds THEN the script SHALL log the retry count and continue normally

### Requirement 12: Verbose Mode

**User Story:** As a developer, I want a verbose mode for detailed debugging, so that I can see exactly what the diagnostic tool is doing.

#### Acceptance Criteria

1. WHEN the Diagnostic_Script is run with --verbose flag THEN it SHALL display detailed logs for each step
2. WHEN verbose mode is enabled THEN the script SHALL display:
   - SQL queries being executed
   - API requests being made
   - Environment variables being checked (with values masked for sensitive data)
   - Retry attempts and backoff delays
3. WHEN verbose mode is disabled THEN the script SHALL display only summary information

## Error Handling Scenarios

### Scenario 1: Database Connection Failure

**Given** the database is not accessible  
**When** the diagnostic script attempts to connect  
**Then** it SHALL:
1. Retry connection 3 times with exponential backoff
2. Display error message: "❌ DATABASE_CONNECTION_ERROR: Cannot connect to database"
3. Display connection string (with password masked)
4. Suggest checking:
   - DATABASE_URL environment variable
   - Database server is running
   - Network connectivity
   - Firewall settings
5. Provide example DATABASE_URL format
6. Mark overall status as CRITICAL

### Scenario 2: Missing Environment Variables

**Given** GOOGLE_SHEETS_SPREADSHEET_ID is not set  
**When** the diagnostic script checks environment variables  
**Then** it SHALL:
1. Display error message: "❌ ENVIRONMENT_CONFIG_ERROR: GOOGLE_SHEETS_SPREADSHEET_ID is not set"
2. Suggest adding to .env file
3. Provide example value format
4. Mark overall status as CRITICAL

### Scenario 3: Google Sheets Authentication Failure

**Given** Google service account credentials are invalid  
**When** the diagnostic script attempts to authenticate  
**Then** it SHALL:
1. Display error message: "❌ GOOGLE_SHEETS_AUTH_ERROR: Authentication failed"
2. Display the specific error from Google API
3. Suggest checking:
   - GOOGLE_SERVICE_ACCOUNT_EMAIL format
   - GOOGLE_PRIVATE_KEY format (check for newlines, BEGIN/END markers)
   - Service account has been granted access to the spreadsheet
4. Provide link to Google Sheets API setup guide
5. Mark overall status as CRITICAL

### Scenario 4: Stale Sync Logs

**Given** the last sync was more than 24 hours ago  
**When** the diagnostic script checks sync logs  
**Then** it SHALL:
1. Display warning message: "⚠️ WARNING: Last sync was 36 hours ago"
2. Suggest checking:
   - Backend server is running
   - AUTO_SYNC_ENABLED is set to true
   - No errors in recent sync logs
3. Recommend restarting the backend server
4. Mark overall status as WARNING

### Scenario 5: Sync Errors in Logs

**Given** recent sync logs contain errors  
**When** the diagnostic script analyzes sync logs  
**Then** it SHALL:
1. Display error count and most recent error message
2. Classify the error type (e.g., GOOGLE_SHEETS_ACCESS_ERROR, DATABASE_QUERY_ERROR)
3. Provide specific troubleshooting steps for that error type
4. Suggest reviewing full error details in sync_logs table
5. Mark overall status as WARNING or CRITICAL depending on error frequency

## Success Metrics

1. **Diagnostic Accuracy**: 95% of issues correctly identified and classified
2. **Actionable Recommendations**: 90% of recommendations lead to successful issue resolution
3. **Execution Time**: Diagnostic completes within 30 seconds under normal conditions
4. **False Positive Rate**: Less than 5% of warnings are false alarms
5. **User Satisfaction**: Developers find the tool helpful and use it regularly for troubleshooting
