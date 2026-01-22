# Requirements Document

## Introduction

This document defines the requirements for Phase 1 of the Seller List Management System enhancement. Phase 1 focuses on adding essential basic information fields to improve seller tracking, inquiry management, and duplicate detection capabilities.

## Glossary

- **System**: The Seller List Management System (売主リスト管理システム)
- **Seller**: A property owner who has requested a valuation (売主)
- **Seller Number**: A unique identifier for each seller, formatted as "AA" followed by sequential numbers (売主番号)
- **Inquiry Source**: The valuation website from which the inquiry originated (反響元サイト)
- **Inquiry Date**: The date when the valuation request was received (反響日付)
- **Unreachable Status**: A flag indicating whether the seller cannot be contacted by phone (不通フラグ)
- **First Caller**: The employee who made the first contact attempt with the seller (一番TEL)
- **Confidence Level**: The seller's likelihood of proceeding with a sale (確度)
- **Duplicate Check**: The process of identifying if a seller has previously submitted inquiries (重複確認)

## Requirements

### Requirement 1: Seller Number Management

**User Story:** As a system administrator, I want each seller to have a unique seller number, so that I can easily reference and track sellers across the system.

#### Acceptance Criteria

1. WHEN a new seller is created, THE System SHALL generate a unique seller number with the format "AA" followed by sequential numbers starting from 1
2. WHEN a seller number is generated, THE System SHALL ensure no duplicate seller numbers exist in the database
3. WHEN displaying seller information, THE System SHALL show the seller number prominently in the user interface
4. WHEN searching for sellers, THE System SHALL allow users to search by seller number
5. THE System SHALL maintain the sequential order of seller numbers even if sellers are deleted

### Requirement 2: Inquiry Source Tracking

**User Story:** As a sales agent, I want to know which valuation website each inquiry came from, so that I can understand our lead sources and tailor my approach accordingly.

#### Acceptance Criteria

1. WHEN creating a new seller record, THE System SHALL require the user to specify the inquiry source
2. THE System SHALL support the following inquiry source codes: "ウ" (イエウール), "L" (LIFULL HOME), and other customizable codes
3. WHEN displaying seller lists, THE System SHALL show the inquiry source for each seller
4. WHEN filtering sellers, THE System SHALL allow filtering by inquiry source
5. THE System SHALL maintain statistics on the number of inquiries from each source

### Requirement 3: Inquiry Date Management

**User Story:** As a sales agent, I want to record when each inquiry was received, so that I can prioritize recent inquiries and track response times.

#### Acceptance Criteria

1. WHEN creating a new seller record, THE System SHALL require the user to enter the inquiry year
2. WHEN creating a new seller record, THE System SHALL require the user to enter the inquiry date (month and day)
3. THE System SHALL store the complete inquiry datetime with year, month, day, and optionally time
4. WHEN displaying seller lists, THE System SHALL show the inquiry date in a readable format
5. WHEN sorting sellers, THE System SHALL allow sorting by inquiry date in ascending or descending order

### Requirement 4: Unreachable Status Management

**User Story:** As a sales agent, I want to mark sellers as unreachable when phone calls fail, so that I can track communication issues and plan alternative contact methods.

#### Acceptance Criteria

1. WHEN a phone call to a seller fails, THE System SHALL allow the user to mark the seller as unreachable
2. WHEN a seller is marked as unreachable, THE System SHALL display a visual indicator in the seller list
3. WHEN a seller is marked as unreachable, THE System SHALL record the date and time of the unreachable status
4. WHEN a previously unreachable seller is successfully contacted, THE System SHALL allow the user to clear the unreachable status
5. WHEN filtering sellers, THE System SHALL allow filtering by unreachable status

### Requirement 5: First Caller Tracking

**User Story:** As a team manager, I want to know which employee made the first contact attempt with each seller, so that I can track individual performance and maintain accountability.

#### Acceptance Criteria

1. WHEN an employee makes the first phone call to a seller, THE System SHALL record the employee's initials as the first caller
2. THE System SHALL allow recording the first caller even if the call was unsuccessful (unreachable)
3. WHEN displaying seller information, THE System SHALL show the first caller's initials
4. WHEN filtering sellers, THE System SHALL allow filtering by first caller
5. THE System SHALL prevent modification of the first caller once recorded, unless explicitly authorized

### Requirement 6: Confidence Level Assessment

**User Story:** As a sales agent, I want to assess and record each seller's confidence level, so that I can prioritize high-confidence leads and allocate resources effectively.

#### Acceptance Criteria

