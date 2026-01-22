# Design Document: Property Type Sync Validation

## Overview

This feature implements automated validation and correction of property_type mismatches between the Supabase database and Google Spreadsheet. The system will detect discrepancies, generate reports, automatically fix mismatches, and integrate validation into the existing sync infrastructure.

The solution follows the existing architecture patterns established by SpreadsheetSyncService, SyncLogger, and PropertySyncHandler, ensuring consistency and maintainability.

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Validation Triggers                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Manual Script│  │ Post-Sync    │  │ Scheduled Job│      │
│  │              │  │ Hook         │  │              │      │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘      │
│         │                 │                 │               │
│         └─────────────────┼─────────────────┘               │
│                           │                                 │
└───────────────────────────┼─────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│            PropertyTypeValidationService                     │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  validateAll() / validateSeller() / autoFix()        │  │
│  └──────────────────────────────────────────────────────┘  │
│         │                    │                    │         │
│         ▼                    ▼                    ▼         │
│  ┌──────────┐        ┌──────────┐        ┌──────────┐     │
│  │ Compare  │        │ Generate │        │ Auto-Fix │     │
│  │ Values   │        │ Report   │        │ Database │     │
│  └──────────┘        └──────────┘        └──────────┘     │
└─────────────────────────────────────────────────────────────┘
         │                    │                    │
         ▼                    ▼                    ▼
┌─────────────────────────────────────────────────────────────┐
│                    Data Layer                                │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Supabase     │  │ Google       │  │ SyncLogger   │      │
│  │ Client       │  │ SheetsClient │  │              │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
```

### Component Interaction Flow

1. **Validation Trigger** → Initiates validation process
2. **PropertyTypeValidationService** → Orchestrates validation logic
3. **Data Comparison** → Fetches and compares property_type values
4. **Report Generation** → Creates detailed mismatch reports
5. **Auto-Fix** → Updates database to match spreadsheet
6. **Logging** → Records all operations via SyncLogger

## Components and Interfaces

### 1. PropertyTypeValidationService

Main service class that handles validation and auto-fix operations.

```typescript
export interface ValidationMismatch {
  sellerNumber: string;
  sellerId: string;
  propertyId: string;
  databaseValue: string | null;
  spreadsheetValue: string | null;
  severity: 'critical' | 'warning' | 'info';
}

export interface ValidationReport {
  timestamp: Date;
  totalSellers: number;
  totalChecked: number;
  mismatchCount: number;
  mismatches: ValidationMismatch[];
  skipped: Array<{
    sellerNumber: string;
    reason: string;
  }>;
  duration: number;
}

export interface AutoFixResult {
  timestamp: Date;
  totalFixed: number;
  fixes: Array<{
    sellerNumber: string;
    propertyId: string;
    oldValue: string | null;
    newValue: string | null;
  }>;
  errors: Array<{
    sellerNumber: string;
    error: string;
  }>;
  duration: number;
}

export class PropertyTypeValidationService {
  constructor(
    private supabase: SupabaseClient,
    private sheetsClient: GoogleSheetsClient,
    private syncLogger: SyncLogger
  );

  // Validate all sellers
  async validateAll(): Promise<ValidationReport>;

  // Validate specific seller
  async validateSeller(sellerNumber: string): Promise<ValidationMismatch | null>;

  // Auto-fix all mismatches
  async autoFix(dryRun?: boolean): Promise<AutoFixResult>;

  // Auto-fix specific seller
  async autoFixSeller(sellerNumber: string, dryRun?: boolean): Promise<boolean>;

