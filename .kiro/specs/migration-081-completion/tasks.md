# Migration 081 Completion - Tasks

## Overview

This document outlines the tasks required to complete and verify Migration 081, which creates the database schema for Phase 2 (Properties & Valuations).

## Task Breakdown

### Phase 1: Diagnostic (User Action Required)

#### Task 1.1: Execute Diagnostic SQL Queries
**Priority**: Critical  
**Estimated Time**: 5 minutes  
**Assignee**: User  
**Status**: ✅ Complete

**Description**: Run SQL queries in Supabase Dashboard to check actual database state.

**Steps**:
1. Open Supabase Dashboard
2. Navigate to SQL Editor
3. Execute properties table diagnostic query
4. Execute valuations table diagnostic query
5. Record results

**SQL Queries**:
```sql
-- Check properties table columns
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'properties' 
ORDER BY ordinal_position;

-- Check valuations table columns
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'valuations' 
ORDER BY ordinal_position;
```

**Acceptance Criteria**:
- [x] Queries execute without errors
- [x] Results show list of columns for each table
- [x] User can determine if required columns exist

**Deliverables**:
- ✅ Diagnostic results confirmed: All required columns exist in both tables

**Result**: Both `properties` and `valuations` tables have all required columns. Proceeding to Pattern C (PostgREST cache reload).

---

### Phase 2: Resolution (Conditional)

#### Task 2.1: Execute 補完 Script (If Columns Missing)
**Priority**: Critical  
**Estimated Time**: 10 minutes  
**Assignee**: User  
**Status**: ⏭️ Skipped  
**Condition**: Only if Task 1.1 shows missing columns

**Description**: Run the completion script to add missing columns.

**Result**: Skipped - All columns already exist in database.

**Steps**:
1. Open Supabase Dashboard SQL Editor
2. Copy contents of `backend/migrations/081_補完_add_missing_columns.sql`
3. Paste into SQL Editor
4. Click "Run"
5. Review NOTICE messages

**Acceptance Criteria**:
- [ ] Script executes without errors
- [ ] NOTICE messages confirm columns added or already exist
- [ ] No ERROR messages appear

**Deliverables**:
- Confirmation that script completed successfully

---

#### Task 2.2: Reload PostgREST Schema Cache
**Priority**: Critical  
**Estimated Time**: 5-15 minutes  
**Assignee**: User  
**Status**: 🔄 In Progress

**Description**: Reload the PostgREST cache to make schema changes visible to REST API.

**Method 1: Project Pause/Resume (Recommended)**:
1. Navigate to Supabase Dashboard → Project Settings
2. Click "Pause project"
3. Wait for confirmation (1-2 minutes)
4. Click "Resume project"
5. Wait for services to restart (3-5 minutes)

**Method 2: NOTIFY Command**:
```sql
NOTIFY pgrst, 'reload schema';
```

**Method 3: Wait for Natural Cache Expiry**:
- Wait 5-10 minutes for cache to expire naturally

**Acceptance Criteria**:
- [ ] Cache reload method executed
- [ ] Sufficient time elapsed for reload
- [ ] No error messages during reload

**Deliverables**:
- Confirmation of which method was used

---

### Phase 3: Verification

#### Task 3.0: Run Database Connection Diagnostic (If Connection Issues)
**Priority**: Critical  
**Estimated Time**: 2 minutes  
**Assignee**: User  
**Status**: ⏳ Optional (Run if connection errors occur)

**Description**: Execute the database connection diagnostic script to identify and resolve connection issues before running verification.

**Prerequisites**:
- `DATABASE_URL` environment variable set in `backend/.env`
- Get from: Supabase Dashboard → Project Settings → Database → Connection string (URI)

**Steps**:
1. Open terminal
2. Navigate to backend directory: `cd backend`
3. Run diagnostic: `npx ts-node diagnose-database-connection.ts`
4. Review output and follow suggested fixes

