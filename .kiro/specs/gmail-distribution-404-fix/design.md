# Design Document

## Overview

Gmail配信ボタンをクリックした際に発生する404エラーを修正し、データ整合性を確保するための設計。

**重要な発見**: エラーの根本原因は、システムが誤って`property_listings`テーブルから物件情報を取得しようとしていたことです。正しくは、`sellers`テーブルの`seller_number`フィールドが物件番号として使用され、そこにGoogle Map URLなどの必要な情報が格納されています。

**正しい仕組み**:
1. 物件番号（例: AA13129）は`sellers`テーブルの`seller_number`として保存されている
2. 物件のGoogle Map URLは`sellers.google_map_url`に保存されている
3. 買主の希望エリアのGoogle Map URLは`buyers.desired_area`に保存されている
4. 2つのGoogle Map URLから座標を抽出し、距離を計算
5. 2-3KM範囲内の買主のメールアドレスをBCCに含める

## Architecture

### Current System Flow (INCORRECT)

```
User clicks Gmail Distribution Button
  ↓
Frontend: gmailDistributionService.ts
  ↓
API: GET /api/property-listings/{propertyNumber}/distribution-buyers-enhanced
  ↓
EnhancedBuyerDistributionService.getQualifiedBuyersWithAllCriteria()
  ↓
fetchProperty() → property_listings table ❌ WRONG TABLE
  ↓
[404 Error if property not found]
```

### Fixed System Flow (CORRECT)

```
User clicks Gmail Distribution Button
  ↓
Frontend: gmailDistributionService.ts
  ↓
API: GET /api/property-listings/{propertyNumber}/distribution-buyers-enhanced
  ↓
EnhancedBuyerDistributionService.getQualifiedBuyersWithAllCriteria()
  ↓
fetchProperty() → sellers table (seller_number = propertyNumber) ✓ CORRECT
  ↓
Extract google_map_url from seller record
  ↓
Calculate distance to buyers' desired areas
  ↓
Filter buyers within 2-3KM radius
  ↓
Return matching buyer emails for BCC
```

### Proposed Solution Architecture

```
1. Diagnostic Tool
   - Check property_listings table
   - Check sellers table
   - Report data synchronization status

2. Data Integrity Service
   - Verify property_listings ↔ sellers consistency
   - Create missing property_listings records
   - Maintain referential integrity

3. Enhanced Error Handling
   - Categorize errors (404, 400, 503, 500)
   - Provide detailed error messages
   - Log errors with context
```

## Components and Interfaces

### 1. Data Integrity Diagnostic Tool

**Purpose**: Identify missing property_listings records and data synchronization issues

**Interface**:
```typescript
interface DiagnosticResult {
  propertyNumber: string;
  existsInPropertyListings: boolean;
  existsInSellers: boolean;
  syncStatus: 'synced' | 'missing_property_listing' | 'missing_seller' | 'not_found';
  sellerData?: {
    seller_number: string;
    property_number: string;
    // ... other seller fields
  };
  propertyListingData?: {
    property_number: string;
    // ... other property listing fields
  };
}

class DataIntegrityDiagnosticService {
  async diagnoseProperty(propertyNumber: string): Promise<DiagnosticResult>;
  async diagnoseBatch(propertyNumbers: string[]): Promise<DiagnosticResult[]>;
  async findAllMissingPropertyListings(): Promise<string[]>;
}
```

### 2. Property Listing Sync Service

**Purpose**: Create missing property_listings records from sellers table data

**Interface**:
```typescript
interface SyncResult {
  propertyNumber: string;
  success: boolean;
  action: 'created' | 'already_exists' | 'failed';
  error?: string;
}

class PropertyListingSyncService {
  async syncFromSeller(propertyNumber: string): Promise<SyncResult>;
  async syncBatch(propertyNumbers: string[]): Promise<SyncResult[]>;
  async syncAllMissing(): Promise<SyncResult[]>;
}
```

### 3. Enhanced Error Response

**Purpose**: Provide clear, actionable error messages

**Interface**:
```typescript
interface ErrorResponse {
  error: string;
  code: 'PROPERTY_NOT_FOUND' | 'INVALID_PARAMETER' | 'SERVICE_UNAVAILABLE' | 'INTERNAL_ERROR';
  message: string;
  propertyNumber?: string;
  diagnostics?: {
    existsInSellers: boolean;
    canBeRecovered: boolean;
  };
}
```

