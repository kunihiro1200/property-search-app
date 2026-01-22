# Property Listing Sync - Alternative Approach

## Overview

This spec provides an alternative synchronization approach for property listings that avoids the database connection issues encountered with the current implementation by using Supabase REST API instead of direct PostgreSQL connections.

## Problem Statement

The current property listing auto-sync implementation faces database connection errors:
- `getaddrinfo ENOTFOUND` errors when connecting to Supabase
- Connection timeouts during sync operations
- Unreliable sync status due to connection instability
- EnhancedAutoSyncService fails to initialize properly

## Root Cause Analysis

### 1. Direct Database Connection Issues
- The current implementation uses direct PostgreSQL connections via `pg` library
- Network instability causes connection failures
- Connection pooling issues with Supabase
- DNS resolution failures

### 2. Sync Manager Startup Problems
- EnhancedAutoSyncService fails to initialize properly
- Database connection required at startup
- No fallback mechanism when connection fails
- Cascading failures affect entire sync system

## Alternative Approach: REST API-Based Sync

### Key Benefits

1. **No Direct Database Connection Required**
   - Uses Supabase REST API (PostgREST)
   - Built-in connection pooling via Supabase
   - Automatic retry and error handling
   - Better compatibility with serverless environments

2. **Improved Reliability**
   - Graceful degradation under load
   - Circuit breaker pattern prevents cascading failures
   - Exponential backoff for transient errors
   - Better resource utilization

3. **Easier Maintenance**
   - No connection string management
   - Simpler authentication (API keys)
   - Better error messages
   - Easier to debug

## User Stories

### US-1: Reliable Property Listing Updates
**As a** system administrator  
**I want** property listing updates to sync reliably without database connection errors  
**So that** the system remains operational even with network instability

**Acceptance Criteria:**
- Property listing updates are synced using Supabase REST API
- Sync operations continue even if initial connection fails
- Failed sync attempts are retried with exponential backoff
- Sync status is tracked and logged for monitoring
- Success rate > 99%

### US-2: Manual Sync Trigger
**As a** system administrator  
**I want** to manually trigger property listing sync  
**So that** I can ensure data is up-to-date when needed

**Acceptance Criteria:**
- Manual sync endpoint available via REST API
- Sync progress is reported in real-time
- Sync results include success/failure counts
- Failed items are logged with error details
- Sync completes within 5 minutes for 1000 items

### US-3: Sync Health Monitoring
**As a** system administrator  
**I want** to monitor the health of property listing sync  
**So that** I can identify and resolve issues quickly

**Acceptance Criteria:**
- Sync health status endpoint available
- Last sync timestamp is tracked
- Sync error rate is calculated and exposed
- Alerts are generated for repeated failures
- Dashboard shows real-time sync status

## Technical Architecture

### Component Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     Application Layer                        │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────────┐      ┌──────────────────┐            │
│  │  Manual Sync     │      │  Auto Sync       │            │
│  │  Trigger         │      │  Scheduler       │            │
│  └────────┬─────────┘      └────────┬─────────┘            │
│           │                         │                        │
│           └─────────┬───────────────┘                        │
│                     │                                        │
│           ┌─────────▼──────────┐                            │
│           │  PropertyListing   │                            │
│           │  RestSyncService   │                            │
│           └─────────┬──────────┘                            │
│                     │                                        │
│           ┌─────────▼──────────┐                            │
│           │   Sync Queue       │                            │
│           │   Processor        │                            │
│           └─────────┬──────────┘                            │
│                     │                                        │
│           ┌─────────▼──────────┐                            │
│           │  Supabase Client   │                            │
│           │  with Retry Logic  │                            │
│           └─────────┬──────────┘                            │
│                     │                                        │
└─────────────────────┼─────────────────────────────────────┘
                      │
                      │ REST API
                      │
┌─────────────────────▼─────────────────────────────────────┐
│                  Supabase Platform                         │
├────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────┐    ┌──────────────┐   ┌──────────────┐ │
│  │  PostgREST   │───▶│  PostgreSQL  │◀──│  Realtime    │ │
│  │  API Layer   │    │  Database    │   │  Engine      │ │
│  └──────────────┘    └──────────────┘   └──────────────┘ │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Key Components

