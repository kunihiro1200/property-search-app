# Buyers Table VARCHAR Fix - Design Document

## Architecture Overview

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                     Execution Flow                          │
└─────────────────────────────────────────────────────────────┘

1. Pre-Migration Verification
   ├── verify-migration-050-ready.ts
   │   ├── Check table exists
   │   ├── Count current buyers (3,781)
   │   ├── Identify missing buyers (356)
   │   └── Recommend actions
   │
2. Schema Migration (Migration 050)
   ├── Supabase SQL Editor (Option A - Recommended)
   │   └── Manual execution of SQL file
   │
   └── CLI Execution (Option B)
       └── run-050-direct.ts
           └── Executes SQL via Supabase client
   │
3. Schema Verification
   ├── check-buyers-varchar-columns.ts
   │   ├── Query information_schema
   │   ├── Count VARCHAR(50) columns (should be 0)
   │   └── Count TEXT columns (should be 130+)
   │
4. Buyer Re-sync
   ├── sync-buyers.ts
   │   ├── Authenticate with Google Sheets
   │   ├── Read all buyer rows (4,137)
   │   ├── Map columns to database fields
   │   ├── Upsert to Supabase
   │   └── Report results (作成/更新/失敗)
   │
5. Post-Sync Verification
   └── check-buyer-count-comparison.ts
       ├── Count spreadsheet buyers
       ├── Count database buyers
       ├── Calculate difference
       └── Report status
```

## Database Schema Design

### Current Schema (Before Migration)

```sql
-- Problematic columns (130+ fields)
CREATE TABLE buyers (
  id UUID PRIMARY KEY,
  buyer_number VARCHAR(50),  -- ❌ Too short
  name VARCHAR(50),          -- ❌ Too short for Japanese names
  email VARCHAR(50),         -- ❌ Too short for long emails
  property_address VARCHAR(50), -- ❌ Too short for addresses
  athome_url VARCHAR(50),    -- ❌ Too short for URLs
  -- ... 125+ more VARCHAR(50) columns
);
```

### Target Schema (After Migration)

```sql
-- Fixed columns
CREATE TABLE buyers (
  id UUID PRIMARY KEY,
  buyer_number TEXT,         -- ✅ Unlimited length
  name TEXT,                 -- ✅ Unlimited length
  email TEXT,                -- ✅ Unlimited length
  property_address TEXT,     -- ✅ Unlimited length
  athome_url TEXT,           -- ✅ Unlimited length
  -- ... 125+ more TEXT columns
);
```

### Migration Strategy

**Approach**: ALTER TABLE with TYPE conversion

**Advantages**:
- ✅ Preserves existing data
- ✅ Atomic operation (all or nothing)
- ✅ No downtime required
- ✅ Reversible if needed

**SQL Pattern**:
```sql
ALTER TABLE buyers
  ALTER COLUMN column_name TYPE TEXT;
```

**Batch Execution**:
```sql
ALTER TABLE buyers
  ALTER COLUMN name TYPE TEXT,
  ALTER COLUMN email TYPE TEXT,
  ALTER COLUMN phone_number TYPE TEXT,
  -- ... all 130+ columns in single statement
