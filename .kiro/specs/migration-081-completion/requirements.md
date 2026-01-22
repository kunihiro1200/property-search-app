# Migration 081 Completion - Requirements

## Overview

This spec documents the completion and verification process for Migration 081, which creates the `properties` and `valuations` tables as part of Phase 2 (Properties & Valuations) of the seller list management system.

## Background

Migration 081 was executed but the verification script reported missing columns. This spec provides a systematic approach to diagnose and resolve the issue.

## User Stories

### US-1: Diagnostic Execution
**As a** developer  
**I want to** diagnose whether Migration 081 columns exist in the database  
**So that** I can determine the correct resolution path

**Acceptance Criteria:**
- User can execute diagnostic SQL queries in Supabase SQL Editor
- Diagnostic results clearly show which columns exist/don't exist
- User receives clear next steps based on diagnostic results

### US-2: Missing Columns Resolution
**As a** developer  
**I want to** add missing columns if they don't exist  
**So that** the migration is completed successfully

**Acceptance Criteria:**
- 補完 (completion) script is idempotent and safe to run multiple times
- Script adds all required columns for both tables
- Script creates necessary indexes and triggers
- Script provides clear success/failure messages

### US-3: PostgREST Cache Resolution
**As a** developer  
**I want to** reload the PostgREST schema cache if columns exist but aren't visible  
**So that** the REST API reflects the current database schema

**Acceptance Criteria:**
- User has clear instructions for reloading PostgREST cache
- Multiple reload methods are documented (pause/resume, NOTIFY, restart)
- User can verify cache reload was successful

### US-4: Verification
**As a** developer  
**I want to** verify that Migration 081 is complete  
**So that** I can proceed with Phase 2 implementation

**Acceptance Criteria:**
- Verification script checks table existence
- Verification script checks all required columns
- Verification script provides clear pass/fail results
- User knows next steps after successful verification

### US-5: Direct PostgreSQL Verification (PostgREST Cache Bypass)
**As a** developer  
**I want to** verify migration status by connecting directly to PostgreSQL  
**So that** I can bypass PostgREST cache issues and get accurate results

**Acceptance Criteria:**
- Verification script connects directly to PostgreSQL using `pg` library
- Script queries `information_schema.columns` to check column existence
- Script provides detailed output showing which columns exist
- Script works independently of PostgREST cache state
- User receives clear guidance on whether schema cache reload is needed

### US-6: Database Connection Diagnostic
**As a** developer  
**I want to** diagnose database connection issues before running verification  
**So that** I can identify and resolve connection problems early

**Acceptance Criteria:**
- Diagnostic script tests database connectivity
- Script validates environment variables are set correctly
- Script provides clear error messages for connection failures
- Script confirms Supabase project is accessible
- User receives actionable guidance for resolving connection issues

## Functional Requirements

### FR-1: Diagnostic SQL Queries
The system shall provide SQL queries to check:
- Properties table column list
- Valuations table column list
- Column data types
- Constraints and indexes

### FR-2: 補完 Script
The system shall provide a completion script that:
- Checks for missing columns before adding them
- Uses `IF NOT EXISTS` for idempotent operations
- Adds all required columns with correct data types
- Creates indexes with `IF NOT EXISTS`
- Creates triggers with `DROP IF EXISTS` first
- Provides detailed NOTICE messages for each operation

### FR-3: PostgREST Cache Reload
The system shall document methods to reload PostgREST cache:
- Pause/Resume project (most reliable)
- NOTIFY pgrst command
- Manual PostgREST restart

### FR-4: Verification Script (REST API)
The system shall provide a TypeScript verification script that:
- Connects to Supabase using REST API
- Checks table existence
- Checks column existence via SELECT queries
- Reports missing columns clearly
- Provides next steps based on results

### FR-5: Direct PostgreSQL Verification Script
The system shall provide a TypeScript verification script that:
- Connects directly to PostgreSQL using connection string
- Queries `information_schema.columns` for accurate column lists
- Compares actual columns against expected columns
- Reports discrepancies clearly
- Provides guidance on PostgREST cache reload if columns exist but aren't visible via REST API
- Uses environment variable `DATABASE_URL` for connection

