# Quick Start: Calendar Webhook Migrations (019-020)

## Step 1: Run Migrations via Supabase Dashboard

1. Open https://supabase.com/dashboard
2. Select your project
3. Go to **SQL Editor**
4. Run migration 019:
   - Click **New Query**
   - Copy/paste contents of `backend/migrations/019_add_calendar_webhook_channels.sql`
   - Click **Run**
5. Run migration 020:
   - Click **New Query**
   - Copy/paste contents of `backend/migrations/020_add_calendar_sync_tokens.sql`
   - Click **Run**

## Step 2: Verify Migrations

```bash
cd backend
npx ts-node migrations/verify-019-020-migrations.ts
```

Expected output:
```
✅ calendar_webhook_channels table exists
✅ calendar_sync_tokens table exists
✅ All migrations verified successfully!
```

## Done!

Your database is now ready for Google Calendar webhook notifications and sync functionality.

## Troubleshooting

### "Table already exists" error
The migrations have already been run. Skip to Step 2 to verify.

### "Could not find table" error in verification
The migrations haven't been run yet. Complete Step 1.

### Other errors
See `MIGRATION_019_020_INSTRUCTIONS.md` for detailed troubleshooting.