#### 1. PropertyListingRestSyncService

**Purpose:** Main service for synchronizing property listings using Supabase REST API

**Responsibilities:**
- Initialize Supabase client with retry logic
- Fetch property listings from Google Sheets
- Transform data for database insertion
- Batch update property listings via REST API
- Handle errors and retry failed operations
- Track sync state and statistics

**Key Methods:**
```typescript
class PropertyListingRestSyncService {
  constructor(config: SyncConfig)
  async syncAll(): Promise<SyncResult>
  async syncByNumbers(numbers: string[]): Promise<SyncResult>
  async getSyncStatus(syncId: string): Promise<SyncStatus>
  async getHealth(): Promise<HealthStatus>
}
```

#### 2. SupabaseClientFactory

**Purpose:** Create and manage Supabase client instances with retry logic

**Configuration:**
```typescript
interface SupabaseConfig {
  url: string
  serviceRoleKey: string
  retryAttempts: number
  retryDelay: number
  timeout: number
}
```

#### 3. SyncQueue

**Purpose:** Manage queue of sync operations with rate limiting

**Configuration:**
```typescript
interface QueueConfig {
  batchSize: number
  rateLimit: number  // requests per second
  maxRetries: number
  retryDelay: number
  concurrency: number
}
```

#### 4. CircuitBreaker

**Purpose:** Prevent cascading failures by breaking circuit on repeated errors

**Implementation:**
```typescript
class CircuitBreaker {
  private state: 'closed' | 'open' | 'half-open' = 'closed'
  private failureCount = 0
  private lastFailureTime?: Date
  
  constructor(
    private threshold: number,
    private timeout: number
  ) {}
  
  async execute<T>(fn: () => Promise<T>): Promise<T>
  getState(): string
}
```

## Implementation Plan

### Phase 1: REST API Sync Service (Priority: High)

**Tasks:**
1. Create `PropertyListingRestSyncService` class
2. Implement Supabase client initialization with retry logic
3. Add batch update methods using REST API
4. Implement error handling and logging
5. Add unit tests for sync service

**Files to Create/Modify:**
- `backend/src/services/PropertyListingRestSyncService.ts` (new)
- `backend/src/services/SupabaseClientFactory.ts` (new)
- `backend/src/utils/retryWithBackoff.ts` (new)

**Estimated Time:** 2-3 days

### Phase 2: Queue-Based Processing (Priority: High)

**Tasks:**
1. Create sync queue implementation
2. Add batch processing logic
3. Implement rate limiting
4. Add retry mechanism for failed items
5. Add integration tests

**Files to Create/Modify:**
- `backend/src/services/SyncQueue.ts` (modify existing)
- `backend/src/services/PropertyListingSyncProcessor.ts` (new)
- `backend/src/utils/rateLimiter.ts` (modify existing)

**Estimated Time:** 2-3 days

### Phase 3: Sync State Management (Priority: Medium)

**Tasks:**
1. Create sync state table in Supabase
2. Implement state tracking service
3. Add sync statistics calculation
4. Create monitoring endpoints
5. Add dashboard for sync status

**Files to Create/Modify:**
- `backend/migrations/082_add_sync_state_table.sql` (new)
- `backend/src/services/SyncStateService.ts` (new)
- `backend/src/routes/syncStatus.ts` (new)
- `frontend/src/pages/SyncStatusPage.tsx` (new)

**Estimated Time:** 2-3 days

### Phase 4: Migration and Testing (Priority: High)

**Tasks:**
1. Create migration script from old to new sync service
2. Add comprehensive integration tests
3. Perform load testing
4. Create rollback plan
5. Document deployment process

**Files to Create/Modify:**
- `backend/migrations/migrate-to-rest-sync.ts` (new)
- `backend/src/services/__tests__/PropertyListingRestSyncService.test.ts` (new)
- `backend/SYNC_MIGRATION_GUIDE.md` (new)

**Estimated Time:** 2-3 days

**Total Estimated Time:** 8-12 days

## API Endpoints

