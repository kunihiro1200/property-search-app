# Design Document

## Overview

This design document outlines the approach for syncing all seller data from Google Spreadsheet to the Supabase database, ensuring that all sellers have consistent and complete information like AA12903. The solution leverages existing sync infrastructure (`GoogleSheetsClient`, `ColumnMapper`, `SpreadsheetSyncService`) and extends it to handle comprehensive data synchronization including property information, visit appointments, valuations, and comments.

## Architecture

### High-Level Architecture

```
┌─────────────────────┐
│ Google Spreadsheet  │
│  (Source of Truth)  │
└──────────┬──────────┘
           │
           │ Read All Rows
           ▼
┌─────────────────────┐
│ Sync Script         │
│ (sync-all-sellers)  │
└──────────┬──────────┘
           │
           │ Uses
           ▼
┌─────────────────────┐     ┌─────────────────────┐
│ GoogleSheetsClient  │────▶│   ColumnMapper      │
│ (Read spreadsheet)  │     │ (Map & Convert)     │
└─────────────────────┘     └──────────┬──────────┘
                                       │
                                       │ Mapped Data
                                       ▼
                            ┌─────────────────────┐
                            │  Supabase Database  │
                            │  - sellers table    │
                            │  - properties table │
                            └─────────────────────┘
```

### Data Flow

1. **Read Phase**: Fetch all rows from Google Spreadsheet
2. **Map Phase**: Convert spreadsheet columns to database fields using ColumnMapper
3. **Validate Phase**: Check data integrity and handle special cases
4. **Sync Phase**: Update or create records in Supabase
5. **Property Sync Phase**: Sync property information for each seller
6. **Report Phase**: Generate summary report with success/error counts

## Components and Interfaces

### 1. Enhanced Sync Script (`sync-all-sellers-complete.ts`)

Extends the existing `sync-all-sellers.ts` to include:
- Property information synchronization
- Visit appointment fields
- Enhanced error handling
- Progress reporting
- Detailed logging

```typescript
interface SyncProgress {
  total: number;
  processed: number;
  updated: number;
  created: number;
  skipped: number;
  errors: number;
  errorDetails: Array<{
    sellerNumber: string;
    error: string;
    timestamp: string;
  }>;
}

interface SyncOptions {
  batchSize?: number;
  skipProperties?: boolean;
  dryRun?: boolean;
  sellerNumbers?: string[]; // Sync specific sellers only
}
```

### 2. Property Sync Handler

New component to handle property information synchronization:

```typescript
interface PropertySyncHandler {
  syncProperty(sellerId: string, propertyData: PropertyData): Promise<SyncResult>;
  findOrCreateProperty(sellerId: string): Promise<string>; // Returns property ID
  updatePropertyFields(propertyId: string, data: PropertyData): Promise<void>;
}

interface PropertyData {
  address?: string;
  property_type?: string;
  land_area?: number;
  building_area?: number;
  build_year?: number;
  structure?: string;
  seller_situation?: string;
  floor_plan?: string;
  land_rights?: string;
  current_status?: string;
}
```

### 3. Enhanced ColumnMapper

Extend existing ColumnMapper to handle additional fields:
- Property-related columns
- Visit appointment fields
- Comments field
- All new fields from migration 030

```typescript
// Additional mappings in column-mapping.json
{
  "spreadsheetToDatabase": {
    "物件住所": "property_address",
    "物件種別": "property_type",
    "土地面積": "land_area",
    "建物面積": "building_area",
    "築年": "build_year",
    "構造": "structure",
    "状況（売主）": "seller_situation",
    "間取り": "floor_plan",
    "土地権利": "land_rights",
    "現況": "current_status",
    "訪問日": "visit_date",
    "訪問時間": "visit_time",
    "訪問担当": "visit_assignee",
    "訪問場所": "visit_location",
    "訪問メモ": "visit_notes",
    "コメント": "comments"
  }
}
```

### 4. Verification Script

New script to verify sync results:

```typescript
interface VerificationResult {
  totalChecked: number;
  passed: number;
  failed: number;
  issues: Array<{
    sellerNumber: string;
    field: string;
    expected: any;
    actual: any;
  }>;
}

async function verifySyncResults(
  sampleSize?: number,
  sellerNumbers?: string[]
): Promise<VerificationResult>;
```

## Data Models

### Seller Data Model (Extended)

