# Design Document

## Overview

This design addresses the critical issue of 356 missing buyers (8.6% of total) in the database due to VARCHAR(50) field length limitations. The solution involves:

1. **Immediate Fix**: Execute Migration 050 to convert all VARCHAR(50) fields to TEXT
2. **Sync Recovery**: Identify and sync all missing buyers
3. **Error Handling**: Implement comprehensive error logging and retry mechanisms
4. **Monitoring**: Add real-time monitoring and alerting for sync health
5. **Prevention**: Add schema validation to prevent future field length issues

## Architecture

### High-Level Architecture

```
┌─────────────────┐
│  Spreadsheet    │
│  (4137 buyers)  │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────┐
│           Buyer Sync Service (Enhanced)                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │ Schema       │  │ Batch        │  │ Error        │ │
│  │ Validator    │  │ Processor    │  │ Handler      │ │
│  └──────────────┘  └──────────────┘  └──────────────┘ │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │ Retry        │  │ Integrity    │  │ Performance  │ │
│  │ Manager      │  │ Checker      │  │ Monitor      │ │
│  └──────────────┘  └──────────────┘  └──────────────┘ │
└────────────┬────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────┐
│                    Database                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │ buyers       │  │ sync_error   │  │ retry_queue  │ │
│  │ (3781→4137)  │  │ _log         │  │              │ │
│  └──────────────┘  └──────────────┘  └──────────────┘ │
└─────────────────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────┐
│              Monitoring & Alerting                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │ Health       │  │ Alert        │  │ Dashboard    │ │
│  │ Checker      │  │ Manager      │  │              │ │
│  └──────────────┘  └──────────────┘  └──────────────┘ │
└─────────────────────────────────────────────────────────┘
```

### Data Flow

1. **Pre-Sync Validation**
   - Schema Validator checks all text fields are TEXT type
   - If VARCHAR fields found, fail with clear error message

2. **Batch Processing**
   - Read buyers from spreadsheet in batches of 100
   - Map columns using BuyerColumnMapper
   - Upsert to database with conflict resolution on buyer_number

3. **Error Handling**
   - Catch all errors during sync
   - Log to sync_error_log with categorization
   - Add retryable errors to retry_queue

4. **Retry Processing**
   - Process retry_queue every minute
   - Exponential backoff: 1min, 5min, 15min
   - Mark as permanently failed after 3 attempts

5. **Monitoring**
   - Check sync health every 5 minutes
   - Compare spreadsheet vs database counts
   - Calculate error rates
   - Send alerts when thresholds exceeded

6. **Post-Sync Verification**
   - Verify all spreadsheet buyers exist in database
   - Compare sample data for accuracy
   - Generate verification report

## Components and Interfaces

### 1. SchemaValidator

**Purpose**: Validate database schema before sync to prevent field length errors

**Interface**:
```typescript
class SchemaValidator {
  /**
   * Validate that all text fields in buyers table are TEXT type
   * @throws Error if VARCHAR fields are found
   */
  async validateBuyersSchema(): Promise<ValidationResult>
  
  /**
   * Get list of fields that are not TEXT type
   */
  async getNonTextFields(): Promise<FieldInfo[]>
  
  /**
   * Generate migration script to fix schema issues
   */
  generateFixScript(fields: FieldInfo[]): string
}

interface ValidationResult {
  valid: boolean
  errors: string[]
  nonTextFields: FieldInfo[]
}

interface FieldInfo {
  columnName: string
  dataType: string
  characterMaximumLength: number | null
}
```

### 2. EnhancedBuyerSyncService

**Purpose**: Core sync service with error handling and retry logic