```

## Column Categories

### Category 1: Basic Information (7 columns)
```sql
ALTER COLUMN name TYPE TEXT,
ALTER COLUMN nickname TYPE TEXT,
ALTER COLUMN phone_number TYPE TEXT,
ALTER COLUMN email TYPE TEXT,
ALTER COLUMN line_id TYPE TEXT,
ALTER COLUMN current_residence TYPE TEXT,
ALTER COLUMN company_name TYPE TEXT
```

**Rationale**: Japanese names, long email addresses, company names can exceed 50 chars

### Category 2: Property & Address (10 columns)
```sql
ALTER COLUMN building_name_price TYPE TEXT,
ALTER COLUMN property_address TYPE TEXT,
ALTER COLUMN property_number TYPE TEXT,
ALTER COLUMN property_assignee TYPE TEXT,
ALTER COLUMN display_address TYPE TEXT,
ALTER COLUMN location TYPE TEXT,
ALTER COLUMN athome_url TYPE TEXT,
ALTER COLUMN google_map_url TYPE TEXT,
ALTER COLUMN pdf_url TYPE TEXT,
ALTER COLUMN image_url TYPE TEXT
```

**Rationale**: Japanese addresses are long, URLs can be 100+ characters

### Category 3: Assignees & Contacts (6 columns)
```sql
ALTER COLUMN initial_assignee TYPE TEXT,
ALTER COLUMN follow_up_assignee TYPE TEXT,
ALTER COLUMN assignee_work_days TYPE TEXT,
ALTER COLUMN email_confirmation_assignee TYPE TEXT,
ALTER COLUMN viewing_promotion_sender TYPE TEXT,
ALTER COLUMN notification_sender TYPE TEXT
```

**Rationale**: Multiple assignee names, work schedules can be lengthy

### Category 4: Status & Types (10 columns)
```sql
ALTER COLUMN distribution_type TYPE TEXT,
ALTER COLUMN inquiry_source TYPE TEXT,
ALTER COLUMN inquiry_confidence TYPE TEXT,
ALTER COLUMN offer_status TYPE TEXT,
ALTER COLUMN email_type TYPE TEXT,
ALTER COLUMN viewing_type TYPE TEXT,
ALTER COLUMN viewing_type_general TYPE TEXT,
ALTER COLUMN property_type TYPE TEXT,
ALTER COLUMN current_status TYPE TEXT,
ALTER COLUMN structure TYPE TEXT
```

**Rationale**: Status descriptions can be detailed

### Category 5: Desired Conditions (5 columns)
```sql
ALTER COLUMN desired_area TYPE TEXT,
ALTER COLUMN desired_property_type TYPE TEXT,
ALTER COLUMN desired_building_age TYPE TEXT,
ALTER COLUMN desired_floor_plan TYPE TEXT,
ALTER COLUMN desired_timing TYPE TEXT
```

**Rationale**: Detailed buyer preferences and requirements

### Category 6: Boolean-like Fields (8 columns)
```sql
ALTER COLUMN hot_spring_required TYPE TEXT,
ALTER COLUMN parking_spaces TYPE TEXT,
ALTER COLUMN monthly_parking_ok TYPE TEXT,
ALTER COLUMN garden_required TYPE TEXT,
ALTER COLUMN good_view_required TYPE TEXT,
ALTER COLUMN pet_allowed_required TYPE TEXT,
ALTER COLUMN high_floor_required TYPE TEXT,
ALTER COLUMN corner_room_required TYPE TEXT
```

**Rationale**: Stored as text with additional notes

### Category 7: References & Links (9 columns)
```sql
ALTER COLUMN pinrich TYPE TEXT,
ALTER COLUMN pinrich_link TYPE TEXT,
ALTER COLUMN viewing_sheet TYPE TEXT,
ALTER COLUMN offer_property_sheet TYPE TEXT,
ALTER COLUMN past_viewing_1 TYPE TEXT,
ALTER COLUMN past_viewing_2 TYPE TEXT,
ALTER COLUMN past_viewing_3 TYPE TEXT,
ALTER COLUMN past_buyer_list TYPE TEXT,
ALTER COLUMN past_latest_confidence TYPE TEXT
```

**Rationale**: URLs and reference IDs can be long

### Category 8: Contact & Communication (8 columns)
```sql
ALTER COLUMN re_inquiry_viewing TYPE TEXT,
ALTER COLUMN post_viewing_seller_contact TYPE TEXT,
ALTER COLUMN seller_viewing_contact TYPE TEXT,
ALTER COLUMN buyer_viewing_contact TYPE TEXT,
ALTER COLUMN post_offer_lost_contact TYPE TEXT,
ALTER COLUMN seller_viewing_date_contact TYPE TEXT,
ALTER COLUMN seller_cancel_contact TYPE TEXT
```

**Rationale**: Communication logs and notes

### Category 9: Chat & Notifications (8 columns)
```sql
ALTER COLUMN chat_to_yamamoto TYPE TEXT,
ALTER COLUMN chat_to_ura TYPE TEXT,
ALTER COLUMN chat_to_kunihiro TYPE TEXT,
ALTER COLUMN offer_lost_chat TYPE TEXT,
ALTER COLUMN image_chat_sent TYPE TEXT,
ALTER COLUMN email_to_takeuchi TYPE TEXT,
ALTER COLUMN email_to_kadoi TYPE TEXT,
ALTER COLUMN hirose_to_office TYPE TEXT
```

**Rationale**: Chat messages and notification records

### Category 10: Email & Inquiry (4 columns)
```sql
ALTER COLUMN inquiry_email_phone TYPE TEXT,
ALTER COLUMN inquiry_email_reply TYPE TEXT,
ALTER COLUMN broker_inquiry TYPE TEXT,
ALTER COLUMN inflow_source_phone TYPE TEXT
```

**Rationale**: Email content and inquiry details

### Category 11: Viewing & Offers (7 columns)
```sql
ALTER COLUMN viewing_calendar_note TYPE TEXT,
ALTER COLUMN viewing_unconfirmed TYPE TEXT,
ALTER COLUMN offer_exists_viewing_ng TYPE TEXT,
ALTER COLUMN offer_exists_viewing_ok TYPE TEXT,
ALTER COLUMN viewing_comment_confirmed TYPE TEXT,
ALTER COLUMN viewing_promotion_result TYPE TEXT,
ALTER COLUMN viewing_promotion_not_needed TYPE TEXT
```

**Rationale**: Viewing notes and offer details

### Category 12: Property Details (10 columns)
```sql
ALTER COLUMN parking TYPE TEXT,
ALTER COLUMN viewing_parking TYPE TEXT,
ALTER COLUMN parking_valuation TYPE TEXT,
ALTER COLUMN land_area TYPE TEXT,
ALTER COLUMN building_area TYPE TEXT,
ALTER COLUMN floor_plan TYPE TEXT,
ALTER COLUMN build_year TYPE TEXT,
ALTER COLUMN floor_count TYPE TEXT,
ALTER COLUMN owner_name TYPE TEXT,
ALTER COLUMN loan_balance TYPE TEXT
```

**Rationale**: Detailed property specifications

### Category 13: Price & Budget (5 columns)
```sql
ALTER COLUMN budget TYPE TEXT,
ALTER COLUMN price TYPE TEXT,
ALTER COLUMN price_range_house TYPE TEXT,
ALTER COLUMN price_range_apartment TYPE TEXT,
ALTER COLUMN price_range_land TYPE TEXT
```

**Rationale**: Price ranges with notes

### Category 14: Surveys & Confirmations (5 columns)
```sql
ALTER COLUMN viewing_survey_confirmed TYPE TEXT,
ALTER COLUMN valuation_survey TYPE TEXT,
ALTER COLUMN valuation_survey_confirmed TYPE TEXT,
ALTER COLUMN email_confirmed TYPE TEXT,
ALTER COLUMN email_effect_verification TYPE TEXT
```

**Rationale**: Survey responses and confirmations

### Category 15: Miscellaneous (38 columns)
```sql
ALTER COLUMN panorama_deleted TYPE TEXT,
ALTER COLUMN column_a TYPE TEXT,
ALTER COLUMN public_private TYPE TEXT,
ALTER COLUMN day_of_week TYPE TEXT,
ALTER COLUMN sale_chance TYPE TEXT,
ALTER COLUMN campaign_applicable TYPE TEXT,
ALTER COLUMN data_updated TYPE TEXT,
ALTER COLUMN viewing_time TYPE TEXT,
ALTER COLUMN first_view TYPE TEXT,
ALTER COLUMN other_company_property TYPE TEXT,
ALTER COLUMN other_company_name TYPE TEXT,
ALTER COLUMN other_valuation_done TYPE TEXT,
ALTER COLUMN visit_desk TYPE TEXT,
ALTER COLUMN seller_list_copy TYPE TEXT,
ALTER COLUMN seller_copy TYPE TEXT,
ALTER COLUMN buyer_copy TYPE TEXT,
ALTER COLUMN three_calls_confirmed TYPE TEXT,
ALTER COLUMN property_search_reference TYPE TEXT,
ALTER COLUMN first_come_first_served TYPE TEXT,
ALTER COLUMN market_reference TYPE TEXT,
ALTER COLUMN smooth_process TYPE TEXT,
ALTER COLUMN pre_release_decision_text TYPE TEXT,
ALTER COLUMN owned_home_hearing TYPE TEXT,
ALTER COLUMN pre_viewing_hearing_send TYPE TEXT,
ALTER COLUMN valuation_required TYPE TEXT,
ALTER COLUMN buyer_id TYPE TEXT,
ALTER COLUMN phone_duplicate_count TYPE TEXT
-- ... additional fields
```

**Rationale**: Various tracking and metadata fields

## Sync Process Design

### Data Flow

```
Google Sheets (買主リスト)
    ↓
