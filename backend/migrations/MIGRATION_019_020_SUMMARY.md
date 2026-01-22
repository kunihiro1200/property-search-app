# Migration 019-020 Summary

## Overview

Created database schema for Google Calendar webhook notifications and incremental synchronization support.

## Files Created

### SQL Migration Files
- `019_add_calendar_webhook_channels.sql` - Creates webhook channels table
- `020_add_calendar_sync_tokens.sql` - Creates sync tokens table

### Runner Scripts
- `run-019-migration.ts` - Individual runner for migration 019
- `run-020-migration.ts` - Individual runner for migration 020
- `run-019-020-migrations.ts` - Combined runner for both migrations
- `run-019-020-direct.ts` - Alternative runner using direct API
- `run-019-020-pg.ts` - PostgreSQL-based runner (requires DATABASE_URL)

### Verification and Documentation
- `verify-019-020-migrations.ts` - Verifies migrations were applied successfully
- `MIGRATION_019_020_INSTRUCTIONS.md` - Detailed migration instructions
- `QUICK_START_019_020.md` - Quick start guide
- `MIGRATION_019_020_SUMMARY.md` - This file

## Database Changes

### New Tables

#### calendar_webhook_channels
Stores Google Calendar webhook channel registrations for push notifications.

**Columns:**
- `id` (UUID, PK) - Primary key
- `channel_id` (TEXT, UNIQUE) - Google Calendar channel identifier
- `resource_id` (TEXT) - Resource identifier for watched calendar
- `employee_id` (UUID, FK) - References employees(id)
- `expiration` (TIMESTAMPTZ) - Webhook expiration time
- `created_at` (TIMESTAMPTZ) - Creation timestamp
- `updated_at` (TIMESTAMPTZ) - Last update timestamp

**Indexes:**
- `idx_webhook_channels_employee` on `employee_id`
- `idx_webhook_channels_expiration` on `expiration`
- `idx_webhook_channels_channel_id` on `channel_id`

**Constraints:**
- UNIQUE on `channel_id`
- Foreign key to `employees(id)` with CASCADE delete

#### calendar_sync_tokens
Stores sync tokens for incremental Google Calendar synchronization.

**Columns:**
- `id` (UUID, PK) - Primary key
- `employee_id` (UUID, FK, UNIQUE) - References employees(id)
- `sync_token` (TEXT) - Google Calendar sync token
- `last_sync_at` (TIMESTAMPTZ) - Last successful sync timestamp
- `created_at` (TIMESTAMPTZ) - Creation timestamp
- `updated_at` (TIMESTAMPTZ) - Last update timestamp

**Indexes:**
- `idx_sync_tokens_employee` on `employee_id`
- `idx_sync_tokens_last_sync` on `last_sync_at`

**Constraints:**
- UNIQUE on `employee_id` (one sync token per employee)
- Foreign key to `employees(id)` with CASCADE delete

## Requirements Validated

These migrations support the following requirements from the spec:

- **Requirement 2.1**: Webhook registration for each connected employee
- **Requirement 2.4**: Webhook creation on calendar connection
- **Requirement 2.5**: Webhook cancellation on disconnection
- **Requirement 4.1**: Periodic sync using sync tokens
- **Requirement 4.4**: Sync token updates after sync operations

## Next Steps

After running these migrations:

1. ✅ Verify migrations with `verify-019-020-migrations.ts`
2. Implement `CalendarWebhookService` (Task 2)
3. Implement `CalendarSyncService` (Task 3)
4. Extend `CalendarService` (Task 4)
5. Add webhook API endpoints (Task 5)
6. Integrate with `GoogleAuthService` (Task 6)
7. Implement periodic sync jobs (Task 7)

## Rollback

To rollback these migrations:

```sql
DROP TABLE IF EXISTS calendar_sync_tokens;
DROP TABLE IF EXISTS calendar_webhook_channels;
```

## Notes

- Both tables use CASCADE delete on employee_id foreign key
- Webhook channels expire after max 7 days (Google Calendar limitation)
- Each employee can have only one sync token (UNIQUE constraint)
- All timestamps use TIMESTAMPTZ for timezone awareness
