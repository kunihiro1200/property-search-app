# Property Listing Sync - Alternative Approach: Design Document

## Architecture Overview

This document details the technical design for the REST API-based property listing sync system that replaces direct PostgreSQL connections with Supabase REST API calls.

## Core Components

### 1. PropertyListingRestSyncService

**File:** `backend/src/services/PropertyListingRestSyncService.ts`

**Purpose:** Main orchestrator for property listing synchronization using REST API

**Class Structure:**

```typescript
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { PropertyListingSyncProcessor } from './PropertyListingSyncProcessor';
import { SyncStateService } from './SyncStateService';
import { CircuitBreaker } from '../utils/CircuitBreaker';
import { retryWithBackoff } from '../utils/retryWithBackoff';

interface SyncConfig {
  supabaseUrl: string;
  supabaseKey: string;
  batchSize: number;
  rateLimit: number;
  retryAttempts: number;
  retryDelay: number;
  circuitBreakerThreshold: number;
  circuitBreakerTimeout: number;
}

interface SyncResult {
  syncId: string;
  status: 'completed' | 'failed' | 'partial';
  startedAt: Date;
  completedAt: Date;
  stats: {
    total: number;
    success: number;
    failed: number;
    skipped: number;
  };
  errors: Array<{
    propertyNumber: string;
    error: string;
    timestamp: Date;
  }>;
}

export class PropertyListingRestSyncService {
  private supabase: SupabaseClient;
  private processor: PropertyListingSyncProcessor;
  private stateService: SyncStateService;
  private circuitBreaker: CircuitBreaker;
  private config: SyncConfig;

  constructor(config: SyncConfig) {
    this.config = config;
    this.supabase = createClient(config.supabaseUrl, config.supabaseKey);
    this.processor = new PropertyListingSyncProcessor(this.supabase, config);
    this.stateService = new SyncStateService(this.supabase);
    this.circuitBreaker = new CircuitBreaker(
      config.circuitBreakerThreshold,
      config.circuitBreakerTimeout
    );
  }

  async syncAll(): Promise<SyncResult> {
    const syncId = await this.stateService.createSync('full');
    
    try {
      // Fetch property listings from Google Sheets
      const listings = await this.fetchFromSheets();
      
      // Update sync state with total count
      await this.stateService.updateSync(syncId, {
        status: 'in_progress',
        totalItems: listings.length
      });
      
      // Process in batches
      const result = await this.processor.processBatch(listings, syncId);
      
      // Update final state
      await this.stateService.updateSync(syncId, {
        status: result.stats.failed === 0 ? 'completed' : 'partial',
        ...result.stats
      });
      
      return result;
    } catch (error) {
      await this.stateService.updateSync(syncId, {
        status: 'failed',
        error: error.message
      });
      throw error;
    }
  }

  async syncByNumbers(numbers: string[]): Promise<SyncResult> {
    const syncId = await this.stateService.createSync('selective');
    
    try {
      // Fetch specific property listings
      const listings = await this.fetchByNumbers(numbers);
      
      await this.stateService.updateSync(syncId, {
        status: 'in_progress',
        totalItems: listings.length
      });
      
      const result = await this.processor.processBatch(listings, syncId);
      
      await this.stateService.updateSync(syncId, {
        status: result.stats.failed === 0 ? 'completed' : 'partial',
        ...result.stats
      });
      
      return result;
    } catch (error) {
      await this.stateService.updateSync(syncId, {
        status: 'failed',
        error: error.message
      });
      throw error;
    }
  }

  async getSyncStatus(syncId: string): Promise<SyncStatus> {
    return this.stateService.getSync(syncId);
  }

  async getHealth(): Promise<HealthStatus> {
    const lastSync = await this.stateService.getLastSync();
    const stats = await this.stateService.getStatistics();
    
    return {
      status: this.determineHealthStatus(stats),
      lastSync: lastSync?.completedAt,
      errorRate: stats.errorRate,
      avgSyncDuration: stats.avgDuration,
      queueSize: await this.processor.getQueueSize(),
      circuitBreakerState: this.circuitBreaker.getState()
    };
  }

  private async fetchFromSheets(): Promise<PropertyListing[]> {
    return retryWithBackoff(
      async () => {
        return this.circuitBreaker.execute(async () => {
          // Fetch from Google Sheets
          // Implementation details...
        });
      },
      {
        maxAttempts: this.config.retryAttempts,
        initialDelay: this.config.retryDelay,
        maxDelay: 16000,
        factor: 2
      }
    );
  }

  private determineHealthStatus(stats: SyncStatistics): 'healthy' | 'degraded' | 'unhealthy' {
    if (stats.errorRate > 0.1) return 'unhealthy';
    if (stats.errorRate > 0.05) return 'degraded';
    return 'healthy';
  }
}
```