GoogleSheetsClient.authenticate()
    ↓
GoogleSheetsClient.readAll()
    ↓
Filter valid buyer numbers
    ↓
BuyerColumnMapper.mapRow()
    ↓
Supabase.upsert(buyers)
    ↓
Report results
```

### Sync Logic

```typescript
// Pseudo-code for sync process
async function syncBuyers() {
  // 1. Authenticate
  await sheetsClient.authenticate();
  
  // 2. Read all rows
  const rows = await sheetsClient.readAll();
  
  // 3. Filter valid buyers
  const validBuyers = rows.filter(row => 
    row['買主番号'] && String(row['買主番号']).trim() !== ''
  );
  
  // 4. Map and upsert
  let created = 0, updated = 0, failed = 0;
  
  for (const row of validBuyers) {
    try {
      const mappedData = columnMapper.mapRow(row);
      const { error } = await supabase
        .from('buyers')
        .upsert(mappedData, { onConflict: 'buyer_number' });
      
      if (error) {
        failed++;
        console.error(`Failed: ${row['買主番号']}`, error);
      } else {
        // Check if created or updated
        const isNew = !existingBuyerNumbers.includes(row['買主番号']);
        isNew ? created++ : updated++;
      }
    } catch (err) {
      failed++;
      console.error(`Exception: ${row['買主番号']}`, err);
    }
  }
  
  // 5. Report
  console.log(`作成: ${created}件`);
  console.log(`更新: ${updated}件`);
  console.log(`失敗: ${failed}件`);
}
```

## Verification Design

### Pre-Migration Verification

```typescript
// verify-migration-050-ready.ts
async function verifyReady() {
  // 1. Check table exists
  const tableExists = await checkTableExists('buyers');
  
  // 2. Count current buyers
  const { count: dbCount } = await supabase
    .from('buyers')
    .select('*', { count: 'exact', head: true });
  
  // 3. Count spreadsheet buyers
  const sheetCount = await countSpreadsheetBuyers();
  
  // 4. Calculate missing
  const missing = sheetCount - dbCount;
  
  // 5. Recommend action
  if (missing > 0) {
    console.log(`⚠️  ${missing} buyers missing`);
    console.log('✅ Ready to execute Migration 050');
  }
}
```

### Schema Verification

```typescript
// check-buyers-varchar-columns.ts
async function checkSchema() {
  // Query information_schema
  const { data } = await supabase.rpc('exec_sql', {
    sql: `
      SELECT column_name, data_type, character_maximum_length
      FROM information_schema.columns
      WHERE table_name = 'buyers'
      AND data_type = 'character varying'
      AND character_maximum_length = 50
    `
  });
  
  // Report results
  console.log(`VARCHAR(50) columns: ${data.length}`);
  if (data.length === 0) {
    console.log('✅ All columns converted to TEXT');
  } else {
    console.log('❌ Still have VARCHAR(50) columns');
    data.forEach(col => console.log(`  - ${col.column_name}`));
  }
}
```

### Count Verification

```typescript
// check-buyer-count-comparison.ts
async function compareCount() {
  // 1. Count spreadsheet
  const sheetCount = await countSpreadsheetBuyers();
  
  // 2. Count database
  const { count: dbCount } = await supabase
    .from('buyers')
    .select('*', { count: 'exact', head: true });
  
  // 3. Calculate difference
  const diff = sheetCount - dbCount;
  
  // 4. Report
  console.log(`Spreadsheet: ${sheetCount} buyers`);
  console.log(`Database: ${dbCount} buyers`);
  console.log(`Difference: ${diff} buyers not synced`);
  
  if (diff === 0) {
    console.log('✅ Counts match!');
  } else {
    console.log(`⚠️  ${diff} buyers missing`);
  }
}
```

## Error Handling

### Migration Errors

```typescript
// Potential errors and solutions
const migrationErrors = {
  'permission denied': {
    cause: 'Insufficient database permissions',
    solution: 'Use Supabase SQL Editor or check SUPABASE_SERVICE_KEY'
  },
  'function exec_sql does not exist': {
    cause: 'RPC function not available',
    solution: 'Use Supabase SQL Editor (Option A)'
  },
  'relation "buyers" does not exist': {
    cause: 'Table not created yet',
    solution: 'Run migration 042_add_buyers_complete.sql first'
  }
};
```

### Sync Errors

```typescript
// Potential sync errors
const syncErrors = {
  'value too long for type character varying(50)': {
    cause: 'Migration 050 not executed',
    solution: 'Execute Migration 050 first'
  },
  'duplicate key value violates unique constraint': {
    cause: 'Buyer number already exists',
    solution: 'Normal - will update existing record'
  },
  'authentication failed': {
    cause: 'Google Service Account credentials invalid',
    solution: 'Check google-service-account.json file'
  }
};
```

## Performance Considerations

### Migration Performance

**Expected Duration**: < 30 seconds

**Factors**:
- Table size: 3,781 rows (small)
- Column count: 130+ columns
- Operation: ALTER TABLE (metadata only)
- No data rewrite needed (VARCHAR → TEXT is compatible)

### Sync Performance

**Expected Duration**: 2-3 minutes

**Factors**:
- Spreadsheet read: ~30 seconds (4,137 rows)
- Network latency: ~1 second per batch
- Database upsert: ~1-2 minutes (batch operations)
- Logging overhead: minimal

**Optimization**:
- Batch upserts (100 rows per batch)
- Parallel processing (5 concurrent batches)
- Connection pooling
- Minimal logging

## Security Considerations

### Database Access

- ✅ Use SUPABASE_SERVICE_KEY (not anon key)
- ✅ Restrict to backend only (never expose to frontend)
- ✅ Rotate keys periodically

### Google Sheets Access

- ✅ Use Service Account (not OAuth)
- ✅ Restrict to specific spreadsheet
- ✅ Read-only access sufficient

### Data Privacy

- ✅ Buyer data contains PII (names, emails, phones)
- ✅ Ensure encryption at rest (Supabase default)
- ✅ Ensure encryption in transit (HTTPS)
- ✅ Log minimal PII in error messages

## Rollback Strategy

### If Migration Fails

```sql
-- Rollback: Convert TEXT back to VARCHAR(50)
-- WARNING: Will truncate data > 50 chars!
ALTER TABLE buyers
  ALTER COLUMN name TYPE VARCHAR(50),
  ALTER COLUMN email TYPE VARCHAR(50)
  -- ... all columns