**Expected Output (Success)**:
```
🔌 データベース接続診断を開始します...

✅ 環境変数の確認
   DATABASE_URL: 設定済み
   SUPABASE_URL: 設定済み
   SUPABASE_SERVICE_ROLE_KEY: 設定済み

✅ データベース接続テスト
   接続成功！

✅ 基本的なクエリテスト
   クエリ実行成功！

═══════════════════════════════════════════════════════════
✅ すべての診断に合格しました！
データベース接続は正常です。
═══════════════════════════════════════════════════════════
```

**Common Issues and Solutions**:

1. **DATABASE_URL not set**:
   - Add to `backend/.env`: `DATABASE_URL=postgresql://...`
   - Get from Supabase Dashboard → Project Settings → Database

2. **Connection timeout**:
   - Check internet connection
   - Verify Supabase project is not paused
   - Check firewall settings

3. **Authentication failed**:
   - Verify password in connection string
   - Regenerate database password if needed

**Acceptance Criteria**:
- [ ] Script executes without errors
- [ ] All checks show ✅ (green checkmarks)
- [ ] Connection test succeeds
- [ ] Query test succeeds

**Deliverables**:
- Confirmation that database connection is working

---

#### Task 3.1: Run Direct PostgreSQL Verification Script (Recommended)
**Priority**: Critical  
**Estimated Time**: 2 minutes  
**Assignee**: User  
**Status**: ⏳ Pending

**Description**: Execute the direct PostgreSQL verification script to confirm migration completion. This bypasses PostgREST cache and provides accurate results immediately.

**Prerequisites**:
- `DATABASE_URL` environment variable set in `backend/.env`
- Get from: Supabase Dashboard → Project Settings → Database → Connection string (URI)

**Steps**:
1. Open terminal
2. Navigate to backend directory: `cd backend`
3. Run verification: `npx ts-node migrations/verify-081-direct-pg.ts`
4. Review output

**Expected Output**:
```
🔌 PostgreSQLに直接接続中...

✅ 接続成功

📋 properties テーブルを確認中...
✅ properties テーブルが存在します (18 カラム)

✅ properties の全ての期待されるカラムが存在します

カラム一覧:
   id                                  uuid                 NOT NULL
   seller_id                           uuid                 NOT NULL
   property_type                       character varying    NOT NULL
   ...

📋 valuations テーブルを確認中...
✅ valuations テーブルが存在します (13 カラム)

✅ valuations の全ての期待されるカラムが存在します

═══════════════════════════════════════════════════════════
✅ 全ての検証に合格しました！
═══════════════════════════════════════════════════════════
```

**Acceptance Criteria**:
- [ ] Script executes without errors
- [ ] All checks show ✅ (green checkmarks)
- [ ] Script exits with code 0 (success)
- [ ] All expected columns listed for both tables

**Deliverables**:
- Screenshot or text output of verification results

**Quick Start Guide**: `backend/migrations/今すぐ実行_081直接検証.md`

---

#### Task 3.2: Run REST API Verification Script (Optional)
**Priority**: Low  
**Estimated Time**: 5 minutes  
**Assignee**: User  
**Status**: ⏳ Pending

**Description**: Execute the REST API verification script to confirm PostgREST cache is updated. This is optional after Task 3.1 passes.

**Prerequisites**:
- Task 2.2 (Cache Reload) completed
- Task 3.1 (Direct PostgreSQL Verification) passed

**Steps**:
1. Open terminal
2. Navigate to backend directory: `cd backend`
3. Run verification: `npx ts-node migrations/verify-081-migration.ts`
4. Review output

**Expected Output**:
```
🔍 Migration 081の検証: PropertiesとValuationsテーブル
================================================

📋 propertiesテーブルを確認中...
✅ テーブル properties が存在します
✅ properties の全ての期待されるカラムが存在します

📋 valuationsテーブルを確認中...
✅ テーブル valuations が存在します
✅ valuations の全ての期待されるカラムが存在します

================================================
✅ 全ての検証に合格しました！

🎯 Migration 081は完了し、検証されました。
```

