# Migration 074: Add Rate Limit Log Table

## Purpose
Create a table to track API request rates for implementing rate limiting on the inquiry submission endpoint.

## Execution Steps

### 1. Open Supabase SQL Editor
1. Go to your Supabase project dashboard
2. Navigate to the SQL Editor
3. Create a new query

### 2. Execute the Migration SQL
Copy and paste the contents of `074_add_rate_limit_log.sql` into the SQL editor and run it.

Alternatively, run these commands directly:

```sql
-- Create rate_limit_log table
CREATE TABLE IF NOT EXISTS rate_limit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL,
  ip TEXT NOT NULL,
  path TEXT NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index for efficient querying
CREATE INDEX IF NOT EXISTS idx_rate_limit_log_key_timestamp 
  ON rate_limit_log(key, timestamp DESC);

-- Create index for cleanup queries
CREATE INDEX IF NOT EXISTS idx_rate_limit_log_timestamp 
  ON rate_limit_log(timestamp);

-- Add comment
COMMENT ON TABLE rate_limit_log IS 'Tracks API requests for rate limiting purposes';
COMMENT ON COLUMN rate_limit_log.key IS 'Unique key combining endpoint and IP address';
COMMENT ON COLUMN rate_limit_log.ip IS 'Client IP address';
COMMENT ON COLUMN rate_limit_log.path IS 'API endpoint path';
COMMENT ON COLUMN rate_limit_log.timestamp IS 'Request timestamp';
```

### 3. Verify the Migration
Run this query to verify the table was created:

```sql
SELECT 
  table_name,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_name = 'rate_limit_log'
ORDER BY ordinal_position;
```

Expected output should show:
- id (uuid)
- key (text)
- ip (text)
- path (text)
- timestamp (timestamp with time zone)
- created_at (timestamp with time zone)

### 4. Verify Indexes
Run this query to verify indexes were created:

```sql
SELECT
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'rate_limit_log';
```

Expected output should show:
- rate_limit_log_pkey (primary key on id)
- idx_rate_limit_log_key_timestamp
- idx_rate_limit_log_timestamp

## What This Migration Does

1. **Creates rate_limit_log table**: Stores request logs for rate limiting
   - `id`: Unique identifier for each log entry
   - `key`: Composite key combining endpoint path and IP address
   - `ip`: Client IP address making the request
   - `path`: API endpoint path being accessed
   - `timestamp`: When the request was made
   - `created_at`: When the log entry was created

2. **Creates performance indexes**:
   - `idx_rate_limit_log_key_timestamp`: Optimizes queries filtering by key and timestamp
   - `idx_rate_limit_log_timestamp`: Optimizes cleanup queries that delete old entries

## Usage

The rate limiter middleware (`backend/src/middleware/rateLimiter.ts`) uses this table to:
1. Track requests per IP address per endpoint
2. Count requests within a time window
3. Block requests that exceed the limit
4. Clean up old log entries

## Rate Limit Configuration

For the inquiry endpoint (`POST /api/public/inquiries`):
- **Window**: 1 hour (3600000 ms)
- **Max Requests**: 3 per IP address
- **Response**: 429 Too Many Requests when limit exceeded

## Cleanup

Old log entries are automatically cleaned up by the rate limiter middleware after checking the rate limit. Entries older than the time window are deleted to prevent the table from growing indefinitely.

## Rollback

If you need to rollback this migration:

```sql
DROP TABLE IF EXISTS rate_limit_log CASCADE;
```

## Next Steps

After running this migration:
1. Restart the backend server
2. Test the inquiry endpoint with rate limiting
3. Verify that rate limiting works correctly by making multiple requests
