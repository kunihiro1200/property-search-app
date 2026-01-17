# Requirements Document

## Introduction

買主と物件の紐づけ修正機能は、buyersテーブルのproperty_numberフィールドが正しく設定されていない問題を解決する。現在、1,671件の買主データが存在するが、そのうち133件しかproperty_numberが設定されておらず、物件詳細ページで「買主 (0)」と表示される問題が発生している。この機能は、スプレッドシートから買主データを再同期し、property_numberフィールドを正しく設定することで、買主と物件の紐づけを修復する。

## Glossary

- **Buyer_Property_Linkage_System**: 買主と物件の紐づけを管理・修復するシステムコンポーネント
- **Buyers_Table**: 買主データを格納するデータベーステーブル
- **Property_Number**: 物件を一意に識別する番号（買主と物件を紐づけるキー）
- **Buyer_Sync_Service**: Google スプレッドシートから買主データを同期するサービス
- **Property_Listing**: 物件リストデータ（物件番号、住所、ステータスなどを含む）
- **Buyer_Linkage_Cache**: 買主と物件の紐づけ情報をキャッシュするサービス

## Requirements

### Requirement 1

**User Story:** As a system administrator, I want to identify buyers with missing property_number, so that I can understand the scope of the linkage issue.

#### Acceptance Criteria

1. WHEN the diagnostic script is executed THEN the Buyer_Property_Linkage_System SHALL count the total number of buyer records in the Buyers_Table
2. WHEN counting buyers THEN the Buyer_Property_Linkage_System SHALL count how many buyers have property_number set to NULL or empty string
3. WHEN counting buyers THEN the Buyer_Property_Linkage_System SHALL count how many buyers have a valid property_number value
4. WHEN the diagnostic completes THEN the Buyer_Property_Linkage_System SHALL output a summary report with the counts
5. WHEN displaying the report THEN the Buyer_Property_Linkage_System SHALL show sample buyer records with missing property_number

### Requirement 2

**User Story:** As a system administrator, I want to verify the spreadsheet column mapping for property_number, so that I can ensure the sync process reads the correct column.

#### Acceptance Criteria

1. WHEN verifying the column mapping THEN the Buyer_Property_Linkage_System SHALL read the buyer-column-mapping.json configuration file
2. WHEN reading the configuration THEN the Buyer_Property_Linkage_System SHALL identify which spreadsheet column maps to the property_number database field
3. WHEN the mapping is identified THEN the Buyer_Property_Linkage_System SHALL read sample rows from the spreadsheet to verify the column contains property numbers
4. WHEN sample data is read THEN the Buyer_Property_Linkage_System SHALL validate that the values match the expected property number format (e.g., "AA6381")
5. IF the mapping is incorrect THEN the Buyer_Property_Linkage_System SHALL report the discrepancy and suggest the correct column name

### Requirement 3

**User Story:** As a system administrator, I want to re-sync buyer data with correct property_number mapping, so that all buyers are properly linked to their properties.

#### Acceptance Criteria

1. WHEN the re-sync process is initiated THEN the Buyer_Sync_Service SHALL read all rows from the "買主リスト" sheet
2. WHEN reading each row THEN the Buyer_Sync_Service SHALL extract the property_number value using the corrected column mapping
3. WHEN a buyer record exists in the database THEN the Buyer_Sync_Service SHALL update the property_number field with the value from the spreadsheet
4. WHEN updating property_number THEN the Buyer_Sync_Service SHALL validate that the property_number exists in the Property_Listing table
5. WHEN the re-sync completes THEN the Buyer_Sync_Service SHALL log the number of buyers updated with property_number values

### Requirement 4

**User Story:** As a user, I want to see the correct buyer count on property listing pages, so that I know how many buyers are interested in each property.

#### Acceptance Criteria

1. WHEN displaying a property listing THEN the Buyer_Property_Linkage_System SHALL query the Buyers_Table for all buyers with matching property_number
2. WHEN buyers are found THEN the Buyer_Property_Linkage_System SHALL display the count as "買主 (N)" where N is the number of linked buyers
3. WHEN no buyers are found THEN the Buyer_Property_Linkage_System SHALL display "買主 (0)"
4. WHEN a user clicks on the buyer count THEN the Buyer_Property_Linkage_System SHALL display a list of all linked buyers with their details

### Requirement 5

**User Story:** As a user, I want to view buyer details from the property listing page, so that I can see which buyers are interested in a specific property.

#### Acceptance Criteria

1. WHEN a user accesses the property listing detail page THEN the Buyer_Property_Linkage_System SHALL display a "買主" tab or section
2. WHEN the buyer section is displayed THEN the Buyer_Property_Linkage_System SHALL show all buyers linked to the property_number
3. WHEN displaying buyer information THEN the Buyer_Property_Linkage_System SHALL show buyer_number, name, phone_number, and status
4. WHEN a user clicks on a buyer THEN the Buyer_Property_Linkage_System SHALL navigate to the buyer detail page

### Requirement 6

**User Story:** As a system administrator, I want to validate the buyer-property linkage after re-sync, so that I can confirm the issue is resolved.

#### Acceptance Criteria

1. WHEN the validation script is executed THEN the Buyer_Property_Linkage_System SHALL query specific property numbers (e.g., AA6381) to check linked buyers
2. WHEN querying buyers THEN the Buyer_Property_Linkage_System SHALL count how many buyers have the specified property_number
3. WHEN buyers are found THEN the Buyer_Property_Linkage_System SHALL display the buyer details (buyer_number, name, property_number)
4. WHEN testing the API endpoint THEN the Buyer_Property_Linkage_System SHALL simulate GET /api/property-listings/{property_number}/buyers and verify the response
5. WHEN the validation completes THEN the Buyer_Property_Linkage_System SHALL output a pass/fail status for each tested property

### Requirement 7

**User Story:** As a developer, I want to ensure the buyer sync process handles multiple properties per buyer, so that buyers interested in multiple properties are correctly linked.

#### Acceptance Criteria

1. WHEN a buyer has multiple property_number values in the spreadsheet THEN the Buyer_Sync_Service SHALL parse the values as a comma-separated or delimited list
2. WHEN multiple property numbers are detected THEN the Buyer_Sync_Service SHALL create separate buyer records or use a junction table to link one buyer to multiple properties
3. WHEN storing multiple linkages THEN the Buyer_Property_Linkage_System SHALL ensure referential integrity with the Property_Listing table
4. WHEN querying buyers for a property THEN the Buyer_Property_Linkage_System SHALL return all buyers linked to that property regardless of how many other properties they are linked to

### Requirement 8

**User Story:** As a system administrator, I want to clear and rebuild the buyer linkage cache, so that the UI displays updated buyer counts immediately after re-sync.

#### Acceptance Criteria

1. WHEN the re-sync completes THEN the Buyer_Linkage_Cache SHALL be invalidated for all property numbers
2. WHEN a property listing page is accessed THEN the Buyer_Property_Linkage_System SHALL rebuild the cache for that property_number
3. WHEN rebuilding the cache THEN the Buyer_Property_Linkage_System SHALL query the Buyers_Table for the current buyer count
4. WHEN the cache is updated THEN the Buyer_Property_Linkage_System SHALL store the buyer count with a timestamp
5. WHEN the cache expires THEN the Buyer_Property_Linkage_System SHALL automatically refresh the buyer count on the next access