**Interface**:
```typescript
class EnhancedBuyerSyncService extends BuyerSyncService {
  /**
   * Sync all buyers with comprehensive error handling
   */
  async syncAllWithErrorHandling(): Promise<EnhancedSyncResult>
  
  /**
   * Sync specific missing buyers
   */
  async syncMissingBuyers(buyerNumbers: string[]): Promise<SyncResult>
  
  /**
   * Process retry queue
   */
  async processRetryQueue(): Promise<RetryResult>
  
  /**
   * Get sync statistics
   */
  async getSyncStatistics(): Promise<SyncStatistics>
}

interface EnhancedSyncResult extends SyncResult {
  errorsByType: Record<ErrorType, number>
  retryQueueSize: number
  verificationResult: VerificationResult
}

enum ErrorType {
  FIELD_LENGTH = 'field_length',
  DATA_TYPE = 'data_type',
  CONSTRAINT_VIOLATION = 'constraint_violation',
  UNKNOWN = 'unknown'
}
```

### 3. SyncErrorLogger

**Purpose**: Log and categorize sync errors

**Interface**:
```typescript
class SyncErrorLogger {
  /**
   * Log a sync error
   */
  async logError(error: SyncErrorInfo): Promise<void>
  
  /**
   * Query error logs
   */
  async queryErrors(filter: ErrorFilter): Promise<SyncErrorLog[]>
  
  /**
   * Get error statistics
   */
  async getErrorStats(timeRange: TimeRange): Promise<ErrorStats>
  
  /**
   * Categorize error by type
   */
  categorizeError(error: Error): ErrorType
}

interface SyncErrorInfo {
  buyerNumber: string | null
  rowNumber: number
  errorMessage: string
  errorType: ErrorType
  stackTrace?: string
  retryable: boolean
}

interface ErrorFilter {
  startDate?: Date
  endDate?: Date
  errorType?: ErrorType
  buyerNumber?: string
}
```

### 4. RetryManager

**Purpose**: Manage retry queue and execute retries with exponential backoff

**Interface**:
```typescript
class RetryManager {
  /**
   * Add failed sync to retry queue
   */
  async addToRetryQueue(buyerNumber: string, error: SyncErrorInfo): Promise<void>
  
  /**
   * Process retry queue
   */
  async processQueue(): Promise<RetryResult>
  
  /**
   * Calculate next retry time with exponential backoff
   */
  calculateNextRetryTime(attemptNumber: number): Date
  
  /**
   * Mark entry as permanently failed
   */
  async markAsPermanentlyFailed(queueId: string): Promise<void>
}

interface RetryResult {
  processed: number
  succeeded: number
  failed: number
  permanentlyFailed: number
}
```

### 5. SyncMonitor

**Purpose**: Monitor sync health and send alerts

**Interface**:
```typescript
class SyncMonitor {
  /**
   * Check sync health
   */
  async checkHealth(): Promise<HealthStatus>
  
  /**
   * Compare spreadsheet and database counts
   */
  async compareCounts(): Promise<CountComparison>
  
  /**
   * Calculate error rate for time period
   */
  async calculateErrorRate(timeRange: TimeRange): Promise<number>
  
  /**
   * Send alert
   */
  async sendAlert(alert: Alert): Promise<void>
  
  /**
   * Get dashboard data
   */
  async getDashboardData(): Promise<DashboardData>
}

interface HealthStatus {
  healthy: boolean
  issues: string[]
  missingCount: number
  errorRate: number
  lastSyncTime: Date | null
}

interface CountComparison {
  spreadsheetCount: number
  databaseCount: number
  difference: number
  missingBuyerNumbers: string[]
}

interface Alert {
  type: AlertType
  severity: 'info' | 'warning' | 'error' | 'critical'
  message: string
  details: any
}

enum AlertType {
  MISSING_BUYERS = 'missing_buyers',
  HIGH_ERROR_RATE = 'high_error_rate',
  PERMANENT_FAILURE = 'permanent_failure',
  SLOW_SYNC = 'slow_sync'
}
```

### 6. IntegrityChecker

**Purpose**: Verify data integrity after sync