### FR-6: Database Connection Diagnostic Script
The system shall provide a TypeScript diagnostic script that:
- Tests database connectivity before verification
- Validates required environment variables exist
- Checks Supabase project accessibility
- Provides detailed error messages for connection failures
- Suggests specific fixes for common connection issues
- Confirms database credentials are valid

## Non-Functional Requirements

### NFR-1: Idempotency
All scripts must be safe to run multiple times without causing errors or data loss.

### NFR-2: User Experience
All documentation and messages must be in Japanese for user accessibility.

### NFR-3: Error Handling
Scripts must provide clear error messages and recovery instructions.

### NFR-4: Safety
Scripts must not delete or modify existing data.

## Technical Specifications

### Properties Table Required Columns

| Column Name | Data Type | Constraints | Description |
|------------|-----------|-------------|-------------|
| id | UUID | PRIMARY KEY | 物件ID |
| seller_id | UUID | NOT NULL, FK to sellers | 売主ID |
| property_type | VARCHAR(20) | NOT NULL, CHECK | 物件タイプ |
| land_area | DECIMAL(10,2) | | 土地面積 |
| building_area | DECIMAL(10,2) | | 建物面積 |
| land_area_verified | DECIMAL(10,2) | | 土地面積（当社調べ） |
| building_area_verified | DECIMAL(10,2) | | 建物面積（当社調べ） |
| construction_year | INTEGER | | 築年 |
| structure | VARCHAR(20) | CHECK | 構造 |
| property_address | TEXT | NOT NULL | 物件所在地 |
| property_address_ieul_apartment | TEXT | | イエウール・マンション専用住所 |
| current_status | VARCHAR(20) | CHECK | 現況 |
| fixed_asset_tax_road_price | DECIMAL(15,2) | | 固定資産税路線価 |
| floor_plan | TEXT | | 間取り |
| created_at | TIMESTAMP WITH TIME ZONE | DEFAULT CURRENT_TIMESTAMP | 作成日時 |
| updated_at | TIMESTAMP WITH TIME ZONE | DEFAULT CURRENT_TIMESTAMP | 更新日時 |
| created_by | UUID | FK to employees | 作成者 |
| updated_by | UUID | FK to employees | 更新者 |
| version | INTEGER | DEFAULT 1 | バージョン番号 |

### Valuations Table Required Columns

| Column Name | Data Type | Constraints | Description |
|------------|-----------|-------------|-------------|
| id | UUID | PRIMARY KEY | 査定ID |
| property_id | UUID | NOT NULL, FK to properties | 物件ID |
| valuation_type | VARCHAR(20) | NOT NULL, CHECK | 査定タイプ |
| valuation_amount_1 | BIGINT | NOT NULL | 査定額1（最低額） |
| valuation_amount_2 | BIGINT | NOT NULL | 査定額2（中間額） |
| valuation_amount_3 | BIGINT | NOT NULL | 査定額3（最高額） |
| calculation_method | TEXT | | 計算方法 |
| calculation_parameters | JSONB | | 計算パラメータ |
| valuation_report_url | TEXT | | つながるオンライン査定書URL |
| valuation_date | TIMESTAMP WITH TIME ZONE | DEFAULT CURRENT_TIMESTAMP | 査定日時 |
| created_by | UUID | FK to employees | 作成者 |
| notes | TEXT | | 備考 |
| created_at | TIMESTAMP WITH TIME ZONE | DEFAULT CURRENT_TIMESTAMP | 作成日時 |

### Required Indexes

**Properties:**
- idx_properties_seller_id
- idx_properties_property_type
- idx_properties_created_at
- idx_properties_construction_year
- idx_properties_current_status

**Valuations:**
- idx_valuations_property_id
- idx_valuations_valuation_date
- idx_valuations_valuation_type
- idx_valuations_created_by

### Required Triggers

**Properties:**
- update_properties_updated_at (BEFORE UPDATE)

