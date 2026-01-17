# Design Document: Buyer-Property Linkage Fix

## Overview

The buyer-property linkage fix addresses a critical data integrity issue where the `property_number` field in the `buyers` table is not being populated correctly during the sync process. Currently, only 133 out of 1,671 buyer records have a valid `property_number`, causing property listing pages to display "買主 (0)" even when buyers exist for that property.

The root cause is that the `BuyerSyncService` correctly maps the spreadsheet column "物件番号" to the database field `property_number` in the configuration, but the actual sync process may not be extracting or storing this value properly. This design provides a comprehensive solution to diagnose, fix, and prevent this issue.

## Architecture

### System Components

1. **Diagnostic Module**: Analyzes the current state of buyer-property linkages
2. **Column Mapping Validator**: Verifies the spreadsheet column mapping configuration
3. **Enhanced Buyer Sync Service**: Improved sync logic with property_number validation
4. **Buyer Linkage Cache**: Performance optimization for buyer count queries
5. **Validation Module**: Post-sync verification and testing

### Data Flow

```
Google Spreadsheet (買主リスト)
    ↓
Column Mapping Validator → Verify "物件番号" mapping
    ↓
Enhanced Buyer Sync Service → Extract property_number
    ↓
Property Number Validator → Validate against property_listings
    ↓
Database (buyers table) → Store with property_number
    ↓
Buyer Linkage Cache → Cache buyer counts per property
    ↓
API Endpoints → Serve buyer data to UI
```

## Components and Interfaces

### 1. Diagnostic Module

**Purpose**: Identify the scope and nature of the linkage problem

**Interface**:
```typescript
interface DiagnosticResult {
  totalBuyers: number;
  buyersWithProperty: number;
  buyersWithoutProperty: number;
  sampleMissingBuyers: BuyerSample[];
  propertyNumberDistribution: Record<string, number>;
}

interface BuyerSample {
  buyer_number: string;
  name: string;
  property_number: string | null;
  synced_at: string;
}

class BuyerLinkageDiagnostic {
  async analyzeLinkageStatus(): Promise<DiagnosticResult>;
  async findBuyersWithoutProperty(limit: number): Promise<BuyerSample[]>;
  async getPropertyDistribution(): Promise<Record<string, number>>;
}
```

### 2. Column Mapping Validator

**Purpose**: Verify that the spreadsheet column mapping is correct

**Interface**:
```typescript
interface MappingValidationResult {
  isValid: boolean;
  spreadsheetColumn: string;
  databaseColumn: string;
  sampleValues: string[];
  issues: string[];
}

class ColumnMappingValidator {
  async validatePropertyNumberMapping(): Promise<MappingValidationResult>;
  async readSampleSpreadsheetData(columnName: string, rows: number): Promise<string[]>;
  validatePropertyNumberFormat(value: string): boolean;
}
```

### 3. Enhanced Buyer Sync Service

**Purpose**: Improved sync logic with explicit property_number handling

**Interface**:
```typescript
interface EnhancedSyncResult extends SyncResult {
  propertyNumberStats: {
    extracted: number;
    validated: number;
    invalid: number;
    missing: number;
  };
}

class EnhancedBuyerSyncService extends BuyerSyncService {
  async syncWithPropertyValidation(): Promise<EnhancedSyncResult>;
  private async validatePropertyNumber(propertyNumber: string): Promise<boolean>;
  private async extractPropertyNumber(headers: string[], row: any[]): Promise<string | null>;
  async reSyncPropertyNumbers(): Promise<EnhancedSyncResult>;
}
```

### 4. Buyer Linkage Cache

**Purpose**: Cache buyer counts per property for performance

**Interface**:
```typescript
interface CacheEntry {
  property_number: string;
  buyer_count: number;
  cached_at: Date;
  expires_at: Date;
}

class BuyerLinkageCache {
  async getBuyerCount(propertyNumber: string): Promise<number>;
  async setBuyerCount(propertyNumber: string, count: number, ttl: number): Promise<void>;
  async invalidate(propertyNumber?: string): Promise<void>;
  async invalidateAll(): Promise<void>;
  private async refreshCache(propertyNumber: string): Promise<number>;
}
```

### 5. Validation Module

**Purpose**: Verify the fix is working correctly

