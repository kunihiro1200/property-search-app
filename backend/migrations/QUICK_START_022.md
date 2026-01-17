# Quick Start: Migration 022

## Run the Migration (2 minutes)

### Step 1: Copy the SQL

```sql
-- Migration 022: Add site column to sellers table
ALTER TABLE sellers ADD COLUMN site VARCHAR(100) NULL;
CREATE INDEX idx_sellers_site ON sellers(site);
COMMENT ON COLUMN sellers.site IS 'Website or channel from which the seller inquiry originated (e.g., ウビ, HP, at-home)';
```

### Step 2: Execute in Supabase

1. Open [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Click **SQL Editor** in the left sidebar
4. Click **New query**
5. Paste the SQL from Step 1
6. Click **Run** (or press Ctrl+Enter)

### Step 3: Verify

Run this command in your terminal:

```bash
cd backend
npx ts-node migrations/verify-022-migration.ts
```

You should see:
```
✅ PASSED: site column exists and is accessible
✅ PASSED: site column is nullable
✅ PASSED: site column is writable
🎉 Migration 022 Verification: SUCCESS
```

## That's it!

You're ready to proceed with the next tasks.

## Troubleshooting

**"column already exists"** → Migration already applied, run verification to confirm

**"permission denied"** → Use an admin account or service role key

**"relation does not exist"** → Run earlier migrations first

For detailed instructions, see [MIGRATION_022_INSTRUCTIONS.md](./MIGRATION_022_INSTRUCTIONS.md)
