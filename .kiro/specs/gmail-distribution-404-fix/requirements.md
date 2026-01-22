# Requirements Document

## Introduction

Gmail配信ボタンをクリックすると「物件が見つかりません」というエラーが発生する問題を修正する。エラーログによると、`/api/property-listings/{propertyNumber}/distribution-buyers-enhanced` エンドポイントが404エラーを返している。

## Glossary

- **Gmail Distribution Button**: 物件詳細ページまたは物件リストページに表示される、買主に一括メール配信を行うためのボタン
- **Property Listing**: 物件リスト（property_listings テーブル）に登録されている物件情報
- **Property Number**: 物件番号。AA followed by 4-5 digits の形式（例: AA13129）
- **Distribution Buyers API**: 配信対象の買主メールアドレスを取得するAPIエンドポイント
- **Seller Record**: sellers テーブルに登録されている売主情報
- **System**: 不動産管理システム全体を指す

## Requirements

### Requirement 1

**User Story:** As a user, I want to click the Gmail Distribution Button and successfully fetch qualified buyers, so that I can send property information to interested buyers.

#### Acceptance Criteria

1. WHEN a user clicks the Gmail Distribution Button with a Property Number matching the format AA followed by 4-5 digits THEN the System SHALL retrieve the corresponding Property Listing from the database
2. WHEN the Property Listing exists in the database THEN the System SHALL return the list of qualified buyer email addresses
3. WHEN the Property Listing does not exist in the database THEN the System SHALL return an error response indicating the property was not found
4. WHEN the Distribution Buyers API receives a request THEN the System SHALL record the Property Number and request timestamp
5. WHEN an error occurs during buyer retrieval THEN the System SHALL return an error response containing an error code and descriptive message

### Requirement 2

**User Story:** As a system administrator, I want to identify missing Property Listings, so that I can understand data integrity issues.

#### Acceptance Criteria

1. WHEN querying for a Property Number THEN the System SHALL verify the Property Listing exists in the property_listings table
2. WHEN a Property Listing is not found THEN the System SHALL check if a corresponding Seller Record exists in the sellers table
3. WHEN a Seller Record exists without a Property Listing THEN the System SHALL report this as a data synchronization issue
4. WHEN checking data integrity THEN the System SHALL report the existence status of both Seller Record and Property Listing
5. WHEN data integrity issues are detected THEN the System SHALL provide information about which records are missing or inconsistent

### Requirement 3

**User Story:** As a system administrator, I want to ensure data consistency between sellers and property_listings tables, so that all properties are accessible through the Distribution Buyers API.

#### Acceptance Criteria

1. WHEN a Seller Record exists THEN the System SHALL maintain a corresponding Property Listing record
2. WHEN synchronizing data from the spreadsheet THEN the System SHALL create Property Listing records for all Seller Records
3. WHEN a Property Listing record is missing for an existing Seller Record THEN the System SHALL allow creation of the missing Property Listing from Seller Record data
4. WHEN creating missing Property Listing records THEN the System SHALL preserve all existing Property Listing data
5. WHEN data synchronization completes THEN the System SHALL verify that every Seller Record has a corresponding Property Listing record

### Requirement 4

**User Story:** As a user, I want clear error messages when something goes wrong, so that I understand what happened and what to do next.

#### Acceptance Criteria

1. WHEN a Property Listing is not found THEN the System SHALL display an error message identifying the Property Number
2. WHEN a network communication failure occurs THEN the System SHALL display an error message indicating network connectivity issues
3. WHEN a server-side error occurs THEN the System SHALL display an error message indicating temporary service unavailability
4. WHEN no qualified buyers match the property criteria THEN the System SHALL display a message indicating no matching buyers were found
5. WHEN an error occurs THEN the System SHALL record detailed error information including error type and context

### Requirement 5

**User Story:** As a developer, I want improved error handling in the Distribution Buyers API, so that errors are properly categorized and logged.

#### Acceptance Criteria

1. WHEN the Distribution Buyers API receives a Property Number that does not match the required format THEN the System SHALL return an error response with HTTP status 400
2. WHEN the Property Listing is not found THEN the System SHALL return an error response with HTTP status 404
3. WHEN a database connection failure occurs THEN the System SHALL return an error response with HTTP status 503
4. WHEN an unexpected error occurs THEN the System SHALL return an error response with HTTP status 500
5. WHEN an error occurs THEN the System SHALL record the error details including stack trace and request parameters