### 2. PropertyListingSyncProcessor

**File:** `backend/src/services/PropertyListingSyncProcessor.ts`

**Purpose:** Process property listings in batches with rate limiting

```typescript
import { SupabaseClient } from '@supabase/supabase-js';
import PQueue from 'p-queue';
import { RateLimiter } from '../utils/rateLimiter';

export class PropertyListingSyncProcessor {
  private queue: PQueue;
  private rateLimiter: RateLimiter;
  private supabase: SupabaseClient;
  private config: SyncConfig;

  constructor(supabase: SupabaseClient, config: SyncConfig) {
    this.supabase = supabase;
    this.config = config;
    this.queue = new PQueue({
      concurrency: 5,
      interval: 1000,
      intervalCap: config.rateLimit
    });
    this.rateLimiter = new RateLimiter(config.rateLimit);
  }

  async processBatch(
    listings: PropertyListing[],
    syncId: string
  ): Promise<SyncResult> {
    const result: SyncResult = {
      syncId,
      status: 'completed',
      startedAt: new Date(),
      completedAt: new Date(),
      stats: {
        total: listings.length,
        success: 0,
        failed: 0,
        skipped: 0
      },
      errors: []
    };

    // Split into batches
    const batches = this.createBatches(listings, this.config.batchSize);

    // Process each batch
    for (const batch of batches) {
      await this.queue.add(async () => {
        await this.rateLimiter.acquire();
        
        try {
          await this.processSingleBatch(batch, result);
        } catch (error) {
          console.error('Batch processing error:', error);
          result.stats.failed += batch.length;
        }
      });
    }

    await this.queue.onIdle();
    result.completedAt = new Date();
    
    return result;
  }

  private async processSingleBatch(
    batch: PropertyListing[],
    result: SyncResult
  ): Promise<void> {
    try {
      // Use Supabase REST API for batch upsert
      const { data, error } = await this.supabase
        .from('property_listings')
        .upsert(batch, {
          onConflict: 'property_number',
          ignoreDuplicates: false
        });

      if (error) {
        throw error;
      }

      result.stats.success += batch.length;
    } catch (error) {
      // Handle individual failures
      for (const listing of batch) {
        try {
          await this.processSingleListing(listing);
          result.stats.success++;
        } catch (itemError) {
          result.stats.failed++;
          result.errors.push({
            propertyNumber: listing.property_number,
            error: itemError.message,
            timestamp: new Date()
          });
        }
      }
    }
  }

  private async processSingleListing(listing: PropertyListing): Promise<void> {
    const { error } = await this.supabase
      .from('property_listings')
      .upsert(listing, {
        onConflict: 'property_number'
      });

    if (error) {
      throw error;
    }
  }

  private createBatches<T>(items: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    return batches;
  }

  async getQueueSize(): Promise<number> {
    return this.queue.size + this.queue.pending;
  }
}
```

### 3. SyncStateService

**File:** `backend/src/services/SyncStateService.ts`

**Purpose:** Track and manage sync state in database