```

**Note**: Rollback not recommended as it will cause data loss

### If Sync Fails

- No rollback needed (upsert is idempotent)
- Fix error and re-run sync
- Existing data preserved

## Testing Strategy

### Pre-Production Testing

1. **Schema Verification**
   - Run on test database first
   - Verify column types changed
   - Verify data preserved

2. **Sync Testing**
   - Test with small subset (10 buyers)
   - Verify upsert logic
   - Check error handling

3. **Count Verification**
   - Compare counts before/after
   - Verify no data loss

### Production Execution

1. **Backup** (optional but recommended)
   - Export buyers table to CSV
   - Store in safe location

2. **Execute Migration**
   - Use Supabase SQL Editor
   - Monitor for errors

3. **Verify Schema**
   - Run check-buyers-varchar-columns.ts
   - Confirm 0 VARCHAR(50) columns

4. **Execute Sync**
   - Run sync-buyers.ts
   - Monitor progress

5. **Verify Counts**
   - Run check-buyer-count-comparison.ts
   - Confirm 0 difference

## Documentation Structure

```
backend/
├── BUYERS_TABLE_VARCHAR_FIX_NOW.md          # Primary guide (4-min fix)
├── BUYERS_SYNC_STATUS_SUMMARY.md            # Status overview
├── BUYERS_TABLE_FIX_COMPLETE_GUIDE.md       # Detailed guide
├── BUYERS_FIX_QUICK_CARD.md                 # Quick reference
├── BUYERS_TABLE_README.md                   # Main entry point
├── BUYERS_TABLE_DOCUMENTATION_INDEX.md      # Documentation index
├── BUYERS_TABLE_QUICK_START.md              # Quick start guide
├── BUYERS_TABLE_SETUP_GUIDE.md              # Setup guide
├── BUYERS_TABLE_SETUP_COMPLETE.md           # Complete setup
├── BUYER_SYNC_FIX_GUIDE.md                  # Sync fix guide
├── BUYER_SYNC_NEXT_STEPS.md                 # Next steps
├── BUYER_SYNC_MIGRATION_050_READY.md        # Migration ready
└── migrations/
    ├── 050_fix_remaining_buyer_varchar_fields.sql  # The fix
    ├── run-050-direct.ts                           # CLI runner
    ├── verify-migration-050-ready.ts               # Pre-check
    ├── check-buyers-varchar-columns.ts             # Schema check
    └── check-buyer-count-comparison.ts             # Count check
```

---

**Design Status**: Complete ✅  
**Implementation Status**: Ready to Execute ✅  
**Documentation Status**: Complete ✅