## Data Models

### Existing Tables

**sellers table**:
- seller_number (primary key)
- property_number (unique)
- address, city, price, property_type
- ... (other seller-related fields)

**property_listings table**:
- id (primary key)
- property_number (unique)
- address, city, price, property_type
- google_map_url
- ... (other property-related fields)

### Data Relationship

```
sellers (1) ←→ (1) property_listings
  via property_number
```

**Expected Invariant**: Every seller record SHOULD have a corresponding property_listing record

## Error Handling

### Error Categories

1. **400 Bad Request**
   - Invalid property number format
   - Missing required parameters
   - Invalid parameter values

2. **404 Not Found**
   - Property not found in property_listings table
   - Include diagnostics: exists in sellers?

3. **503 Service Unavailable**
   - Database connection failure
   - Temporary service issues

4. **500 Internal Server Error**
   - Unexpected errors
   - Include stack trace in development mode

### Error Response Format

```typescript
{
  error: "Property not found",
  code: "PROPERTY_NOT_FOUND",
  message: "Property with number AA13129 does not exist in property_listings",
  propertyNumber: "AA13129",
  diagnostics: {
    existsInSellers: true,
    canBeRecovered: true
  }
}
```

## Testing Strategy

### Unit Tests

1. **DataIntegrityDiagnosticService**
   - Test property exists in both tables
   - Test property exists only in sellers
   - Test property exists only in property_listings
   - Test property doesn't exist in either table

2. **PropertyListingSyncService**
   - Test creating property_listing from seller data
   - Test handling already existing property_listing
   - Test handling missing seller data
   - Test batch sync operations

3. **Error Handling**
   - Test 400 error responses
   - Test 404 error responses with diagnostics
   - Test 503 error responses
   - Test 500 error responses

### Integration Tests

1. **End-to-End Flow**
   - Test Gmail distribution button with valid property
   - Test Gmail distribution button with missing property_listing
   - Test Gmail distribution button with invalid property number

2. **Data Sync**
   - Test syncing single missing property_listing
   - Test syncing batch of missing property_listings
   - Test syncing all missing property_listings

### Manual Testing

1. **Diagnostic Tool**
   - Run diagnostic on known problematic property numbers
   - Verify diagnostic results match database state

2. **Sync Tool**
   - Sync a single missing property_listing
   - Verify property_listing was created correctly
   - Test Gmail distribution button after sync

3. **Error Messages**
   - Trigger 404 error and verify user-friendly message
   - Verify diagnostics information is helpful

## Implementation Notes

### Data Sync Strategy

1. **Field Mapping**: Map seller table fields to property_listings table fields
   - property_number → property_number
   - address → address
   - city → city
   - price → price
   - property_type → property_type
   - ... (map all relevant fields)

2. **Preserve Existing Data**: When syncing, do not overwrite existing property_listings records

3. **Validation**: Validate seller data before creating property_listing
   - Ensure property_number is valid format (AA + 4-5 digits)
   - Ensure required fields are present

### Error Logging

1. **Log all 404 errors** with property number and diagnostic information
2. **Log all sync operations** with success/failure status
3. **Log all data integrity issues** discovered during diagnostics

### Performance Considerations

1. **Batch Operations**: Support batch diagnostic and sync operations for efficiency
2. **Caching**: Consider caching diagnostic results for frequently accessed properties
3. **Async Processing**: For large batch operations, consider async/background processing

## Deployment Plan

### Phase 1: Diagnostic Tool
1. Implement DataIntegrityDiagnosticService
2. Create CLI tool for running diagnostics
3. Run diagnostics on production data to identify scope of issue

### Phase 2: Sync Service
1. Implement PropertyListingSyncService
2. Test sync on staging environment
3. Sync missing property_listings in production

### Phase 3: Enhanced Error Handling
1. Update API error responses with diagnostics
2. Update frontend to display helpful error messages
3. Add error logging and monitoring

### Phase 4: Monitoring
1. Set up alerts for 404 errors
2. Monitor data sync health
3. Regular diagnostic checks
