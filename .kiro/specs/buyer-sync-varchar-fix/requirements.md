# Buyers Table VARCHAR Fix - Requirements

## Overview

Fix the buyers table schema to prevent sync failures caused by VARCHAR(50) length restrictions. Currently, 356 buyers (8.6% of 4,137 total) are failing to sync due to "value too long for type character varying(50)" errors.

## Problem Statement

### Current State
- ✅ Buyers table exists in Supabase
- ❌ 130+ columns defined as VARCHAR(50) instead of TEXT
- ❌ 356 buyers missing from database (3,781 synced, 4,137 expected)
- ❌ 352 buyers failed with VARCHAR(50) length errors

### Root Cause
The buyers table was created with VARCHAR(50) constraints on text fields that can contain:
- Long email addresses (60+ characters)
- Japanese property addresses (70+ characters)
- URLs (100+ characters)
- Long text descriptions and notes

### Impact
- **Data Loss**: 8.6% of buyers not synced to database
- **Sync Failures**: Recurring errors on every sync attempt
- **User Experience**: Missing buyer data in application
- **Data Integrity**: Incomplete buyer records

## User Stories

### US-1: Database Administrator
**As a** database administrator  
**I want** to convert all VARCHAR(50) columns to TEXT  
**So that** buyer data of any length can be stored without errors

**Acceptance Criteria:**
- All 130+ VARCHAR(50) columns converted to TEXT
- Migration executes without errors
- No data loss during conversion
- Schema change is reversible

### US-2: System Operator
**As a** system operator  
**I want** to re-sync all buyers after schema fix  
**So that** the 356 missing buyers are added to the database

**Acceptance Criteria:**
- Sync script runs successfully
- All 4,137 buyers present in database
- Zero sync failures reported
- Sync completes in under 5 minutes

### US-3: Developer
**As a** developer  
**I want** clear documentation and verification scripts  
**So that** I can confidently execute the fix and verify success

**Acceptance Criteria:**
- Step-by-step execution guide in Japanese
- Pre-migration verification script
- Post-migration verification script
- Troubleshooting guide for common errors

## Functional Requirements

### FR-1: Schema Migration
**Priority:** Critical  
**Status:** Ready to Execute

**Requirements:**
1. Create migration 050 to convert VARCHAR(50) → TEXT
2. Include all 130+ affected columns
3. Preserve existing data during conversion
4. Execute via Supabase SQL Editor or CLI

**Affected Columns (Categories):**
- Basic Info: name, nickname, phone_number, email, line_id
- Property: property_address, property_number, building_name_price
- URLs: athome_url, google_map_url, pdf_url, image_url
- Assignees: initial_assignee, follow_up_assignee, property_assignee
- Status: distribution_type, inquiry_source, offer_status
- Desired Conditions: desired_area, desired_property_type, desired_timing
- 100+ additional fields (see migration file)

### FR-2: Buyer Re-sync
**Priority:** Critical  
**Status:** Ready to Execute

**Requirements:**
1. Execute sync-buyers.ts after migration
2. Sync all 4,137 buyers from spreadsheet
3. Create 356 new buyer records
4. Update 3,781 existing buyer records
5. Report zero failures

### FR-3: Verification
**Priority:** High  
**Status:** Implemented

**Requirements:**
1. Pre-migration check: verify-migration-050-ready.ts
2. Post-migration check: check-buyers-varchar-columns.ts
3. Post-sync check: check-buyer-count-comparison.ts
4. All checks must pass for success confirmation

## Non-Functional Requirements

### NFR-1: Performance
- Migration execution: < 30 seconds
- Buyer re-sync: < 3 minutes
- Verification: < 10 seconds
- Total fix time: < 4 minutes

### NFR-2: Reliability
- Zero data loss during migration
- Atomic migration (all or nothing)
- Rollback capability if needed
- Idempotent sync operations

### NFR-3: Documentation
- Japanese language documentation
- Copy-paste ready commands
- Expected output examples
- Troubleshooting guide

### NFR-4: Maintainability
- Clear migration file naming (050_*)
- Comprehensive column comments
- Verification scripts for future use
- Documentation index for reference

## Technical Constraints

### TC-1: Database
- PostgreSQL/Supabase environment
- Must use TEXT type (unlimited length)
- Cannot use VARCHAR without explicit length
- Must preserve existing data

### TC-2: Migration Approach
- Two execution options:
  - Option A: Supabase SQL Editor (recommended)
  - Option B: CLI via run-050-direct.ts
- Must handle large table (3,781+ rows)
- Must be reversible

### TC-3: Sync Process
- Uses GoogleSheetsClient for data source
- Spreadsheet ID: 1tI_iXaiLuWBggs5y0RH7qzkbHs9wnLLdRekAmjkhcLY
- Sheet name: '買主リスト'
- Requires service account authentication

