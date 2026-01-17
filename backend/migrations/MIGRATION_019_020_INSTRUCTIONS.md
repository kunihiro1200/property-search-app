# Calendar Webhook and Sync Migrations (019-020)

## Overview

These migrations add support for Google Calendar webhook notifications and incremental synchronization:

- **Migration 019**: Creates `calendar_webhook_channels` table for storing webhook subscriptions
- **Migration 020**: Creates `calendar_sync_tokens` table for incremental sync tracking

## Prerequisites

- Access to Supabase Dashboard
- Service role key configured in `.env`

## Running the Migrations

### Via Supabase Dashboard (Required)

Since this project uses Supabase without direct PostgreSQL connection, you must run these migrations via the Supabase Dashboard:

1. Go to your Supabase project dashboard at https://supabase.com/dashboard
2. Select your project
3. Navigate to **SQL Editor** in the left sidebar
4. Click **New Query**
5. Copy and paste the entire contents of `backend/migrations/019_add_calendar_webhook_channels.sql`
6. Click **Run** (or press Ctrl+Enter)
7. Wait for success confirmation
8. Click **New Query** again
9. Copy and paste the entire contents of `backend/migrations/020_add_calendar_sync_tokens.sql`
10. Click **Run** (or press Ctrl+Enter)
11. Wait for success confirmation

**Important:** Run the migrations in order (019 first, then 020).

## Verification

After running the migrations, verify they were successful:

```bash
cd backend
npx ts-node migrations/verify-019-020-migrations.ts
```

Expected output:
```
🔍 Verifying calendar webhook and sync migrations (019-020)...

📋 Checking calendar_webhook_channels table...
✅ calendar_webhook_channels table exists
📋 Checking calendar_sync_tokens table...
✅ calendar_sync_tokens table exists

✅ All migrations verified successfully!

📋 Tables created:
  ✓ calendar_webhook_channels
  ✓ calendar_sync_tokens

🎉 Database is ready for Google Calendar webhook notifications and sync!
```

## What Gets Created

### calendar_webhook_channels Table

Stores Google Calendar webhook channel registrations:

- `id`: UUID primary key
- `channel_id`: Unique channel identifier from Google
- `resource_id`: Resource identifier for the watched calendar
- `employee_id`: Foreign key to employees table
- `expiration`: When the webhook subscription expires
- `created_at`, `updated_at`: Timestamps

**Indexes:**
- `idx_webhook_channels_employee` on `employee_id`
- `idx_webhook_channels_expiration` on `expiration`
- `idx_webhook_channels_channel_id` on `channel_id`

### calendar_sync_tokens Table

Stores sync tokens for incremental calendar synchronization:

- `id`: UUID primary key
- `employee_id`: Foreign key to employees table (UNIQUE)
- `sync_token`: Token from Google Calendar API
- `last_sync_at`: Timestamp of last successful sync
- `created_at`, `updated_at`: Timestamps

**Indexes:**
- `idx_sync_tokens_employee` on `employee_id`
- `idx_sync_tokens_last_sync` on `last_sync_at`

## Rollback

If you need to rollback these migrations:

```sql
-- Rollback migration 020
DROP TABLE IF EXISTS calendar_sync_tokens;

-- Rollback migration 019
DROP TABLE IF EXISTS calendar_webhook_channels;
```

## Next Steps

After running these migrations:

1. Implement `CalendarWebhookService` for webhook management
2. Implement `CalendarSyncService` for incremental sync
3. Add webhook endpoints to API routes
4. Set up periodic sync jobs
5. Configure webhook renewal jobs

## Troubleshooting

### Table Already Exists

If you see "table already exists" errors, the migrations may have already been run. Use the verification script to check.

### Foreign Key Constraint Fails

Ensure the `employees` table exists before running these migrations. It should have been created in earlier migrations.

### Permission Denied

Make sure you're using the service role key, not the anon key, when running migrations.