**Interface**:
```typescript
class IntegrityChecker {
  /**
   * Verify all spreadsheet buyers exist in database
   */
  async verifyCompleteness(): Promise<CompletenessResult>
  
  /**
   * Compare sample buyer data
   */
  async verifySampleData(sampleSize: number): Promise<AccuracyResult>
  
  /**
   * Generate verification report
   */
  async generateReport(): Promise<VerificationReport>
}

interface CompletenessResult {
  complete: boolean
  missingCount: number
  missingBuyerNumbers: string[]
}

interface AccuracyResult {
  accurate: boolean
  sampleSize: number
  mismatchCount: number
  mismatches: DataMismatch[]
}

interface DataMismatch {
  buyerNumber: string
  field: string
  spreadsheetValue: any
  databaseValue: any
}

interface VerificationReport {
  timestamp: Date
  completeness: CompletenessResult
  accuracy: AccuracyResult
  passed: boolean
  summary: string
}
```

## Data Models

### sync_error_log Table

```sql
CREATE TABLE sync_error_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_number VARCHAR(50),
  row_number INTEGER,
  error_message TEXT NOT NULL,
  error_type VARCHAR(50) NOT NULL,
  stack_trace TEXT,
  retryable BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  INDEX idx_sync_error_log_buyer_number (buyer_number),
  INDEX idx_sync_error_log_error_type (error_type),
  INDEX idx_sync_error_log_created_at (created_at)
);
```

### retry_queue Table

```sql
CREATE TABLE retry_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_number VARCHAR(50) NOT NULL,
  row_number INTEGER,
  error_info JSONB NOT NULL,
  attempt_count INTEGER DEFAULT 0,
  next_retry_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  status VARCHAR(20) DEFAULT 'pending', -- pending, processing, succeeded, failed
  INDEX idx_retry_queue_next_retry_at (next_retry_at),
  INDEX idx_retry_queue_status (status),
  INDEX idx_retry_queue_buyer_number (buyer_number)
);
```

### sync_health_metrics Table