```typescript
interface SellerComplete {
  // Basic Info
  id: string;
  seller_number: string;
  name: string; // encrypted
  address: string; // encrypted
  phone_number: string; // encrypted
  email?: string; // encrypted
  
  // Inquiry Info
  inquiry_site?: string;
  inquiry_date?: string;
  
  // Status Info
  status?: string;
  confidence?: string;
  next_call_date?: string;
  
  // Valuation Info
  valuation_amount_1?: number; // in yen (converted from 万円)
  valuation_amount_2?: number;
  valuation_amount_3?: number;
  valuation_assignee?: string;
  
  // Visit Info
  visit_date?: string;
  visit_time?: string;
  visit_assignee?: string;
  visit_location?: string;
  visit_notes?: string;
  
  // Assignment Info
  phone_assignee?: string;
  
  // Other Info
  comments?: string; // not encrypted
  contract_year_month?: string;
  competitor_name?: string;
  competitor_name_and_reason?: string;
  exclusive_other_decision_factor?: string;
  
  // Timestamps
  created_at: string;
  updated_at: string;
  synced_to_sheet_at?: string;
}
```

### Property Data Model

```typescript
interface Property {
  id: string;
  seller_id: string;
  address: string;
  property_type?: string;
  land_area?: number;
  building_area?: number;
  build_year?: number;
  structure?: string;
  seller_situation?: string;
  floor_plan?: string;
  land_rights?: string;
  current_status?: string;
  created_at: string;
  updated_at: string;
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Acceptance Criteria Testing Prework:

1.1 WHEN the sync script is executed, THE System SHALL retrieve all seller records from the Spreadsheet
Thoughts: This is about the system's ability to fetch all data from the spreadsheet. We can test this by running the sync and verifying that the number of rows retrieved matches the expected count from the spreadsheet.
Testable: yes - example

1.2 WHEN processing each seller record, THE System SHALL map spreadsheet columns to database fields using the ColumnMapper
Thoughts: This is a rule that should apply to all seller records. We can generate random spreadsheet rows and verify that the ColumnMapper correctly transforms them to database format.
Testable: yes - property

1.3 WHEN updating seller information, THE System SHALL encrypt sensitive fields (name, address, phone_number)
Thoughts: This is a security requirement that must hold for all sellers. We can verify that after sync, all sensitive fields are encrypted in the database.
Testable: yes - property

1.4 WHEN a seller exists in the Database, THE System SHALL update the existing record
Thoughts: This is testing the update path. We can create a seller, modify spreadsheet data, sync, and verify the database reflects the changes.
Testable: yes - property

1.5 WHEN a seller does not exist in the Database, THE System SHALL create a new record
Thoughts: This is testing the create path. We can add a new row to the spreadsheet, sync, and verify it appears in the database.
Testable: yes - example

2.1 WHEN syncing a seller, THE System SHALL check if a property record exists for that seller
Thoughts: This is about the system's behavior for all sellers. We can verify that for each seller synced, a property check is performed.
Testable: yes - property

2.2 WHEN a property exists, THE System SHALL update property fields
Thoughts: This is the update path for properties. We can test that existing properties get updated with new data from the spreadsheet.
Testable: yes - property

2.3 WHEN a property does not exist, THE System SHALL create a new property record linked to the seller
Thoughts: This is the create path for properties. We can test that new properties are created and properly linked.
Testable: yes - example

2.4 WHEN property numeric fields are present in the Spreadsheet, THE System SHALL parse and convert them correctly
Thoughts: This is about handling numeric conversions (removing commas, parsing). This should work for all numeric property fields.
Testable: yes - property

2.5 WHEN property fields are empty in the Spreadsheet, THE System SHALL set them to null in the Database
Thoughts: This is about handling empty values consistently. Should apply to all property fields.
Testable: yes - property

3.1 WHEN syncing valuation amounts from the Spreadsheet, THE System SHALL convert from 万円 to 円 by multiplying by 10,000
Thoughts: This is a critical conversion that must work for all valuation amounts. This is a round-trip-like property where we can verify the conversion is correct.
Testable: yes - property

3.2 WHEN valuation fields are empty, THE System SHALL set them to null
Thoughts: This is about handling empty valuations consistently.
Testable: yes - property

3.3 WHEN valuation amounts are already in the Database, THE System SHALL update them with the converted values
Thoughts: This is testing that existing valuations get updated correctly.
Testable: yes - property

4.1 WHEN syncing a seller, THE System SHALL retrieve the comments field from the Spreadsheet
Thoughts: This is about ensuring comments are fetched for all sellers.
Testable: yes - property

4.2 WHEN comments exist, THE System SHALL store them in the Database without encryption
Thoughts: This is a security/storage requirement that comments should not be encrypted.
Testable: yes - property

4.3 WHEN comments are empty, THE System SHALL set the field to null or empty string
Thoughts: This is about handling empty comments.
Testable: yes - property

4.4 WHEN comments contain line breaks, THE System SHALL preserve them
Thoughts: This is about data integrity for multi-line comments.
Testable: yes - property

5.1 WHEN syncing a seller, THE System SHALL retrieve visit-related fields
Thoughts: This is about ensuring all visit fields are fetched.
Testable: yes - property

5.2 WHEN visit date is present, THE System SHALL parse and store it in ISO format
Thoughts: This is about date parsing and formatting consistency.
Testable: yes - property

5.3 WHEN visit time is present, THE System SHALL parse and store it in time format
Thoughts: This is about time parsing and formatting.
Testable: yes - property

5.4 WHEN visit fields are empty, THE System SHALL set them to null
Thoughts: This is about handling empty visit fields.
Testable: yes - property

6.1 WHEN an error occurs during sync of a single seller, THE System SHALL log the error and continue with the next seller
Thoughts: This is about error resilience. We can test that one bad record doesn't stop the entire sync.
Testable: yes - property

6.2 WHEN the sync completes, THE System SHALL provide a summary report
Thoughts: This is about the final output. We can verify the report contains the expected fields.
Testable: yes - example

6.3 WHEN a seller_number is not found in the Database, THE System SHALL log a warning and skip that seller
Thoughts: This is about handling missing sellers gracefully.
Testable: yes - example

6.4 WHEN encryption fails, THE System SHALL log the error and skip that field
Thoughts: This is about error handling for encryption failures.
Testable: yes - example

6.5 WHEN database update fails, THE System SHALL log the error with seller details
Thoughts: This is about error logging for database failures.
Testable: yes - example

7.1 WHEN the sync completes, THE System SHALL provide a verification script
Thoughts: This is about the existence of a verification tool.
Testable: no

7.2 WHEN the verification script runs, THE System SHALL check a sample of sellers for data accuracy
Thoughts: This is about the verification process.
Testable: yes - example

7.3 WHEN verification finds discrepancies, THE System SHALL report them with details
Thoughts: This is about verification reporting.
Testable: yes - example

7.4 WHEN verification completes, THE System SHALL provide a summary
Thoughts: This is about verification summary output.
Testable: yes - example

8.1-8.7 (UI display requirements)
Thoughts: These are UI requirements that depend on the frontend rendering correctly. They are not directly testable through the sync process but are validated by the sync ensuring data is present.
Testable: no (UI requirements)

### Property Reflection

After reviewing all properties, the following consolidations can be made:

- Properties 2.5, 3.2, 4.3, 5.4 all test "empty fields should be null" - these can be combined into one comprehensive property
- Properties 1.3 and 4.2 both test encryption behavior - can be combined
- Properties 2.4 and 3.1 both test numeric conversions - can be combined into a more general numeric conversion property

### Correctness Properties

Property 1: Column mapping consistency
*For any* spreadsheet row with valid seller data, the ColumnMapper should produce a database object with all mapped fields present and correctly typed
**Validates: Requirements 1.2**

Property 2: Sensitive field encryption
*For any* seller record synced to the database, the fields name, address, and phone_number should be encrypted, while comments should remain unencrypted
**Validates: Requirements 1.3, 4.2**

Property 3: Update vs Create logic
*For any* seller_number, if it exists in the database before sync, the sync should update the existing record; if it doesn't exist, the sync should create a new record
**Validates: Requirements 1.4, 1.5**

Property 4: Property record linkage
*For any* seller synced, if a property record exists for that seller_id, it should be updated; if not, a new property record should be created and linked to the seller
**Validates: Requirements 2.1, 2.2, 2.3**

Property 5: Numeric field conversion
*For any* numeric field (valuation amounts, land_area, building_area), the system should correctly parse comma-separated values and convert valuation amounts from 万円 to 円 (×10,000)
**Validates: Requirements 2.4, 3.1**

Property 6: Empty field handling
*For any* field that is empty or null in the spreadsheet, the corresponding database field should be set to null
**Validates: Requirements 2.5, 3.2, 4.3, 5.4**

Property 7: Line break preservation
*For any* comments field containing line breaks, the line breaks should be preserved in the database
**Validates: Requirements 4.4**

Property 8: Date and time parsing
*For any* date or time field in the spreadsheet, the system should parse it correctly and store it in ISO format (dates) or time format (times)
**Validates: Requirements 5.2, 5.3**

Property 9: Error isolation
*For any* seller that fails to sync due to an error, the sync process should continue with the next seller without stopping
**Validates: Requirements 6.1**

Property 10: Sync completeness
*For any* sync operation, all sellers in the spreadsheet should be processed (either successfully synced, skipped, or logged as error)
**Validates: Requirements 1.1**

## Error Handling

### Error Categories

1. **Spreadsheet Access Errors**
   - Authentication failures
   - Network timeouts
   - Invalid spreadsheet ID
   - Action: Fail fast, log error, exit with error code

2. **Data Validation Errors**
   - Invalid seller_number format
   - Missing required fields
   - Invalid data types
   - Action: Log warning, skip record, continue sync

3. **Database Errors**
   - Connection failures
   - Constraint violations
   - Update/Insert failures
   - Action: Log error with details, skip record, continue sync

4. **Encryption Errors**
   - Encryption key not found
   - Encryption failure
   - Action: Log error, skip field or record, continue sync

### Error Logging

```typescript
interface ErrorLog {
  timestamp: string;
  sellerNumber?: string;
  errorType: 'spreadsheet' | 'validation' | 'database' | 'encryption';
  errorMessage: string;
  stackTrace?: string;
  context?: Record<string, any>;
}
```

### Recovery Strategies

1. **Retry Logic**: For transient errors (network, database connection), implement exponential backoff retry (max 3 attempts)
2. **Partial Sync**: Allow syncing specific seller numbers for fixing failed records
3. **Dry Run Mode**: Test sync without making database changes
4. **Rollback**: Not implemented (sync is idempotent, can be re-run)

## Testing Strategy

### Unit Testing

Unit tests will cover:
- ColumnMapper field mapping logic
- Data type conversions (dates, numbers, booleans)
- Encryption/decryption of sensitive fields
- Property sync handler logic
- Error handling for individual components

### Property-Based Testing

Property-based tests will use **fast-check** (JavaScript/TypeScript PBT library) to verify:
- Column mapping consistency across random inputs
- Encryption behavior for all sensitive fields
- Numeric conversion accuracy (万円 to 円)
- Empty field handling
- Date/time parsing for various formats

Each property-based test will run a minimum of 100 iterations.

### Integration Testing

Integration tests will cover:
- End-to-end sync flow with test spreadsheet
- Database state verification after sync
- Property creation and updates
- Error handling with intentionally malformed data

### Manual Testing

Manual verification will include:
- Sync a sample of known sellers (including AA12903)
- Verify data in call mode page UI
- Check all sections: property info, seller info, status, visit, valuation, comments, AI summary
- Compare with spreadsheet source data

## Implementation Notes

### Performance Considerations

1. **Batch Processing**: Process sellers in batches of 100 to avoid memory issues
2. **Progress Reporting**: Log progress every 100 records
3. **Database Connection Pooling**: Reuse Supabase client connection
4. **Parallel Processing**: Not implemented initially (sequential processing for reliability)

### Data Consistency

1. **Idempotency**: Sync can be run multiple times safely
2. **Timestamps**: Update `updated_at` on every sync
3. **Sync Tracking**: Update `synced_to_sheet_at` after successful sync
4. **Conflict Resolution**: Spreadsheet is source of truth, always overwrites database

### Security

1. **Encryption**: Use existing `encrypt()` function for sensitive fields
2. **Service Account**: Use Google service account for spreadsheet access
3. **Environment Variables**: Store credentials in `.env` file
4. **Audit Trail**: Log all sync operations with timestamps

### Monitoring

1. **Sync Summary**: Display counts of updated, created, skipped, errors
2. **Error Details**: Log all errors with seller_number and error message
3. **Verification Report**: Provide detailed comparison of sample records
4. **Execution Time**: Track and report total sync duration