  // Get validation history
  async getValidationHistory(limit?: number): Promise<ValidationReport[]>;
}
```

### 2. Validation Scripts

Standalone scripts for manual execution.

**validate-property-types.ts**
```typescript
// Runs validation and outputs report to console and file
// Usage: npx ts-node validate-property-types.ts [--seller=AA4801]
```

**fix-property-types.ts**
```typescript
// Runs auto-fix with optional dry-run mode
// Usage: npx ts-node fix-property-types.ts [--dry-run] [--seller=AA4801]
```

### 3. Integration with Sync Process

Modify existing sync services to include validation hooks.

```typescript
// In MigrationService or SpreadsheetSyncService
async syncFromSpreadsheet() {
  // ... existing sync logic ...
  
  // Post-sync validation
  const validator = new PropertyTypeValidationService(
    this.supabase,
    this.sheetsClient,
    this.syncLogger
  );
  
  const report = await validator.validateAll();
  
  if (report.mismatchCount > 0) {
    await this.syncLogger.logError('validation', 
      `Property type validation found ${report.mismatchCount} mismatches after sync`,
      { metadata: report }
    );
  }
}
```

### 4. Activity Log Integration

Create activity log entries for validation events.

```typescript
export interface ValidationActivityLog {
  action: 'property_type_validation' | 'property_type_auto_fix';
  severity: 'info' | 'warning' | 'error';
  details: {
    mismatchCount?: number;
    fixedCount?: number;
    sellerNumbers?: string[];
  };
}
```

## Data Models

### Validation Log Table (Optional Enhancement)

```sql
CREATE TABLE IF NOT EXISTS property_type_validation_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  validation_type TEXT NOT NULL, -- 'full' | 'single' | 'post_sync'
  total_checked INTEGER NOT NULL,
  mismatch_count INTEGER NOT NULL,
  mismatches JSONB,
  duration_ms INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_validation_logs_created_at 
  ON property_type_validation_logs(created_at DESC);
```

### Auto-Fix Log Table (Optional Enhancement)

```sql
CREATE TABLE IF NOT EXISTS property_type_fix_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  seller_id UUID REFERENCES sellers(id),
  property_id UUID REFERENCES properties(id),
  old_value TEXT,
  new_value TEXT,
  fixed_by TEXT, -- 'auto' | 'manual' | 'script'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_fix_logs_seller_id 
  ON property_type_fix_logs(seller_id);
CREATE INDEX idx_fix_logs_created_at 
  ON property_type_fix_logs(created_at DESC);
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Validation Completeness
*For any* validation run, all sellers with properties in the database should be checked against the spreadsheet, and no seller should be checked more than once
**Validates: Requirements 1.1**

### Property 2: Mismatch Detection Accuracy
*For any* seller with a property, if the database property_type differs from the spreadsheet property_type, the validation should detect and report this mismatch
**Validates: Requirements 1.2**

### Property 3: Auto-Fix Correctness
*For any* detected mismatch, after auto-fix executes, the database property_type should match the spreadsheet property_type
**Validates: Requirements 2.1**

### Property 4: Auto-Fix Idempotence
*For any* set of mismatches, running auto-fix multiple times should produce the same result as running it once (no additional changes after first fix)
**Validates: Requirements 2.1**

### Property 5: Dry-Run Safety
*For any* auto-fix operation with dry-run enabled, no database values should be modified, but the report should accurately reflect what would be changed
**Validates: Requirements 4.3**

### Property 6: Logging Consistency
*For any* validation or auto-fix operation, the number of mismatches/fixes reported should equal the number of log entries created
**Validates: Requirements 2.2, 5.3**

### Property 7: Post-Sync Validation Trigger
*For any* successful sync operation, validation should automatically execute and complete without blocking the sync process
**Validates: Requirements 3.1, 3.4**

### Property 8: Error Handling Resilience
*For any* seller that causes an error during validation or auto-fix, the process should continue with remaining sellers and log the error appropriately
**Validates: Requirements 4.5**

## Error Handling

### Error Categories

1. **Configuration Errors**
   - Missing spreadsheet ID or sheet name
   - Missing property_type column in spreadsheet
   - Invalid authentication credentials

2. **Data Errors**
   - Seller exists in database but not in spreadsheet
   - Seller has no property in database
   - Multiple properties for single seller (use latest)

3. **Network Errors**
   - Spreadsheet API timeout
   - Database connection failure
   - Rate limiting

4. **Validation Errors**
   - Unexpected data types
   - Null/undefined values in critical fields

### Error Handling Strategy

```typescript
try {
  // Validation logic
} catch (error) {
  const errorType = SyncLogger.determineErrorType(error);
  
  await this.syncLogger.logError(errorType, error.message, {
    operation: 'property_type_validation',
    sellerId: seller?.id,
    stackTrace: error.stack,
  });
  
  // Continue with next seller instead of failing entire batch
  continue;
}
```

### Retry Logic

- Network errors: Retry up to 3 times with exponential backoff
- Rate limit errors: Wait and retry based on rate limiter
- Other errors: Log and skip, no retry

## Testing Strategy

### Unit Tests