```sql
CREATE TABLE sync_health_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  check_time TIMESTAMP DEFAULT NOW(),
  spreadsheet_count INTEGER NOT NULL,
  database_count INTEGER NOT NULL,
  missing_count INTEGER NOT NULL,
  error_rate DECIMAL(5,2),
  sync_duration_ms INTEGER,
  throughput_per_second DECIMAL(10,2),
  INDEX idx_sync_health_metrics_check_time (check_time)
);
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Schema Validation Completeness
*For any* buyers table schema, after validation, all text fields should be TEXT type and no VARCHAR(50) fields should remain
**Validates: Requirements 1.2, 7.1**

### Property 2: Missing Buyer Identification Accuracy
*For any* difference between spreadsheet and database counts, the system should identify exactly those buyer numbers that exist in spreadsheet but not in database
**Validates: Requirements 2.2, 2.3**

### Property 3: Missing Buyer Sync Completeness
*For any* set of missing buyers, after syncing, all those buyers should exist in the database
**Validates: Requirements 2.4**

### Property 4: Sync Success Logging
*For any* successful buyer sync, a log entry should be created with buyer_number and timestamp
**Validates: Requirements 2.5**

### Property 5: Error Logging Completeness
*For any* buyer sync failure, an error log entry should be created in sync_error_log
**Validates: Requirements 3.1**

### Property 6: Error Log Field Completeness
*For any* error log entry, it should contain buyer_number, row_number, error_message, error_type, and timestamp
**Validates: Requirements 3.2**

### Property 7: Error Categorization
*For any* sync error, it should be categorized as one of: field_length, data_type, constraint_violation, or unknown
**Validates: Requirements 3.3**

### Property 8: Error Query Correctness
*For any* valid error query filter (date range, error type, buyer number), the returned logs should match all filter criteria
**Validates: Requirements 3.4**

### Property 9: Retryable Error Queueing
*For any* sync failure with a retryable error, an entry should be added to retry_queue
**Validates: Requirements 4.1**

### Property 10: Retry Attempt Limit
*For any* entry in retry_queue, it should be retried at most 3 times before being marked as permanently failed
**Validates: Requirements 4.2**

### Property 11: Successful Retry Cleanup
*For any* retry that succeeds, the corresponding entry should be removed from retry_queue and a success log should be created
**Validates: Requirements 4.3**

### Property 12: Non-Retryable Error Exclusion
*For any* non-retryable error (schema error, constraint violation), no entry should be added to retry_queue
**Validates: Requirements 4.5**

### Property 13: Missing Count Alert Threshold
*For any* system state where spreadsheet count minus database count exceeds 10, an alert should be sent
**Validates: Requirements 5.2**

### Property 14: Error Rate Alert Threshold
*For any* time period where sync error rate exceeds 5%, an alert should be sent
**Validates: Requirements 5.3**

### Property 15: Permanent Failure Alert
*For any* buyer that has failed all 3 retry attempts, an alert should be sent with buyer details
**Validates: Requirements 5.4**

### Property 16: Dashboard Statistics Accuracy
*For any* system state, the dashboard should display accurate sync statistics (success rate, error rate, missing count)
**Validates: Requirements 5.5**

### Property 17: Upsert Key Consistency
*For any* buyer sync operation, buyer_number should be used as the unique identifier for upsert
**Validates: Requirements 6.1**

### Property 18: Upsert Update Behavior
*For any* buyer that already exists in database, syncing should update the existing record, not create a duplicate
**Validates: Requirements 6.2**

### Property 19: Created Timestamp Preservation
*For any* buyer update operation, the created_at timestamp should remain unchanged
**Validates: Requirements 6.3**

### Property 20: Sync Timestamp Update
*For any* buyer sync operation (create or update), synced_at and db_updated_at timestamps should be updated to current time
**Validates: Requirements 6.4**

### Property 21: Batch Size Consistency
*For any* sync operation, buyers should be processed in batches of exactly 100 (except the last batch which may be smaller)
**Validates: Requirements 8.1**

### Property 22: Performance Metrics Logging
*For any* sync operation, sync duration and throughput (buyers per second) should be logged
**Validates: Requirements 8.4**

### Property 23: Data Completeness Verification
*For any* completed sync, all buyers in spreadsheet should exist in database
**Validates: Requirements 9.1**

### Property 24: Sample Data Accuracy
*For any* sample of buyers, the data in database should match the data in spreadsheet for all mapped fields
**Validates: Requirements 9.2**

### Property 25: Mismatch Reporting Detail
*For any* detected data mismatch, the report should include buyer_number, field name, spreadsheet value, and database value
**Validates: Requirements 9.3**

### Property 26: Verification Report Generation
*For any* verification run, a report should be generated with completeness result, accuracy result, and pass/fail status
**Validates: Requirements 9.4**

## Error Handling

### Error Categories

1. **Field Length Errors** (retryable after schema fix)
   - `value too long for type character varying(50)`
   - Action: Log error, add to retry queue, send alert to fix schema

2. **Data Type Errors** (retryable after data fix)
   - Type conversion failures
   - Action: Log error, add to retry queue, send alert with data details

3. **Constraint Violations** (not retryable)
   - Unique constraint violations (duplicate buyer_number)
   - Foreign key violations
   - Action: Log error, skip retry, send alert

4. **Network/Transient Errors** (retryable)
   - Connection timeouts
   - Temporary database unavailability
   - Action: Log error, add to retry queue with immediate retry

5. **Unknown Errors** (retryable with caution)
   - Unexpected errors
   - Action: Log error with full stack trace, add to retry queue, send alert

### Error Recovery Flow

```
Sync Attempt
     │
     ├─ Success ──> Log success ──> Continue
     │
     └─ Failure
          │
          ├─ Categorize Error
          │
          ├─ Log to sync_error_log
          │
          ├─ Is Retryable?
          │    │
          │    ├─ Yes ──> Add to retry_queue
          │    │
          │    └─ No ──> Send alert ──> Skip
          │
          └─ Continue with next buyer