## Success Criteria

### Critical Success Factors
1. ✅ Migration 050 executes without errors
2. ✅ All VARCHAR(50) columns converted to TEXT
3. ✅ sync-buyers.ts shows "失敗: 0件"
4. ✅ Database contains all 4,137 buyers
5. ✅ check-buyer-count-comparison.ts shows "Difference: 0"
6. ✅ No VARCHAR(50) errors in logs

### Verification Checklist
- [ ] Run verify-migration-050-ready.ts (pre-check)
- [ ] Execute migration 050 in Supabase
- [ ] Run check-buyers-varchar-columns.ts (schema check)
- [ ] Execute sync-buyers.ts (re-sync)
- [ ] Run check-buyer-count-comparison.ts (count check)
- [ ] Verify zero errors in sync output
- [ ] Confirm all buyers accessible in application

## Out of Scope

### Not Included
- ❌ Changes to buyer sync logic
- ❌ Modifications to GoogleSheetsClient
- ❌ Updates to buyer column mapping
- ❌ Changes to buyer service layer
- ❌ UI updates for buyer display
- ❌ Performance optimization of sync process

### Future Enhancements
- Automated schema validation on startup
- Proactive length checking before sync
- Real-time sync monitoring dashboard
- Automated rollback on sync failures

## Dependencies

### Required Files
- `backend/migrations/050_fix_remaining_buyer_varchar_fields.sql` ✅
- `backend/migrations/run-050-direct.ts` ✅
- `backend/sync-buyers.ts` ✅
- `backend/verify-migration-050-ready.ts` ✅
- `backend/check-buyers-varchar-columns.ts` ✅
- `backend/check-buyer-count-comparison.ts` ✅

### Documentation Files
- `backend/BUYERS_TABLE_VARCHAR_FIX_NOW.md` ✅ (Primary guide)
- `backend/BUYERS_SYNC_STATUS_SUMMARY.md` ✅ (Status overview)
- `backend/BUYERS_TABLE_FIX_COMPLETE_GUIDE.md` ✅ (Detailed guide)
- `backend/BUYERS_FIX_QUICK_CARD.md` ✅ (Quick reference)
- `backend/BUYERS_TABLE_README.md` ✅ (Main entry)
- `backend/BUYERS_TABLE_DOCUMENTATION_INDEX.md` ✅ (Index)

### Environment Requirements
- Supabase project with buyers table
- SUPABASE_URL configured
- SUPABASE_SERVICE_KEY configured
- Google Service Account credentials
- Node.js and TypeScript runtime

## Risk Assessment

### High Risk
- **Data Loss**: Mitigated by atomic migration and backups
- **Downtime**: Mitigated by quick execution time (< 4 min)
- **Sync Failures**: Mitigated by verification scripts

### Medium Risk
- **Permission Errors**: Documented troubleshooting steps
- **Network Issues**: Retry logic in sync script
- **Schema Conflicts**: Pre-migration verification

### Low Risk
- **Documentation Gaps**: Comprehensive docs already created
- **User Confusion**: Clear step-by-step guide in Japanese

## Timeline

### Execution Phase (4 minutes)
1. **Minute 0-1**: Pre-migration verification
2. **Minute 1-1.5**: Execute migration 050
3. **Minute 1.5-4**: Re-sync all buyers
4. **Minute 4**: Post-sync verification

### Total Duration
- **Preparation**: 0 minutes (already complete)
- **Execution**: 4 minutes
- **Verification**: Included in execution
- **Documentation**: 0 minutes (already complete)

## Stakeholders

### Primary
- **Database Administrator**: Executes migration
- **System Operator**: Monitors sync process
- **Development Team**: Maintains documentation

### Secondary
- **End Users**: Benefit from complete buyer data
- **Support Team**: Fewer data-related issues

## References

### Migration Files
- Migration 042: `042_add_buyers.sql` (empty, not used)
- Migration 042 Complete: `042_add_buyers_complete.sql` (new installations)
- Migration 049: `049_fix_buyer_text_field_lengths.sql` (partial fix)
- Migration 050: `050_fix_remaining_buyer_varchar_fields.sql` (complete fix)

### Related Specs
- Buyer List Management: `.kiro/specs/buyer-list-management/`
- Buyer Sync Reliability: `.kiro/specs/buyer-sync-reliability-fix/`

### External Resources
- Supabase Documentation: https://supabase.com/docs
- PostgreSQL ALTER TABLE: https://www.postgresql.org/docs/current/sql-altertable.html

---

**Status**: Ready to Execute ✅  
**Priority**: Critical 🚨  
**Estimated Time**: 4 minutes ⚡  
**Next Action**: Execute Migration 050 in Supabase SQL Editor