Test individual methods in isolation:

- `PropertyTypeValidationService.validateSeller()` - Test single seller validation
- `PropertyTypeValidationService.compareValues()` - Test value comparison logic
- `PropertyTypeValidationService.autoFixSeller()` - Test single seller fix
- Error handling for various failure scenarios

### Property-Based Tests

The testing framework will use **fast-check** for TypeScript property-based testing. Each property-based test should run a minimum of 100 iterations.

#### Test 1: Validation Completeness Property
```typescript
// Property 1: Validation Completeness
// For any validation run, all sellers should be checked exactly once
```

#### Test 2: Mismatch Detection Accuracy Property
```typescript
// Property 2: Mismatch Detection Accuracy
// For any seller, if values differ, mismatch should be detected
```

#### Test 3: Auto-Fix Correctness Property
```typescript
// Property 3: Auto-Fix Correctness
// After auto-fix, database should match spreadsheet
```

#### Test 4: Auto-Fix Idempotence Property
```typescript
// Property 4: Auto-Fix Idempotence
// Running auto-fix twice should be same as running once
```

#### Test 5: Dry-Run Safety Property
```typescript
// Property 5: Dry-Run Safety
// Dry-run should not modify database
```

#### Test 6: Logging Consistency Property
```typescript
// Property 6: Logging Consistency
// Log entries should match operation count
```

#### Test 7: Error Handling Resilience Property
```typescript
// Property 8: Error Handling Resilience
// Errors on one seller should not stop processing others
```

### Integration Tests

Test end-to-end workflows:

- Full validation run with mixed data (matches, mismatches, missing data)
- Auto-fix with dry-run vs actual execution
- Post-sync validation trigger
- Script execution with various command-line arguments

### Manual Testing

- Run validation script on production-like data
- Verify report accuracy by spot-checking sellers
- Test auto-fix with dry-run first, then actual fix
- Verify activity log entries are created correctly

## Performance Considerations

### Optimization Strategies

1. **Batch Processing**
   - Fetch all sellers and properties in single query
   - Fetch all spreadsheet rows in single API call
   - Process comparisons in memory

2. **Caching**
   - Cache spreadsheet data for duration of validation run
   - Cache seller-property mappings

3. **Parallel Processing**
   - Process validation comparisons in parallel batches
   - Limit concurrency to avoid overwhelming database

4. **Rate Limiting**
   - Respect Google Sheets API rate limits (existing RateLimiter)
   - Batch database updates to reduce round trips

### Performance Targets

- Validate 1000 sellers: < 2 minutes
- Auto-fix 100 mismatches: < 30 seconds
- Post-sync validation: < 1 minute (non-blocking)

## Security Considerations

- Use existing authentication mechanisms (service account for Sheets, Supabase service key)
- Validate all input data before processing
- Sanitize error messages to avoid exposing sensitive data
- Restrict auto-fix operations to authorized users/scripts

## Deployment Strategy

1. **Phase 1: Validation Only**
   - Deploy PropertyTypeValidationService
   - Deploy validation script
   - Run manual validations to identify current state

2. **Phase 2: Auto-Fix**
   - Deploy auto-fix functionality
   - Test with dry-run mode extensively
   - Run actual fixes on identified mismatches

3. **Phase 3: Integration**
   - Integrate post-sync validation hook
   - Add activity log integration
   - Set up monitoring and alerts

4. **Phase 4: Automation**
   - Schedule periodic validation jobs
   - Configure automatic notifications
   - Implement dashboard for validation metrics

## Monitoring and Alerts

### Metrics to Track

- Number of mismatches detected per validation run
- Auto-fix success rate
- Validation execution time
- Error rate by error type

### Alert Conditions

- Mismatch count exceeds threshold (e.g., > 10)
- Validation fails to complete
- Auto-fix error rate > 5%
- Post-sync validation detects new mismatches

## Future Enhancements

1. **Web UI Dashboard**
   - View validation history
   - Trigger validation/auto-fix from UI
   - Visualize mismatch trends

2. **Configurable Validation Rules**
   - Define custom validation rules beyond property_type
   - Support multiple field validations

3. **Conflict Resolution**
   - Handle cases where spreadsheet might be wrong
   - Manual review workflow for ambiguous cases

4. **Predictive Validation**
   - Detect patterns in mismatches
   - Suggest preventive measures
