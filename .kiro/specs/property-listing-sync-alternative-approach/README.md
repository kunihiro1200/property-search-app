# Property Listing Sync - Alternative Approach

## 📖 Overview

This specification provides a comprehensive solution for replacing the current direct PostgreSQL connection-based property listing sync with a more reliable REST API-based approach using Supabase.

## 🎯 Problem Statement

The current property listing auto-sync implementation faces critical database connection issues:

- **Connection Failures:** `getaddrinfo ENOTFOUND` errors when connecting to Supabase
- **Timeouts:** Connection timeouts during sync operations
- **Startup Issues:** EnhancedAutoSyncService fails to initialize properly
- **Unreliability:** Sync operations fail unpredictably

These issues prevent:
- AA13226 and other properties from displaying in browser
- AA4885 ATBB status from syncing correctly
- Property listing updates from propagating
- Reliable system operation

## ✅ Solution

Replace direct PostgreSQL connections with Supabase REST API:

### Key Benefits

1. **No Direct Database Connections**
   - Uses Supabase REST API (PostgREST)
   - Built-in connection pooling
   - Automatic retry and error handling
   - Better serverless compatibility

2. **Improved Reliability**
   - Circuit breaker prevents cascading failures
   - Exponential backoff for transient errors
   - Graceful degradation under load
   - >99% success rate target

3. **Better Monitoring**
   - Real-time sync status tracking
   - Comprehensive error logging
   - Health metrics and alerts
   - Dashboard for visualization

## 📁 Documentation Structure

### Core Documents

1. **[requirements.md](./requirements.md)** - Detailed Requirements
   - Problem analysis
   - User stories
   - Functional requirements
   - Technical specifications
   - Success criteria

2. **[design.md](./design.md)** - Technical Design
   - Architecture overview
   - Component design
   - Database schema
   - API routes
   - Implementation details

3. **[tasks.md](./tasks.md)** - Implementation Tasks
   - Phase-by-phase breakdown
   - Detailed subtasks
   - Acceptance criteria
   - Time estimates
   - Dependencies

4. **[QUICK_START.md](./QUICK_START.md)** - Quick Start Guide
   - Fast implementation path
   - Configuration guide
   - Testing strategy
   - Deployment plan
   - Troubleshooting

## 🏗️ Architecture

```
Application Layer
    ↓
PropertyListingRestSyncService (Main orchestrator)
    ↓
PropertyListingSyncProcessor (Batch processing)
    ↓
Supabase Client (with retry & circuit breaker)
    ↓
Supabase REST API (PostgREST)
    ↓
PostgreSQL Database
```

## 🚀 Quick Start

### 1. Read the Documentation
```bash
# Start here for quick overview
cat QUICK_START.md

# Then read detailed requirements
cat requirements.md

# Finally review technical design
cat design.md
```

### 2. Install Dependencies
```bash
cd backend
npm install @supabase/supabase-js p-queue p-retry
```

### 3. Configure Environment
```bash
# Add to backend/.env
SYNC_BATCH_SIZE=100
SYNC_RATE_LIMIT=10
SYNC_RETRY_ATTEMPTS=3
SYNC_RETRY_DELAY=1000
SYNC_CIRCUIT_BREAKER_THRESHOLD=5
SYNC_CIRCUIT_BREAKER_TIMEOUT=60000
```

### 4. Start Implementation
```bash
# Follow tasks.md for step-by-step implementation
# Start with Phase 1: REST API Sync Service
```

## 📊 Implementation Timeline

| Phase | Description | Time | Priority |
|-------|-------------|------|----------|
| Phase 1 | REST API Sync Service | 2-3 days | High |
| Phase 2 | Queue-Based Processing | 2-3 days | High |
| Phase 3 | Sync State Management | 2-3 days | Medium |
| Phase 4 | Migration and Testing | 2-3 days | High |
| **Total** | **Complete Implementation** | **8-12 days** | **High** |

## 🎯 Success Criteria

After implementation, the system should achieve:

- ✅ Sync success rate > 99%
- ✅ No database connection errors
- ✅ Sync duration < 5 minutes for 1,000 items
- ✅ Automatic recovery from failures
- ✅ Real-time monitoring and alerts
- ✅ API response time < 500ms
- ✅ Queue processing < 1 second per item

## 🔧 Key Components

### 1. PropertyListingRestSyncService
Main orchestrator for sync operations
- Fetches data from Google Sheets
- Coordinates batch processing
- Tracks sync state
- Provides health metrics

### 2. PropertyListingSyncProcessor
Handles batch processing with rate limiting
- Processes items in configurable batches
- Implements rate limiting
- Retries failed items
- Tracks statistics