## Execution Flow

### Original Flow (REST API Verification)
```
1. User runs diagnostic SQL queries in Supabase Dashboard
   ↓
2. Check results:
   ├─ Columns missing → Execute 補完 script
   │                    ↓
   │                    Reload PostgREST cache
   │                    ↓
   │                    Run verification script
   │
   └─ Columns exist → Reload PostgREST cache
                      ↓
                      Run verification script
   ↓
3. Verification passes → Proceed to Phase 2 implementation
   ↓
4. Update TypeScript types
   ↓
5. Implement services (PropertyService, ValuationEngine, etc.)
```

### New Flow (Direct PostgreSQL Verification - Recommended)
```
1. User runs direct PostgreSQL verification script
   ↓
2. Script connects directly to database (bypasses PostgREST)
   ↓
3. Check results:
   ├─ Columns missing → Execute 補完 script
   │                    ↓
   │                    Re-run direct verification
   │                    ↓
   │                    Success → Reload PostgREST cache
   │
   └─ Columns exist → Reload PostgREST cache
                      ↓
                      Run REST API verification (optional)
   ↓
4. Verification passes → Proceed to Phase 2 implementation
   ↓
5. Update TypeScript types
   ↓
6. Implement services (PropertyService, ValuationEngine, etc.)
```

**Key Advantage**: Direct PostgreSQL verification eliminates confusion caused by PostgREST cache lag.

## Success Criteria

1. ✅ Diagnostic SQL queries execute successfully
2. ✅ User can determine if columns exist or not
3. ✅ 補完 script adds missing columns without errors
4. ✅ PostgREST cache reload makes columns visible via REST API
5. ✅ Verification script reports all checks passed
6. ✅ User can proceed with Phase 2 implementation

## Dependencies

- Supabase project with PostgreSQL database
- Phase 1 completed (sellers, employees tables exist)
- Supabase service role key configured
- Node.js and TypeScript environment
- PostgreSQL connection string (`DATABASE_URL`) for direct verification
- `pg` npm package for direct PostgreSQL connections
- Valid database credentials in `.env` file
- **Database connection must be working** - Run diagnostic first if connection issues occur

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| PostgREST cache doesn't reload | High | Provide multiple reload methods; document project pause/resume |
| 補完 script fails mid-execution | Medium | Use idempotent operations; provide rollback instructions |
| Verification script false negatives | Medium | Use multiple verification methods (direct SQL + REST API) |
| User confusion about next steps | Low | Provide clear, step-by-step Japanese documentation |
| Database connection failures | High | Provide diagnostic script to identify connection issues early |
| Invalid environment variables | Medium | Validate .env configuration before running verification |

## Out of Scope

- Automatic migration execution
- Data migration from existing systems
- Phase 2 service implementation
- Frontend implementation

## References

- Original Migration: `backend/migrations/081_create_properties_and_valuations.sql`
- 補完 Script: `backend/migrations/081_補完_add_missing_columns.sql`
- Diagnostic Guide: `backend/migrations/今すぐ実行_081補完_完全診断.md`
- REST API Verification Script: `backend/migrations/verify-081-migration.ts`
- **Direct PostgreSQL Verification Script**: `backend/migrations/verify-081-direct-pg.ts` (Recommended)
- **Database Connection Diagnostic Script**: `backend/diagnose-database-connection.ts` (Run first if connection issues)
- **Database Connection Fix Spec**: `.kiro/specs/database-connection-fix/requirements.md` (If connection fails)
- **Quick Start Guide**: `backend/今すぐ実行_データベース接続診断.md`
- **Issue Summary**: `DATABASE_CONNECTION_ISSUE_SUMMARY.md`
- Next Steps Guide: `backend/migrations/今すぐ読んでください_081補完_次のステップ.md`
- Phase 2 Requirements: `.kiro/specs/seller-list-management/PHASE_2_REQUIREMENTS.md`

---

**Created**: 2025-01-08  
**Phase**: 2 - Properties & Valuations  
**Step**: 1 - Database Schema Completion
