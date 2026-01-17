# Requirements Document

## Introduction

AA12903で実施した通話モードページのUI修正（物件情報、売主情報、ステータス、訪問予約、査定計算、他、通話履歴サマリー、スプレッドシートコメント等）を、全売主番号の案件に適用する。スプレッドシートから最新データを同期し、すべての売主で一貫したデータ品質とUI表示を実現する。

## Glossary

- **System**: 売主管理システム（Seller Management System）
- **Spreadsheet**: Google スプレッドシート（売主リストの元データ）
- **Database**: Supabase データベース（システムのデータストア）
- **Seller**: 売主（不動産売却を検討している顧客）
- **Property**: 物件（売主が所有する不動産）
- **Call Mode Page**: 通話モードページ（売主との通話時に使用するUI）
- **Sync**: 同期（スプレッドシートからデータベースへのデータ転送）
- **Encryption**: 暗号化（個人情報の保護）

## Requirements

### Requirement 1

**User Story:** As a system administrator, I want to sync all seller data from the spreadsheet to the database, so that all sellers have consistent and up-to-date information like AA12903

#### Acceptance Criteria

1. WHEN the sync script is executed, THE System SHALL retrieve all seller records from the Spreadsheet
2. WHEN processing each seller record, THE System SHALL map spreadsheet columns to database fields using the ColumnMapper
3. WHEN updating seller information, THE System SHALL encrypt sensitive fields (name, address, phone_number)
4. WHEN a seller exists in the Database, THE System SHALL update the existing record
5. WHEN a seller does not exist in the Database, THE System SHALL create a new record

### Requirement 2

**User Story:** As a system administrator, I want to sync property information for all sellers, so that property details are accurate and complete

#### Acceptance Criteria

1. WHEN syncing a seller, THE System SHALL check if a property record exists for that seller
2. WHEN a property exists, THE System SHALL update property fields (address, property_type, land_area, building_area, build_year, structure, seller_situation)
3. WHEN a property does not exist, THE System SHALL create a new property record linked to the seller
4. WHEN property numeric fields are present in the Spreadsheet, THE System SHALL parse and convert them correctly (removing commas, converting to appropriate types)
5. WHEN property fields are empty in the Spreadsheet, THE System SHALL set them to null in the Database

### Requirement 3

**User Story:** As a system administrator, I want to sync valuation amounts correctly, so that all valuations display in the correct unit (円)

#### Acceptance Criteria

1. WHEN syncing valuation amounts from the Spreadsheet, THE System SHALL convert from 万円 to 円 by multiplying by 10,000
2. WHEN valuation fields are empty, THE System SHALL set them to null
3. WHEN valuation amounts are already in the Database, THE System SHALL update them with the converted values

### Requirement 4

**User Story:** As a system administrator, I want to sync spreadsheet comments for all sellers, so that important notes are available in the call mode page

#### Acceptance Criteria

1. WHEN syncing a seller, THE System SHALL retrieve the comments field from the Spreadsheet
2. WHEN comments exist, THE System SHALL store them in the Database without encryption
3. WHEN comments are empty, THE System SHALL set the field to null or empty string
4. WHEN comments contain line breaks, THE System SHALL preserve them

### Requirement 5

**User Story:** As a system administrator, I want to sync visit appointment fields for all sellers, so that visit information is complete

#### Acceptance Criteria

1. WHEN syncing a seller, THE System SHALL retrieve visit-related fields (visit_date, visit_time, visit_staff, visit_location, visit_notes)
2. WHEN visit date is present, THE System SHALL parse and store it in ISO format
3. WHEN visit time is present, THE System SHALL parse and store it in time format
4. WHEN visit fields are empty, THE System SHALL set them to null

### Requirement 6

**User Story:** As a system administrator, I want the sync process to handle errors gracefully, so that one failure does not stop the entire sync

#### Acceptance Criteria

1. WHEN an error occurs during sync of a single seller, THE System SHALL log the error and continue with the next seller
2. WHEN the sync completes, THE System SHALL provide a summary report showing success count, error count, and details of any errors
3. WHEN a seller_number is not found in the Database, THE System SHALL log a warning and skip that seller
4. WHEN encryption fails, THE System SHALL log the error and skip that field
5. WHEN database update fails, THE System SHALL log the error with seller details

### Requirement 7

**User Story:** As a system administrator, I want to verify the sync results, so that I can confirm all data was synced correctly

#### Acceptance Criteria

1. WHEN the sync completes, THE System SHALL provide a verification script
2. WHEN the verification script runs, THE System SHALL check a sample of sellers for data accuracy
3. WHEN verification finds discrepancies, THE System SHALL report them with details
4. WHEN verification completes, THE System SHALL provide a summary of checked records and any issues found

### Requirement 8

**User Story:** As a user, I want all sellers to display correctly in the call mode page, so that I have consistent information during calls

#### Acceptance Criteria

1. WHEN viewing any seller in call mode page, THE System SHALL display property information correctly
2. WHEN viewing any seller in call mode page, THE System SHALL display seller information correctly
3. WHEN viewing any seller in call mode page, THE System SHALL display status information correctly
4. WHEN viewing any seller in call mode page, THE System SHALL display visit appointment information correctly
5. WHEN viewing any seller in call mode page, THE System SHALL display valuation calculations correctly
6. WHEN viewing any seller in call mode page, THE System SHALL display spreadsheet comments correctly
7. WHEN viewing any seller in call mode page, THE System SHALL display AI-generated call history summary correctly