### 3. SyncStateService
Manages sync state in database
- Creates sync records
- Updates sync status
- Calculates statistics
- Provides history

### 4. CircuitBreaker
Prevents cascading failures
- Opens after threshold failures
- Closes after timeout
- Provides fail-fast behavior

### 5. RetryWithBackoff
Implements exponential backoff
- Configurable retry attempts
- Exponential delay increase
- Callback support

## 📈 Monitoring

### Metrics Tracked
- Sync success rate
- Sync duration
- Error rate by type
- Queue size
- API response times
- Circuit breaker state

### Alerts Configured
- Sync failure rate > 5%
- Sync duration > 10 minutes
- Queue size > 1000 items
- Circuit breaker open

## 🔄 Migration Strategy

### Phase 1: Parallel Running
- Deploy new service alongside old
- Route 10% traffic to new service
- Monitor and compare results

### Phase 2: Gradual Cutover
- Increase traffic: 25% → 50% → 75% → 100%
- Monitor at each step
- Keep old service as fallback

### Phase 3: Complete Migration
- Disable old service
- Remove old code
- Update documentation

## 🧪 Testing

### Unit Tests
- Individual component testing
- Mocked dependencies
- Edge case coverage

### Integration Tests
- End-to-end sync flow
- Real Supabase instance
- Concurrent operations
- Failure recovery

### Load Tests
- 10,000+ property listings
- Concurrent manual syncs
- Network instability
- API rate limiting

## 📚 API Endpoints

### POST /api/sync/property-listings/manual
Trigger manual sync
```json
{
  "force": false,
  "batchSize": 100,
  "propertyNumbers": ["AA12345"]
}
```

### GET /api/sync/property-listings/status/:syncId
Get sync status
```json
{
  "syncId": "uuid",
  "status": "completed",
  "stats": { "total": 1000, "success": 995, "failed": 5 }
}
```

### GET /api/sync/property-listings/health
Get health status
```json
{
  "status": "healthy",
  "lastSync": "2025-01-09T09:00:00Z",
  "errorRate": 0.005
}
```

## 🛠️ Configuration

### Environment Variables
```bash
# Supabase
SUPABASE_URL=https://fzcuexscuwhoywcicdqq.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-key

# Sync Settings
SYNC_BATCH_SIZE=100
SYNC_RATE_LIMIT=10
SYNC_RETRY_ATTEMPTS=3
SYNC_RETRY_DELAY=1000
SYNC_CIRCUIT_BREAKER_THRESHOLD=5
SYNC_CIRCUIT_BREAKER_TIMEOUT=60000
```

## 🆘 Troubleshooting

### Common Issues

**Issue:** Supabase API rate limiting
- **Solution:** Adjust `SYNC_RATE_LIMIT` in `.env`

**Issue:** Circuit breaker opens frequently
- **Solution:** Increase `SYNC_CIRCUIT_BREAKER_THRESHOLD`

**Issue:** Sync takes too long
- **Solution:** Increase `SYNC_BATCH_SIZE` or `SYNC_RATE_LIMIT`

**Issue:** Too many retries
- **Solution:** Adjust `SYNC_RETRY_ATTEMPTS` and `SYNC_RETRY_DELAY`

## 📖 References

- [Supabase REST API Documentation](https://supabase.com/docs/reference/javascript/introduction)
- [Circuit Breaker Pattern](https://martinfowler.com/bliki/CircuitBreaker.html)
- [Exponential Backoff](https://en.wikipedia.org/wiki/Exponential_backoff)
- [Token Bucket Algorithm](https://en.wikipedia.org/wiki/Token_bucket)

## 🤝 Contributing

When implementing this spec:

1. Follow the task order in `tasks.md`
2. Write tests before implementation
3. Update documentation as you go
4. Monitor metrics continuously
5. Keep rollback plan ready

## 📞 Support

For issues or questions:

1. Check `QUICK_START.md` troubleshooting section
2. Review `design.md` for technical details
3. Check Supabase status: https://status.supabase.com
4. Review error logs in `sync_state` table

## 📝 Status

- **Created:** 2025-01-09
- **Status:** Ready for Implementation
- **Priority:** High
- **Estimated Effort:** 8-12 days
- **Target Success Rate:** >99%

## 🎉 Next Steps

1. ✅ Read this README
2. ✅ Review QUICK_START.md
3. ✅ Read requirements.md
4. ✅ Review design.md
5. ⏳ Start implementation with tasks.md
6. ⏳ Set up monitoring
7. ⏳ Deploy and test
8. ⏳ Monitor and optimize

---

**This specification provides a complete solution for reliable property listing synchronization using Supabase REST API instead of direct PostgreSQL connections.**