**Acceptance Criteria**:
- [ ] Script executes without errors
- [ ] All checks show ✅ (green checkmarks)
- [ ] Script exits with code 0 (success)

**Note**: If this fails but Task 3.1 passed, wait longer for PostgREST cache to update or try reloading cache again.

**Deliverables**:
- Screenshot or text output of verification results

---

### Phase 4: Documentation Update

#### Task 4.1: Update Migration Status
**Priority**: Medium  
**Estimated Time**: 5 minutes  
**Assignee**: Developer  
**Status**: ⏳ Pending

**Description**: Update documentation to reflect migration completion.

**Files to Update**:
- `backend/migrations/081_STATUS_VISUAL_GUIDE.md`
- `.kiro/specs/seller-list-management/PHASE_2_STEP_1_READY.md`

**Changes**:
- Mark Migration 081 as ✅ Complete
- Update status from "Pending" to "Complete"
- Add completion date

**Acceptance Criteria**:
- [ ] Status files updated
- [ ] Completion date recorded
- [ ] Next steps clearly indicated

**Deliverables**:
- Updated documentation files

---

### Phase 5: Next Steps Preparation

#### Task 5.1: Review Phase 2 Implementation Plan
**Priority**: Medium  
**Estimated Time**: 15 minutes  
**Assignee**: Developer  
**Status**: ⏳ Pending

**Description**: Review the implementation plan for Phase 2 services.

**Files to Review**:
- `.kiro/specs/seller-list-management/PHASE_2_REQUIREMENTS.md`
- `.kiro/specs/seller-list-management/PHASE_2_DESIGN.md`
- `.kiro/specs/seller-list-management/PHASE_2_TASKS.md`

**Acceptance Criteria**:
- [ ] Requirements understood
- [ ] Design reviewed
- [ ] Task dependencies identified

**Deliverables**:
- Notes on implementation approach

---

#### Task 5.2: Update TypeScript Types
**Priority**: High  
**Estimated Time**: 30 minutes  
**Assignee**: Developer  
**Status**: ⏳ Pending

**Description**: Add TypeScript interfaces for Property and Valuation entities.

**Files to Update**:
- `backend/src/types/index.ts`
- `frontend/src/types/index.ts`

**Interfaces to Add**:
```typescript
// Property interface
export interface Property {
  id: string;
  seller_id: string;
  property_type: '戸建て' | '土地' | 'マンション';
  land_area?: number;
  building_area?: number;
  land_area_verified?: number;
  building_area_verified?: number;
  construction_year?: number;
  structure?: '木造' | '軽量鉄骨' | '鉄骨' | '他';
  property_address: string;
  property_address_ieul_apartment?: string;
  current_status?: '居住中' | '空き家' | '賃貸中' | '古屋あり' | '更地';
  fixed_asset_tax_road_price?: number;
  floor_plan?: string;
  created_at: string;
  updated_at: string;
  created_by?: string;
  updated_by?: string;
  version: number;
}

// Valuation interface
export interface Valuation {
  id: string;
  property_id: string;
  valuation_type: 'automatic' | 'manual' | 'post_visit';
  valuation_amount_1: number;
  valuation_amount_2: number;
  valuation_amount_3: number;
  calculation_method?: string;
  calculation_parameters?: Record<string, any>;
  valuation_report_url?: string;
  valuation_date: string;
  created_by?: string;
  notes?: string;
  created_at: string;
}
```

**Acceptance Criteria**:
- [ ] Interfaces match database schema
- [ ] All required fields marked as required
- [ ] Optional fields marked with `?`
- [ ] Enums match CHECK constraints

**Deliverables**:
- Updated type definition files

---

