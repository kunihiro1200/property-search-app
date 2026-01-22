# Requirements Document: Property Type Sync Validation

## Introduction

This feature addresses the recurring issue where property_type values in the database do not match the corresponding values in the Google Spreadsheet. Currently, each mismatch must be manually identified and reported (e.g., AA12369, AA12890, AA4801). This feature will automate the detection, reporting, and correction of property_type mismatches across all sellers.

## Glossary

- **System**: The seller management application
- **Database**: The Supabase PostgreSQL database containing seller and property data
- **Spreadsheet**: The Google Sheets document serving as the source of truth for seller data
- **Property Type**: The classification of a property (e.g., detached_house, apartment, land)
- **Seller Number**: The unique identifier for each seller (e.g., AA4801)
- **Sync Process**: The automated process that synchronizes data between Spreadsheet and Database
- **Validation Report**: A document listing all detected mismatches with details

## Requirements

### Requirement 1

**User Story:** As a system administrator, I want to automatically detect property_type mismatches between the database and spreadsheet, so that I don't have to manually check each seller.

#### Acceptance Criteria

1. WHEN the validation process runs THEN the System SHALL compare property_type values for all sellers between Database and Spreadsheet
2. WHEN a mismatch is detected THEN the System SHALL record the seller_number, database value, and spreadsheet value
3. WHEN the validation completes THEN the System SHALL generate a comprehensive report listing all mismatches
4. WHEN no mismatches are found THEN the System SHALL report successful validation with zero discrepancies
5. WHEN the Spreadsheet lacks a property_type column THEN the System SHALL report a configuration error

### Requirement 2

**User Story:** As a system administrator, I want to automatically fix property_type mismatches by syncing from the spreadsheet, so that the database reflects the source of truth.

#### Acceptance Criteria

1. WHEN the auto-fix process runs THEN the System SHALL update Database property_type values to match Spreadsheet values for all mismatched sellers
2. WHEN a property_type is updated THEN the System SHALL log the change with seller_number, old value, and new value
3. WHEN the auto-fix completes THEN the System SHALL generate a summary report of all corrections made
4. WHEN a seller exists in Database but not in Spreadsheet THEN the System SHALL skip that seller and log a warning
5. WHEN a seller has no property in Database THEN the System SHALL skip that seller and log a warning

### Requirement 3

**User Story:** As a developer, I want the sync process to automatically validate property_type after each sync operation, so that mismatches are caught immediately.

#### Acceptance Criteria

1. WHEN the spreadsheet sync process completes THEN the System SHALL automatically run property_type validation
2. WHEN validation detects mismatches after sync THEN the System SHALL log an error with details
3. WHEN validation passes after sync THEN the System SHALL log a success message
4. WHEN sync validation fails THEN the System SHALL not block the sync process but SHALL alert administrators
5. WHEN multiple sync operations run concurrently THEN the System SHALL queue validation requests to avoid conflicts

### Requirement 4

**User Story:** As a system administrator, I want to run validation and auto-fix as standalone scripts, so that I can manually trigger them when needed.

#### Acceptance Criteria

1. WHEN I run the validation script THEN the System SHALL execute validation and output results to console and log file
2. WHEN I run the auto-fix script THEN the System SHALL execute corrections and output results to console and log file
3. WHEN I run the auto-fix script with a dry-run flag THEN the System SHALL report what would be changed without making actual changes
4. WHEN I run validation or auto-fix THEN the System SHALL complete within a reasonable time for all sellers (under 5 minutes for 1000 sellers)
5. WHEN scripts encounter errors THEN the System SHALL provide clear error messages and exit codes

### Requirement 5

**User Story:** As a system administrator, I want to receive notifications when property_type mismatches are detected, so that I can take action promptly.

#### Acceptance Criteria

1. WHEN validation detects mismatches THEN the System SHALL create an activity log entry with severity level warning
2. WHEN the number of mismatches exceeds a threshold (e.g., 10) THEN the System SHALL create a high-priority alert
3. WHEN auto-fix corrects mismatches THEN the System SHALL create an activity log entry documenting the corrections
4. WHEN validation or auto-fix fails THEN the System SHALL create an error-level activity log entry
5. WHEN administrators view activity logs THEN the System SHALL display property_type validation events with clear descriptions

### Requirement 6

**User Story:** As a developer, I want property_type validation to be integrated into the existing sync infrastructure, so that it leverages existing patterns and services.

#### Acceptance Criteria

1. WHEN implementing validation THEN the System SHALL use the existing GoogleSheetsClient for spreadsheet access
2. WHEN implementing validation THEN the System SHALL use the existing Supabase client for database access
3. WHEN implementing validation THEN the System SHALL follow the existing service layer architecture
4. WHEN implementing validation THEN the System SHALL use the existing logging infrastructure (SyncLogger)
5. WHEN implementing validation THEN the System SHALL handle rate limiting and error retry using existing patterns