```typescript
import { SupabaseClient } from '@supabase/supabase-js';

interface SyncRecord {
  id: string;
  sync_type: string;
  status: string;
  started_at: Date;
  completed_at?: Date;
  total_items?: number;
  success_count: number;
  failed_count: number;
  skipped_count: number;
  error_details?: any;
}

export class SyncStateService {
  constructor(private supabase: SupabaseClient) {}

  async createSync(type: string): Promise<string> {
    const { data, error } = await this.supabase
      .from('sync_state')
      .insert({
        sync_type: type,
        status: 'queued',
        started_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;
    return data.id;
  }

  async updateSync(syncId: string, updates: Partial<SyncRecord>): Promise<void> {
    const { error } = await this.supabase
      .from('sync_state')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', syncId);

    if (error) throw error;
  }

  async getSync(syncId: string): Promise<SyncRecord> {
    const { data, error } = await this.supabase
      .from('sync_state')
      .select('*')
      .eq('id', syncId)
      .single();

    if (error) throw error;
    return data;
  }

  async getLastSync(): Promise<SyncRecord | null> {
    const { data, error } = await this.supabase
      .from('sync_state')
      .select('*')
      .order('started_at', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  }

  async getStatistics(): Promise<SyncStatistics> {
    const { data, error } = await this.supabase
      .from('sync_state')
      .select('*')
      .gte('started_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

    if (error) throw error;

    const total = data.length;
    const failed = data.filter(s => s.status === 'failed').length;
    const durations = data
      .filter(s => s.completed_at)
      .map(s => new Date(s.completed_at!).getTime() - new Date(s.started_at).getTime());

    return {
      errorRate: total > 0 ? failed / total : 0,
      avgDuration: durations.length > 0 
        ? durations.reduce((a, b) => a + b, 0) / durations.length / 1000
        : 0
    };
  }
}
```

### 4. CircuitBreaker

**File:** `backend/src/utils/CircuitBreaker.ts`

**Purpose:** Prevent cascading failures

```typescript
export class CircuitBreaker {
  private state: 'closed' | 'open' | 'half-open' = 'closed';
  private failureCount = 0;
  private lastFailureTime?: Date;

  constructor(
    private threshold: number,
    private timeout: number
  ) {}

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      if (this.shouldAttemptReset()) {
        this.state = 'half-open';
      } else {
        throw new Error('Circuit breaker is open');
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    this.failureCount = 0;
    this.state = 'closed';
  }

  private onFailure(): void {
    this.failureCount++;
    this.lastFailureTime = new Date();

    if (this.failureCount >= this.threshold) {
      this.state = 'open';
    }
  }

  private shouldAttemptReset(): boolean {
    if (!this.lastFailureTime) return false;

    const elapsed = Date.now() - this.lastFailureTime.getTime();
    return elapsed >= this.timeout;
  }

  getState(): string {
    return this.state;
  }
}
```

### 5. RetryWithBackoff

**File:** `backend/src/utils/retryWithBackoff.ts`

**Purpose:** Implement exponential backoff retry logic

```typescript
interface RetryOptions {
  maxAttempts: number;
  initialDelay: number;
  maxDelay: number;
  factor: number;
  onRetry?: (error: Error, attempt: number) => void;
}

export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions
): Promise<T> {
  let lastError: Error;
  let delay = options.initialDelay;

  for (let attempt = 1; attempt <= options.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      if (attempt === options.maxAttempts) {
        throw lastError;
      }

      if (options.onRetry) {
        options.onRetry(lastError, attempt);
      }

      await sleep(delay);
      delay = Math.min(delay * options.factor, options.maxDelay);
    }
  }

  throw lastError!;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
```

## Database Schema

### sync_state Table

