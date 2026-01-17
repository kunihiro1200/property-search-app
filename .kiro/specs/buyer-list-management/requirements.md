# Requirements Document

## Introduction

買主リスト管理機能は、Google スプレッドシート（ID: 1tI_iXaiLuWBggs5y0RH7qzkbHs9wnLLdRekAmjkhcLY、シート名: 買主リスト）から買主データをデータベースに同期し、システム内で管理・表示する機能である。買主データは181カラム、約5000行で随時増加する。売主リストとは別ブックで管理され、物件リストと同じブック内の別シートに存在する。買主番号がプライマリキーとなり、物件番号を通じて物件データと紐づく。1買主に対して複数物件が紐づくケースが頻繁に発生する。

## Glossary

- **Buyer_List_System**: 買主リストを管理するシステムコンポーネント
- **Buyer_Number**: 買主を一意に識別する番号（プライマリキー）
- **Property_Number**: 物件を一意に識別する番号（物件リストとの紐づけキー）
- **Spreadsheet_Sync_Service**: Google スプレッドシートとデータベース間の同期を行うサービス
- **Column_Mapper**: スプレッドシートのカラム名とデータベースカラム名のマッピングを行うコンポーネント
- **Buyer_Service**: 買主データのCRUD操作を提供するサービス

## Requirements

### Requirement 1

**User Story:** As a system administrator, I want to sync buyer data from Google Spreadsheet to the database, so that buyer information is available in the system.

#### Acceptance Criteria

1. WHEN the sync process is initiated THEN the Buyer_List_System SHALL read all rows from the "買主リスト" sheet in spreadsheet ID 1tI_iXaiLuWBggs5y0RH7qzkbHs9wnLLdRekAmjkhcLY
2. WHEN buyer data is read from the spreadsheet THEN the Column_Mapper SHALL transform 181 spreadsheet columns to corresponding database columns
3. WHEN a new buyer_number is encountered THEN the Buyer_List_System SHALL create a new buyer record in the database
4. WHEN an existing buyer_number is encountered THEN the Buyer_List_System SHALL update the existing buyer record with the latest data
5. WHEN sync completes THEN the Buyer_List_System SHALL log the number of created, updated, and failed records

### Requirement 2

**User Story:** As a user, I want to view buyer list with search and filter capabilities, so that I can find specific buyers quickly.

#### Acceptance Criteria

1. WHEN a user accesses the buyer list page THEN the Buyer_List_System SHALL display a paginated list of buyers with key information
2. WHEN a user enters a search term THEN the Buyer_List_System SHALL filter buyers by buyer_number, name, phone_number, or property_number
3. WHEN a user applies filters THEN the Buyer_List_System SHALL filter buyers by status, assignee, or date range
4. WHEN displaying buyer records THEN the Buyer_List_System SHALL show the count of linked properties for each buyer

### Requirement 3

**User Story:** As a user, I want to view detailed buyer information, so that I can see all 181 fields of buyer data.

#### Acceptance Criteria

1. WHEN a user selects a buyer from the list THEN the Buyer_List_System SHALL display all buyer fields organized in logical sections
2. WHEN displaying buyer details THEN the Buyer_List_System SHALL show linked property information with property_number references
3. WHEN a buyer has multiple linked properties THEN the Buyer_List_System SHALL display all linked properties in a dedicated section

### Requirement 4

**User Story:** As a user, I want to see the relationship between buyers and properties, so that I can understand the buyer-property linkage.

#### Acceptance Criteria

1. WHEN displaying buyer details THEN the Buyer_List_System SHALL show all property_numbers linked to the buyer
2. WHEN a user clicks on a linked property_number THEN the Buyer_List_System SHALL navigate to the property listing detail page
3. WHEN displaying property listing details THEN the Buyer_List_System SHALL show the linked buyer information

### Requirement 5

**User Story:** As a system administrator, I want the sync process to handle large datasets efficiently, so that 5000+ rows can be synced without timeout.

#### Acceptance Criteria

1. WHEN syncing large datasets THEN the Spreadsheet_Sync_Service SHALL process data in batches of 100 rows
2. WHEN a sync error occurs for a specific row THEN the Spreadsheet_Sync_Service SHALL continue processing remaining rows and log the error
3. WHEN sync is in progress THEN the Buyer_List_System SHALL prevent concurrent sync operations
4. WHEN sync completes THEN the Buyer_List_System SHALL record the sync timestamp for each buyer record

### Requirement 6

**User Story:** As a developer, I want a column mapping configuration, so that spreadsheet columns can be mapped to database columns without code changes.

#### Acceptance Criteria

1. WHEN the Column_Mapper is initialized THEN the Buyer_List_System SHALL load column mappings from a JSON configuration file
2. WHEN a spreadsheet column name changes THEN the Column_Mapper SHALL allow updating the mapping in the configuration file
3. WHEN parsing column values THEN the Column_Mapper SHALL convert data types according to the type conversion rules (date, number, text)

### Requirement 7

**User Story:** As a user, I want to edit buyer information, so that I can update buyer data when information changes.

#### Acceptance Criteria

1. WHEN a user clicks on a buyer record THEN the Buyer_List_System SHALL display an editable form with all buyer fields
2. WHEN a user modifies buyer fields THEN the Buyer_List_System SHALL validate the input data according to field type constraints
3. WHEN a user saves changes THEN the Buyer_List_System SHALL update the buyer record in the database
4. WHEN a user saves changes THEN the Buyer_List_System SHALL update the db_updated_at timestamp
5. WHEN save fails THEN the Buyer_List_System SHALL display an error message and preserve the user's input

### Requirement 8

**User Story:** As a user, I want to export buyer data, so that I can use the data in external tools.

#### Acceptance Criteria

1. WHEN a user requests export THEN the Buyer_List_System SHALL generate a CSV file with selected buyer records
2. WHEN exporting data THEN the Buyer_List_System SHALL include all 181 fields in the export