1. WHEN evaluating a seller, THE System SHALL allow the user to set a confidence level
2. THE System SHALL support at least three confidence levels: "high", "medium", and "low"
3. WHEN displaying seller lists, THE System SHALL show the confidence level with visual indicators (colors or icons)
4. WHEN filtering sellers, THE System SHALL allow filtering by confidence level
5. WHEN sorting sellers, THE System SHALL allow sorting by confidence level

### Requirement 7: Duplicate Detection by Phone Number

**User Story:** As a sales agent, I want the system to detect duplicate sellers based on phone numbers, so that I can avoid redundant work and maintain data integrity.

#### Acceptance Criteria

1. WHEN creating a new seller record, THE System SHALL check if the phone number already exists in the database
2. WHEN a duplicate phone number is detected, THE System SHALL display a warning to the user with details of the existing seller
3. WHEN a duplicate phone number is detected, THE System SHALL show the past owner information associated with that phone number
4. WHEN a duplicate phone number is detected, THE System SHALL show the past property information associated with that phone number
5. THE System SHALL allow the user to proceed with creating the duplicate record after acknowledging the warning

### Requirement 8: Duplicate Detection by Email Address

**User Story:** As a sales agent, I want the system to detect duplicate sellers based on email addresses, so that I can identify returning customers and maintain accurate records.

#### Acceptance Criteria

1. WHEN creating a new seller record with an email address, THE System SHALL check if the email already exists in the database
2. WHEN a duplicate email is detected, THE System SHALL display a warning to the user with details of the existing seller
3. WHEN a duplicate email is detected, THE System SHALL show the past owner information associated with that email
4. WHEN a duplicate email is detected, THE System SHALL show the past property information associated with that email
5. THE System SHALL allow the user to proceed with creating the duplicate record after acknowledging the warning

### Requirement 9: Duplicate Confirmation Flag

**User Story:** As a sales agent, I want to mark that I have reviewed and confirmed duplicate seller records, so that the system knows the duplicate has been acknowledged and processed appropriately.

#### Acceptance Criteria

1. WHEN a duplicate seller is detected, THE System SHALL display a "duplicate confirmation required" flag
2. WHEN the user reviews the duplicate information, THE System SHALL allow the user to mark the duplicate as confirmed
3. WHEN a duplicate is confirmed, THE System SHALL record the date and time of confirmation
4. WHEN a duplicate is confirmed, THE System SHALL record which employee performed the confirmation
5. WHEN displaying seller lists, THE System SHALL show only unconfirmed duplicates by default, with an option to show all

### Requirement 10: Enhanced Seller List Display

**User Story:** As a sales agent, I want to see all the new Phase 1 fields in the seller list view, so that I can quickly access important information without opening individual seller details.

#### Acceptance Criteria

1. WHEN viewing the seller list, THE System SHALL display the seller number for each seller
2. WHEN viewing the seller list, THE System SHALL display the inquiry source for each seller
3. WHEN viewing the seller list, THE System SHALL display the inquiry date for each seller
4. WHEN viewing the seller list, THE System SHALL display the unreachable status indicator for each seller
5. WHEN viewing the seller list, THE System SHALL display the confidence level for each seller
6. WHEN viewing the seller list, THE System SHALL display the first caller initials for each seller
7. WHEN viewing the seller list, THE System SHALL allow users to show/hide columns based on their preferences
8. WHEN viewing the seller list, THE System SHALL maintain column preferences across user sessions

### Requirement 11: Data Migration for Existing Records

**User Story:** As a system administrator, I want existing seller records to be compatible with the new Phase 1 fields, so that the system continues to function without data loss.

#### Acceptance Criteria

1. WHEN the Phase 1 database migration is executed, THE System SHALL add all new fields to the sellers table without data loss
2. WHEN the Phase 1 database migration is executed, THE System SHALL generate seller numbers for all existing sellers in chronological order
3. WHEN the Phase 1 database migration is executed, THE System SHALL set default values for new required fields on existing records
4. WHEN the Phase 1 database migration is executed, THE System SHALL create necessary indexes for performance optimization
5. THE System SHALL complete the migration within a reasonable time frame (under 5 minutes for up to 10,000 records)

### Requirement 12: API Endpoints for Phase 1 Fields

**User Story:** As a frontend developer, I want RESTful API endpoints that support all Phase 1 fields, so that I can build user interfaces that leverage the new functionality.

#### Acceptance Criteria

1. WHEN creating a seller via API, THE System SHALL accept all Phase 1 fields in the request body
2. WHEN updating a seller via API, THE System SHALL allow modification of Phase 1 fields
3. WHEN retrieving sellers via API, THE System SHALL include all Phase 1 fields in the response
4. WHEN filtering sellers via API, THE System SHALL support query parameters for all Phase 1 filterable fields
5. WHEN the API receives invalid Phase 1 field values, THE System SHALL return appropriate error messages with field-specific validation details