## Task Dependencies

### Recommended Flow (Direct PostgreSQL Verification)
```
Task 3.0 (Connection Diagnostic) [Optional - only if connection issues]
    ↓
Task 1.1 (Diagnostic) [Optional - can skip to 3.1]
    ↓
Task 3.1 (Direct PostgreSQL Verification) ← START HERE
    ↓
    ├─ If columns missing → Task 2.1 (補完 Script)
    │                        ↓
    │                        Re-run Task 3.1
    │                        ↓
    └─ If columns exist → Task 2.2 (Cache Reload)
                          ↓
                          Task 3.2 (REST API Verification) [Optional]
                          ↓
                          Task 4.1 (Documentation Update)
                          ↓
                          Task 5.1 (Review Plan) ← Task 5.2 (Update Types)
```

### Original Flow (REST API Verification)
```
Task 1.1 (Diagnostic)
    ↓
Task 2.1 (補完 Script) [If columns missing]
    ↓
Task 2.2 (Cache Reload)
    ↓
Task 3.2 (REST API Verification)
    ↓
Task 4.1 (Documentation Update)
    ↓
Task 5.1 (Review Plan) ← Task 5.2 (Update Types)
```

## Rollback Plan

If migration needs to be rolled back:

### Rollback Task 1: Drop Tables
**Priority**: Critical  
**Estimated Time**: 5 minutes  

**SQL**:
```sql
-- Drop in correct order (valuations first due to FK)
DROP TABLE IF EXISTS valuations CASCADE;
DROP TABLE IF EXISTS properties CASCADE;
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
```

**Warning**: This will delete all data. Only use in development.

---

## Success Criteria

### Overall Success
- [x] All diagnostic queries executed
- [ ] All required columns exist in database
- [ ] PostgREST cache reflects current schema
- [ ] Verification script reports 100% pass rate
- [ ] Documentation updated
- [ ] TypeScript types defined

### Ready for Phase 2 Implementation
- [ ] Migration 081 verified complete
- [ ] Types defined in codebase
- [ ] Implementation plan reviewed
- [ ] Team ready to proceed

---

## Timeline

| Phase | Tasks | Estimated Time | Status |
|-------|-------|----------------|--------|
| Phase 3: Connection Check | 3.0 (Diagnostic) | 2 min (If needed) | ⏳ Optional |
| Phase 1: Diagnostic | 1.1 | 5 min (Optional) | ⏳ Pending |
| Phase 3: Verification | 3.1 (Direct PG) | 2 min | ⏳ Pending |
| Phase 2: Resolution | 2.1, 2.2 | 15-25 min (If needed) | ⏳ Pending |
| Phase 3: Verification | 3.2 (REST API) | 5 min (Optional) | ⏳ Pending |
| Phase 4: Documentation | 4.1 | 5 min | ⏳ Pending |
| Phase 5: Preparation | 5.1, 5.2 | 45 min | ⏳ Pending |
| **Total (Recommended)** | | **52-79 min** | |
| **Total (If columns exist)** | | **57-59 min** | |

---

## Notes

### Important Reminders
- Always run diagnostic queries first to determine correct resolution path
- 補完 script is idempotent - safe to run multiple times
- PostgREST cache reload may take 5-10 minutes to take effect
- Verification script must pass before proceeding to Phase 2

### Common Issues
1. **Verification fails after 補完 script**: Wait longer for cache reload
2. **補完 script errors**: Check if columns already exist manually
3. **Connection errors**: Verify .env file configuration

### Support Resources
- Supabase Documentation: https://supabase.com/docs
- PostgREST Cache: https://postgrest.org/en/stable/admin.html#schema-cache
- Project Slack: #seller-management-phase2

---

**Created**: 2025-01-08  
**Last Updated**: 2025-01-08  
**Phase**: 2 - Properties & Valuations  
**Step**: 1 - Database Schema Completion