```

### Retry Strategy

- **Attempt 1**: Immediate (within same sync run)
- **Attempt 2**: After 1 minute (next retry cycle)
- **Attempt 3**: After 5 minutes (exponential backoff)
- **Attempt 4**: After 15 minutes (final attempt)
- **After 4 failures**: Mark as permanently failed, send critical alert

## Testing Strategy

### Unit Tests

1. **SchemaValidator Tests**
   - Test detection of VARCHAR fields
   - Test validation pass/fail scenarios
   - Test migration script generation

2. **SyncErrorLogger Tests**
   - Test error categorization logic
   - Test error log creation
   - Test error query filtering

3. **RetryManager Tests**
   - Test exponential backoff calculation
   - Test retry queue management
   - Test permanent failure marking

4. **IntegrityChecker Tests**
   - Test completeness verification
   - Test sample data comparison
   - Test report generation

### Property-Based Tests

Each correctness property should be implemented as a property-based test with minimum 100 iterations:

1. **Property 1-2**: Schema validation properties
2. **Property 3-4**: Missing buyer sync properties
3. **Property 5-8**: Error logging properties
4. **Property 9-12**: Retry queue properties
5. **Property 13-16**: Monitoring and alerting properties
6. **Property 17-20**: Upsert and idempotency properties
7. **Property 21-22**: Performance properties
8. **Property 23-26**: Data integrity properties

### Integration Tests

1. **End-to-End Sync Test**
   - Test complete sync flow from spreadsheet to database
   - Verify all 356 missing buyers are synced
   - Verify no errors occur after schema fix

2. **Error Recovery Test**
   - Simulate various error conditions
   - Verify retry mechanism works correctly
   - Verify alerts are sent appropriately

3. **Monitoring Test**
   - Verify health checks run on schedule
   - Verify alerts are triggered at correct thresholds
   - Verify dashboard shows accurate data

### Manual Testing

1. **Migration 050 Execution**
   - Execute migration in test environment
   - Verify all VARCHAR(50) fields converted to TEXT
   - Execute migration in production

2. **Missing Buyer Sync**
   - Run sync after migration
   - Verify all 356 missing buyers are synced
   - Verify data accuracy for sample buyers

3. **Dashboard Verification**
   - Check dashboard shows correct statistics
   - Verify alerts are received
   - Verify error logs are accessible

## Implementation Plan

### Phase 1: Immediate Fix (Priority: Critical)

1. Execute Migration 050 to fix schema
2. Implement schema validator
3. Sync all missing buyers
4. Verify data completeness

### Phase 2: Error Handling (Priority: High)

1. Implement sync_error_log table
2. Implement SyncErrorLogger
3. Enhance BuyerSyncService with error handling
4. Implement retry_queue table
5. Implement RetryManager

### Phase 3: Monitoring (Priority: High)

1. Implement sync_health_metrics table
2. Implement SyncMonitor
3. Implement alert system
4. Create monitoring dashboard

### Phase 4: Verification (Priority: Medium)

1. Implement IntegrityChecker
2. Add post-sync verification
3. Create verification reports

### Phase 5: Documentation (Priority: Medium)

1. Create troubleshooting guide
2. Document sync process flow
3. Create runbooks for common scenarios
4. Document configuration options

## Performance Considerations

- **Batch Size**: 100 buyers per batch balances memory usage and database round trips
- **Connection Pooling**: Reuse database connections to minimize overhead
- **Parallel Processing**: Consider parallel batch processing for large syncs (future enhancement)
- **Index Optimization**: Ensure indexes on buyer_number, created_at, synced_at
- **Monitoring Overhead**: Health checks every 5 minutes is frequent enough without impacting performance

## Security Considerations

- **Error Logs**: Ensure error logs don't contain sensitive buyer information (PII)
- **Alerts**: Ensure alerts are sent to authorized personnel only
- **Database Access**: Use service account with minimum required permissions
- **Retry Queue**: Implement rate limiting to prevent retry storms

## Deployment Strategy

1. **Pre-Deployment**
   - Backup buyers table
   - Test Migration 050 in staging
   - Prepare rollback plan

2. **Deployment**
   - Execute Migration 050 in production
   - Deploy enhanced sync service
   - Deploy monitoring service

3. **Post-Deployment**
   - Run full sync to recover missing buyers
   - Monitor error logs and alerts
   - Verify data completeness
   - Update documentation

4. **Rollback Plan**
   - If critical issues occur, restore from backup
   - Revert to previous sync service version
   - Investigate and fix issues before retry