**Interface**:
```typescript
interface ValidationResult {
  propertyNumber: string;
  expectedBuyers: number;
  actualBuyers: number;
  passed: boolean;
  buyerDetails: BuyerSample[];
}

class BuyerLinkageValidator {
  async validateProperty(propertyNumber: string): Promise<ValidationResult>;
  async validateMultipleProperties(propertyNumbers: string[]): Promise<ValidationResult[]>;
  async testAPIEndpoint(propertyNumber: string): Promise<ValidationResult>;
}
```

## Data Models

### Buyers Table (Enhanced)

```sql
CREATE TABLE buyers (
  id SERIAL PRIMARY KEY,
  buyer_number VARCHAR(50) UNIQUE NOT NULL,
  property_number VARCHAR(50),  -- This field needs to be populated
  name TEXT,
  phone_number VARCHAR(50),
  email VARCHAR(255),
  -- ... 181 other fields ...
  synced_at TIMESTAMP,
  db_updated_at TIMESTAMP,
  
  -- Add index for property_number lookups
  INDEX idx_buyers_property_number (property_number),
  
  -- Add foreign key constraint (optional, for referential integrity)
  FOREIGN KEY (property_number) REFERENCES property_listings(property_number)
    ON DELETE SET NULL
);
```

### Buyer Linkage Cache (Redis)