```sql
CREATE TABLE sync_state (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sync_type VARCHAR(50) NOT NULL,
  status VARCHAR(20) NOT NULL,
  started_at TIMESTAMP NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMP,
  total_items INTEGER,
  success_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,
  skipped_count INTEGER DEFAULT 0,
  error_details JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sync_state_type ON sync_state(sync_type);
CREATE INDEX idx_sync_state_status ON sync_state(status);
CREATE INDEX idx_sync_state_started_at ON sync_state(started_at DESC);
```

## API Routes

### Sync Routes

**File:** `backend/src/routes/syncStatus.ts`

```typescript
import express from 'express';
import { PropertyListingRestSyncService } from '../services/PropertyListingRestSyncService';

const router = express.Router();
const syncService = new PropertyListingRestSyncService({
  supabaseUrl: process.env.SUPABASE_URL!,
  supabaseKey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
  batchSize: parseInt(process.env.SYNC_BATCH_SIZE || '100'),
  rateLimit: parseInt(process.env.SYNC_RATE_LIMIT || '10'),
  retryAttempts: parseInt(process.env.SYNC_RETRY_ATTEMPTS || '3'),
  retryDelay: parseInt(process.env.SYNC_RETRY_DELAY || '1000'),
  circuitBreakerThreshold: parseInt(process.env.CIRCUIT_BREAKER_THRESHOLD || '5'),
  circuitBreakerTimeout: parseInt(process.env.CIRCUIT_BREAKER_TIMEOUT || '60000')
});

// POST /api/sync/property-listings/manual
router.post('/property-listings/manual', async (req, res) => {
  try {
    const { force, batchSize, propertyNumbers } = req.body;
    
    let result;
    if (propertyNumbers && propertyNumbers.length > 0) {
      result = await syncService.syncByNumbers(propertyNumbers);
    } else {
      result = await syncService.syncAll();
    }
    
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/sync/property-listings/status/:syncId
router.get('/property-listings/status/:syncId', async (req, res) => {
  try {
    const status = await syncService.getSyncStatus(req.params.syncId);
    res.json(status);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/sync/property-listings/health
router.get('/property-listings/health', async (req, res) => {
  try {
    const health = await syncService.getHealth();
    res.json(health);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
```

## Configuration

### Environment Variables

```bash
# Supabase Configuration
SUPABASE_URL=https://fzcuexscuwhoywcicdqq.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Sync Configuration
SYNC_BATCH_SIZE=100
SYNC_RATE_LIMIT=10
SYNC_RETRY_ATTEMPTS=3
SYNC_RETRY_DELAY=1000
SYNC_CIRCUIT_BREAKER_THRESHOLD=5
SYNC_CIRCUIT_BREAKER_TIMEOUT=60000
```

## Migration Strategy

### Phase 1: Parallel Running
1. Deploy new REST API sync service
2. Run both old and new services in parallel
3. Compare results for consistency
4. Monitor performance metrics

### Phase 2: Gradual Cutover
1. Route 10% of sync operations to new service
2. Monitor for errors and performance
3. Gradually increase to 50%, then 100%
4. Keep old service as fallback

### Phase 3: Complete Migration
1. Disable old sync service
2. Remove old code
3. Update documentation
4. Monitor for issues

## Testing Strategy

### Unit Tests
- Test REST API client initialization
- Test retry logic with mocked failures
- Test batch processing logic
- Test rate limiting
- Test circuit breaker behavior

### Integration Tests
- Test end-to-end sync flow
- Test with real Supabase instance
- Test concurrent sync operations
- Test failure recovery

### Load Tests
- Test with 10,000+ property listings
- Test concurrent manual sync triggers
- Test under network instability
- Test API rate limiting

## Monitoring

### Metrics to Track
- Sync success rate
- Sync duration
- Error rate by type
- Queue size
- API response times
- Circuit breaker state

### Alerts
- Sync failure rate > 5%
- Sync duration > 10 minutes
- Queue size > 1000 items
- Circuit breaker open

---

**Created**: 2025-01-09  
**Version**: 1.0  
**Status**: Draft
