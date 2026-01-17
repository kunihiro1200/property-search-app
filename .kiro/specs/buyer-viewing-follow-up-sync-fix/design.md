# Design Document

## Overview

This design addresses the synchronization issue where the `viewing_result_follow_up` and `follow_up_assignee` fields are not properly syncing between Google Spreadsheet and the Supabase PostgreSQL database. The issue was discovered with buyer #6666, where manual re-sync succeeded but automatic sync failed to update these specific fields.

## Architecture

### Component Overview

The solution enhances the existing BuyerSyncService with field-level tracking and adds new services for monitoring and data recovery.

```
Google Spreadsheet → BuyerSyncService (Enhanced) → PostgreSQL Database
                            ↓
                    SyncMonitoringService
                            ↓
                    DataConsistencyChecker
                            ↓
                    BuyerDataRecoveryService
```

## Components and Interfaces

### 1. BuyerSyncService Enhancement

**Location**: `backend/src/services/BuyerSyncService.ts`

**New Methods**:
- `syncBuyerWithFieldTracking()`: Enhanced sync with field-level result tracking
- `validateFieldCoverage()`: Verify all mapped fields are processed
- `syncSpecificFields()`: Sync only specified fields for targeted fixes

### 2. SyncMonitoringService (New)

**Location**: `backend/src/services/SyncMonitoringService.ts`

**Purpose**: Track sync operations at field level and alert on issues

**Key Methods**:
- `recordFieldSync()`: Record field-level sync result
- `getFieldStats()`: Get statistics for specific field
- `getBuyersWithFieldIssues()`: Find buyers with sync problems
- `checkAlertThreshold()`: Determine if alert should be triggered

### 3. DataConsistencyChecker (New)

**Location**: `backend/src/services/DataConsistencyChecker.ts`

**Purpose**: Identify data inconsistencies between spreadsheet and database

**Key Methods**:
- `findInconsistencies()`: Find all buyers with mismatched data
- `verifyBuyer()`: Check specific buyer's data consistency
- `generateReport()`: Create comprehensive consistency report

### 4. BuyerDataRecoveryService (New)

**Location**: `backend/src/services/BuyerDataRecoveryService.ts`

**Purpose**: Restore data consistency by re-syncing from spreadsheet

**Key Methods**:
- `recoverBuyers()`: Recover data for specific buyers
- `recoverAllInconsistencies()`: Fix all detected inconsistencies
- `createBackup()`: Backup data before recovery
- `rollbackToBackup()`: Restore from backup if needed

## Data Models

### Existing Schema
No changes to buyers table required. Uses existing columns:
- `viewing_result_follow_up` (text)
- `follow_up_assignee` (text)

### New Monitoring Tables

```sql
CREATE TABLE buyer_field_sync_logs (
  id UUID PRIMARY KEY,
  buyer_number TEXT NOT NULL,
  field_name TEXT NOT NULL,
  success BOOLEAN NOT NULL,
  old_value TEXT,
  new_value TEXT,
  error_message TEXT,
  synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE buyer_data_recovery_logs (
  id UUID PRIMARY KEY,
  buyer_numbers TEXT[],
  field_names TEXT[],
  backup_id TEXT,
  success_count INTEGER,
  failure_count INTEGER,
  executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do.*

### Property 1: Sync Completeness
*For any* buyer sync operation, all fields defined in the column mapping must be processed.
**Validates: Requirements 2.1, 2.2**

### Property 2: Data Consistency After Sync
*For any* successful sync, database values must match spreadsheet values for target fields.
**Validates: Requirements 2.2, 3.3**

### Property 3: Error Transparency
*For any* sync error, the error must be logged with field name and details.
**Validates: Requirements 2.3, 5.1**

### Property 4: Recovery Idempotence
*For any* buyer, running recovery multiple times produces the same final state.
**Validates: Requirements 3.2**

### Property 5: Field-Level Monitoring
*For any* sync operation, monitoring must record status for each field independently.
**Validates: Requirements 5.1, 5.2**

## Error Handling

### Sync Errors
1. **Field Read Errors**: Log and skip field, continue with others
2. **Field Write Errors**: Log with details, rollback transaction
3. **Validation Errors**: Log and use default/null value

### Recovery Errors
1. **Backup Failure**: Abort recovery, alert administrator
2. **Partial Recovery**: Continue with remaining, log failures

## Testing Strategy

### Unit Tests
- Test field validation logic
- Test error handling
- Test monitoring stat calculation
- Test recovery operations

### Property-Based Tests (minimum 100 iterations each)

1. **Sync Completeness Test**
   - **Feature: buyer-viewing-follow-up-sync-fix, Property 1: Sync Completeness**
   
2. **Data Consistency Test**
   - **Feature: buyer-viewing-follow-up-sync-fix, Property 2: Data Consistency After Sync**
   
3. **Error Transparency Test**
   - **Feature: buyer-viewing-follow-up-sync-fix, Property 3: Error Transparency**
   
4. **Recovery Idempotence Test**
   - **Feature: buyer-viewing-follow-up-sync-fix, Property 4: Recovery Idempotence**
   
5. **Field-Level Monitoring Test**
   - **Feature: buyer-viewing-follow-up-sync-fix, Property 5: Field-Level Monitoring**

### Integration Tests
- End-to-end sync verification
- Recovery flow testing
- Monitoring alert testing

### Manual Testing
- Verify buyer #6666 specifically
- Test with sample buyers

## Implementation Phases

### Phase 1: Investigation
- Add field-level logging
- Implement monitoring service
- Identify root cause

### Phase 2: Fix Sync
- Enhance sync service
- Fix identified issues
- Add error handling

### Phase 3: Recovery
- Implement consistency checker
- Implement recovery service
- Fix affected buyers

### Phase 4: Verification
- Verify buyer #6666
- Run property tests
- Monitor for 24 hours