```
Key: buyer_count:{property_number}
Value: {
  "count": 5,
  "cached_at": "2025-12-14T10:30:00Z",
  "expires_at": "2025-12-14T11:30:00Z"
}
TTL: 3600 seconds (1 hour)
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Buyer count accuracy
*For any* property_number, the count of buyers returned by the query should equal the number of buyer records in the database with that property_number value.
**Validates: Requirements 1.2, 4.1**

### Property 2: Column mapping extraction
*For any* valid spreadsheet row with headers, if the "物件番号" column contains a value, then the mapped database record should have that value in the property_number field.
**Validates: Requirements 2.2, 3.2**

### Property 3: Property number format validation
*For any* string value, the property number validator should return true if and only if the value matches the expected format (e.g., "AA" followed by digits).
**Validates: Requirements 2.4**

### Property 4: Sync update consistency
*For any* existing buyer record, when the sync process updates the property_number field, the new value should match the value from the spreadsheet for that buyer_number.
**Validates: Requirements 3.3**

### Property 5: Referential integrity validation
*For any* property_number value being assigned to a buyer, the validation should pass if and only if that property_number exists in the property_listings table.
**Validates: Requirements 3.4**

### Property 6: Buyer count display format
*For any* non-negative integer N, the display format should be "買主 (N)" where N is the count value.
**Validates: Requirements 4.2**

### Property 7: Multiple property number parsing
*For any* string containing comma-separated or delimited property numbers, the parser should extract all individual property numbers correctly.
**Validates: Requirements 7.1**

### Property 8: Cache invalidation completeness
*For any* sync operation that completes, all cache entries for property numbers should be invalidated (removed or marked as expired).
**Validates: Requirements 8.1**

### Property 9: Cache rebuild accuracy
*For any* property_number, when the cache is rebuilt, the cached count should equal the current count of buyers in the database with that property_number.
**Validates: Requirements 8.2**

### Property 10: Cache entry structure
*For any* cache entry, it should contain a count value, a cached_at timestamp, and an expires_at timestamp where expires_at > cached_at.
**Validates: Requirements 8.4**

### Property 11: Cache expiration refresh
*For any* cache entry where the current time > expires_at, accessing that entry should trigger a refresh that queries the database and updates the cache.
**Validates: Requirements 8.5**

## Error Handling

### Sync Errors

1. **Missing Property Number in Spreadsheet**
   - Log warning with buyer_number
   - Set property_number to NULL
   - Continue processing

2. **Invalid Property Number Format**
   - Log warning with buyer_number and invalid value
   - Set property_number to NULL
   - Increment invalid count in sync result

3. **Property Number Not Found in Property Listings**
   - Log warning with buyer_number and property_number
   - Option 1: Set property_number to NULL (strict mode)
   - Option 2: Store anyway and flag for review (lenient mode)
   - Increment validation failure count

4. **Spreadsheet API Errors**
   - Retry up to 3 times with exponential backoff
   - If all retries fail, throw error and abort sync
   - Log detailed error information

### Cache Errors

1. **Redis Connection Failure**
   - Fall back to direct database queries
   - Log error for monitoring
   - Continue serving requests (degraded performance)

2. **Cache Corruption**
   - Invalidate corrupted entry
   - Rebuild from database
   - Log error for investigation

## Testing Strategy

### Unit Tests

1. **Column Mapping Tests**
   - Test extraction of property_number from various row formats
   - Test handling of missing or empty property_number values
   - Test handling of malformed data

2. **Validation Tests**
   - Test property number format validation with valid/invalid inputs
   - Test referential integrity checks
   - Test multiple property number parsing

3. **Cache Tests**
   - Test cache set/get operations
   - Test cache invalidation
   - Test cache expiration logic
   - Test fallback to database when cache unavailable

### Property-Based Tests

Property-based tests will use the `fast-check` library for TypeScript to generate random test data and verify the correctness properties defined above.

**Configuration**: Each property-based test should run a minimum of 100 iterations.

**Test Annotations**: Each property-based test must include a comment with the format:
```typescript
// **Feature: buyer-property-linkage-fix, Property 1: Buyer count accuracy**
```

### Integration Tests

1. **End-to-End Sync Test**
   - Create test spreadsheet with known data
   - Run sync process
   - Verify all property_number values are correctly stored
   - Verify buyer counts are accurate

2. **API Endpoint Tests**
   - Test GET /api/property-listings/{property_number}/buyers
   - Verify response includes all linked buyers
   - Verify response format and data completeness

3. **Cache Integration Tests**
   - Test cache population after sync
   - Test cache invalidation after sync
   - Test cache refresh on access

### Manual Testing

1. **Diagnostic Script Execution**
   - Run diagnostic to identify current state
   - Verify output format and accuracy

2. **Re-Sync Execution**
   - Run enhanced sync with property validation
   - Monitor logs for errors
   - Verify sync result statistics

3. **UI Verification**
   - Access property listing pages (e.g., AA6381)
   - Verify buyer count displays correctly
   - Verify buyer list displays all linked buyers
   - Verify navigation to buyer detail pages

## Implementation Notes

### Phase 1: Diagnosis
1. Create diagnostic script to analyze current state
2. Verify column mapping configuration
3. Identify root cause of missing property_number values

### Phase 2: Fix Sync Logic
1. Enhance BuyerSyncService with explicit property_number handling
2. Add property number validation against property_listings table
3. Add detailed logging for property_number extraction and validation

### Phase 3: Re-Sync Data
1. Run enhanced sync to populate missing property_number values
2. Monitor sync progress and errors
3. Validate results with diagnostic script

### Phase 4: Cache Implementation
1. Implement BuyerLinkageCache with Redis
2. Add cache invalidation to sync process
3. Update API endpoints to use cache

### Phase 5: Validation
1. Run validation script on sample properties
2. Test API endpoints
3. Verify UI displays correct buyer counts

### Performance Considerations

1. **Batch Processing**: Process buyers in batches of 100 to avoid memory issues
2. **Database Indexing**: Ensure index on buyers.property_number for fast lookups
3. **Cache TTL**: Set cache TTL to 1 hour to balance freshness and performance
4. **Async Operations**: Use async/await for all I/O operations

### Monitoring and Logging

1. **Sync Metrics**
   - Total buyers processed
   - Property numbers extracted/validated/invalid/missing
   - Sync duration
   - Error count and details

2. **Cache Metrics**
   - Cache hit/miss ratio
   - Cache invalidation count
   - Cache rebuild count

3. **API Metrics**
   - Request count per property
   - Response time
   - Error rate

## Security Considerations

1. **Data Privacy**: Buyer personal information (name, phone, email) should be handled securely
2. **Access Control**: Only authorized users should access buyer data
3. **Audit Logging**: Log all sync operations and data modifications

## Deployment Plan

1. **Pre-Deployment**
   - Backup buyers table
   - Run diagnostic script to establish baseline

2. **Deployment**
   - Deploy enhanced sync service
   - Deploy cache implementation
   - Deploy updated API endpoints

3. **Post-Deployment**
   - Run re-sync to populate missing property_number values
   - Verify sync results with validation script
   - Monitor error logs and metrics
   - Test UI functionality

4. **Rollback Plan**
   - Restore buyers table from backup if critical issues occur
   - Revert to previous sync service version
   - Disable cache and fall back to direct database queries