### POST /api/sync/property-listings/manual
Trigger manual property listing sync

**Request:**
```json
{
  "force": false,
  "batchSize": 100,
  "propertyNumbers": ["AA12345", "AA12346"]
}
```

**Response:**
```json
{
  "syncId": "uuid",
  "status": "in_progress",
  "startedAt": "2025-01-09T10:00:00Z"
}
```

### GET /api/sync/property-listings/status/:syncId
Get sync operation status

**Response:**
```json
{
  "syncId": "uuid",
  "status": "completed",
  "startedAt": "2025-01-09T10:00:00Z",
  "completedAt": "2025-01-09T10:05:00Z",
  "stats": {
    "total": 1000,
    "success": 995,
    "failed": 5,
    "skipped": 0
  },
  "errors": [
    {
      "propertyNumber": "AA12345",
      "error": "Invalid data format"
    }
  ]
}
```

### GET /api/sync/property-listings/health
Get sync health status

**Response:**
```json
{
  "status": "healthy",
  "lastSync": "2025-01-09T09:00:00Z",
  "errorRate": 0.005,
  "avgSyncDuration": 300,
  "queueSize": 0,
  "circuitBreakerState": "closed"
}
```

## Configuration

### Environment Variables

```bash
# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Sync Configuration
SYNC_BATCH_SIZE=100
SYNC_RATE_LIMIT=10  # requests per second
SYNC_RETRY_ATTEMPTS=3
SYNC_RETRY_DELAY=1000  # milliseconds
SYNC_CIRCUIT_BREAKER_THRESHOLD=5
SYNC_CIRCUIT_BREAKER_TIMEOUT=60000  # milliseconds
```

## Error Handling

### Connection Errors
- Retry with exponential backoff (1s, 2s, 4s, 8s, 16s)
- Circuit breaker opens after 5 consecutive failures
- Circuit breaker closes after 60 seconds
- Log all connection errors for monitoring

### Data Validation Errors
- Skip invalid items and log errors
- Continue processing remaining items
- Report validation errors in sync results
- Store failed items for manual review

### Rate Limiting
- Implement token bucket algorithm
- Default: 10 requests per second
- Configurable via environment variable
- Automatic backoff when rate limit exceeded

## Success Criteria

1. **Reliability**
   - Sync success rate > 99%
   - No database connection errors
   - Automatic recovery from failures

2. **Performance**
   - Sync duration < 5 minutes for 1000 items
   - API response time < 500ms
   - Queue processing < 1 second per item

3. **Monitoring**
   - Real-time sync status available
   - Error logs accessible
   - Alerts working correctly

4. **Maintainability**
   - Code coverage > 80%
   - Documentation complete
   - Deployment process documented

## Dependencies

- `@supabase/supabase-js`: ^2.39.0
- `p-queue`: ^7.4.1 (for queue management)
- `p-retry`: ^6.1.0 (for retry logic)

## Risks and Mitigation

### Risk 1: Supabase API Rate Limiting
**Mitigation:**
- Implement rate limiting on client side
- Use batch operations where possible
- Monitor API usage and adjust limits

### Risk 2: Data Inconsistency During Migration
**Mitigation:**
- Run both sync services in parallel during migration
- Compare results and verify consistency
- Rollback if inconsistencies detected

### Risk 3: Performance Degradation
**Mitigation:**
- Load test before deployment
- Monitor performance metrics
- Optimize batch sizes and rate limits
- Scale horizontally if needed

## Out of Scope

- Real-time sync (webhook-based)
- Multi-tenant support
- Intelligent sync (only changed items)
- Historical sync data analysis

## References

- [Supabase REST API Documentation](https://supabase.com/docs/reference/javascript/introduction)
- [Circuit Breaker Pattern](https://martinfowler.com/bliki/CircuitBreaker.html)
- [Exponential Backoff](https://en.wikipedia.org/wiki/Exponential_backoff)
- Current Implementation: `backend/src/services/EnhancedAutoSyncService.ts`

---

**Created**: 2025-01-09  
**Priority**: High  
**Blocks**: Property Listing Sync Reliability  
**Estimated Effort**: 8-12 days
