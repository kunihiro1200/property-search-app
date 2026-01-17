# Tasks: Spreadsheet Deletion Sync Implementation

## Overview

スプレッドシート削除同期機能の実装タスクリスト。4つのフェーズに分けて段階的に実装します。

## Phase 1: Database Schema Changes

### Task 1.1: Create Migration for Soft Delete Support
**Status**: Pending  
**Priority**: High  
**Estimated Time**: 1 hour

**Description**: `sellers`テーブルに`deleted_at`カラムを追加し、ソフトデリートをサポートする。

**Acceptance Criteria**:
- [ ] Migration file created: `05X_add_soft_delete_support.sql`
- [ ] `deleted_at` column added to `sellers` table (TIMESTAMP WITH TIME ZONE, nullable)
- [ ] Index created: `idx_sellers_deleted_at`
- [ ] Partial index created: `idx_sellers_active` (WHERE deleted_at IS NULL)
- [ ] Migration tested with rollback

**Files to Create/Modify**:
- `backend/migrations/05X_add_soft_delete_support.sql`
- `backend/migrations/run-05X-migration.ts`

---

### Task 1.2: Add Soft Delete to Properties Table
**Status**: Pending  
**Priority**: High  
**Estimated Time**: 30 minutes

**Description**: `properties`テーブルにも`deleted_at`カラムを追加（cascade delete用）。

**Acceptance Criteria**:
- [ ] `deleted_at` column added to `properties` table
- [ ] Index created: `idx_properties_deleted_at`
- [ ] Partial index created: `idx_properties_active`

**Files to Modify**:
- Same migration file as Task 1.1

---

### Task 1.3: Create Deletion Audit Table
**Status**: Pending  
**Priority**: Medium  
**Estimated Time**: 1 hour

**Description**: 削除履歴を記録する監査テーブルを作成。

**Acceptance Criteria**:
- [ ] `seller_deletion_audit` table created with columns:
  - id, seller_id, seller_number, deleted_at, deleted_by, reason
  - seller_data (JSONB), can_recover, recovered_at
- [ ] Indexes created for seller_number and deleted_at
- [ ] Sample data inserted for testing

**Files to Create/Modify**:
- Same migration file as Task 1.1

---

### Task 1.4: Update Sync Logs Schema
**Status**: Pending  
**Priority**: Low  
**Estimated Time**: 30 minutes

**Description**: `sync_logs`テーブルに削除関連のカラムを追加。

**Acceptance Criteria**:
- [ ] `deleted_sellers_count` column added (INTEGER)
- [ ] `deleted_seller_numbers` column added (TEXT[])
- [ ] Existing sync logs remain intact

**Files to Modify**:
- Same migration file as Task 1.1

---

## Phase 2: Core Deletion Logic Implementation

### Task 2.1: Implement detectDeletedSellers()
**Status**: Pending  
**Priority**: High  
**Estimated Time**: 2 hours

**Description**: DBにあってスプレッドシートにない売主を検出する機能を実装。

**Acceptance Criteria**:
- [ ] Method `detectDeletedSellers()` added to `EnhancedAutoSyncService`
- [ ] Fetches all active sellers from DB (paginated)
- [ ] Fetches all sellers from spreadsheet
- [ ] Returns array of seller numbers to delete
- [ ] Handles pagination correctly (>1000 records)
- [ ] Logs detection results

**Files to Modify**:
- `backend/src/services/EnhancedAutoSyncService.ts`

**Dependencies**: Task 1.1 (database schema)

---

### Task 2.2: Implement getAllActiveDbSellerNumbers()
**Status**: Pending  
**Priority**: High  
**Estimated Time**: 1 hour

**Description**: アクティブな売主番号を全件取得する補助メソッド。

**Acceptance Criteria**:
- [ ] Method `getAllActiveDbSellerNumbers()` implemented
- [ ] Filters out soft-deleted sellers (deleted_at IS NULL)
- [ ] Uses pagination (1000 records per page)
- [ ] Returns Set<string> for efficient lookup
- [ ] Handles errors gracefully

**Files to Modify**:
- `backend/src/services/EnhancedAutoSyncService.ts`

**Dependencies**: Task 1.1

---

### Task 2.3: Implement Deletion Validation
**Status**: Pending  
**Priority**: High  
**Estimated Time**: 3 hours

**Description**: 削除前のバリデーションロジックを実装。

**Acceptance Criteria**:
- [ ] Method `validateDeletion()` implemented
- [ ] Checks for active contracts (専任契約中, 一般契約中)
- [ ] Checks for recent activity (within 7 days)
- [ ] Checks for active property listings
- [ ] Returns ValidationResult with reason and manual review flag
- [ ] Configurable validation rules via environment variables

**Files to Modify**:
- `backend/src/services/EnhancedAutoSyncService.ts`

**Files to Create**:
- `backend/src/types/deletion.ts` (ValidationResult interface)

**Dependencies**: Task 1.1

---

### Task 2.4: Implement executeSoftDelete()
**Status**: Pending  
**Priority**: High  
**Estimated Time**: 2 hours

**Description**: ソフトデリートを実行する機能を実装。

**Acceptance Criteria**:
- [ ] Method `executeSoftDelete()` implemented
- [ ] Creates backup in `seller_deletion_audit` table
- [ ] Updates `sellers.deleted_at` to current timestamp
- [ ] Cascades soft delete to `properties` table
- [ ] Uses transaction for atomicity
- [ ] Handles rollback on error
- [ ] Logs deletion operation

**Files to Modify**:
- `backend/src/services/EnhancedAutoSyncService.ts`

**Dependencies**: Task 1.1, Task 1.3

---

### Task 2.5: Implement syncDeletedSellers()
**Status**: Pending  
**Priority**: High  
**Estimated Time**: 2 hours

**Description**: 削除された売主を一括で同期する機能を実装。

**Acceptance Criteria**:
- [ ] Method `syncDeletedSellers()` implemented
- [ ] Validates each seller before deletion
- [ ] Executes soft delete for valid sellers
- [ ] Collects sellers requiring manual review
- [ ] Returns DeletionSyncResult with statistics
- [ ] Logs progress and errors

**Files to Modify**:
- `backend/src/services/EnhancedAutoSyncService.ts`

**Files to Create**:
- `backend/src/types/deletion.ts` (DeletionSyncResult interface)

**Dependencies**: Task 2.3, Task 2.4

---

## Phase 3: Integration with Existing Sync Flow

### Task 3.1: Update runFullSync() to Include Deletion
**Status**: ✅ Complete  
**Priority**: High  
**Estimated Time**: 2 hours

**Description**: 既存の`runFullSync()`メソッドに削除同期を統合。

**Acceptance Criteria**:
- [x] `runFullSync()` calls `detectDeletedSellers()`
- [x] `runFullSync()` calls `syncDeletedSellers()`
- [x] Deletion sync runs after addition sync
- [x] Returns CompleteSyncResult with both add and delete results
- [x] Respects DELETION_SYNC_ENABLED environment variable
- [x] Handles errors in deletion sync without affecting addition sync

**Files to Modify**:
- `backend/src/services/EnhancedAutoSyncService.ts`

**Files to Create**:
- `backend/src/types/deletion.ts` (CompleteSyncResult interface)

**Dependencies**: Task 2.1, Task 2.5

---

### Task 3.2: Add Configuration Support
**Status**: ✅ Complete  
**Priority**: Medium  
**Estimated Time**: 1 hour

**Description**: 環境変数で削除同期を制御できるようにする。

**Acceptance Criteria**:
- [x] Method `isDeletionSyncEnabled()` implemented
- [x] Reads DELETION_SYNC_ENABLED from environment (default: true)
- [x] Reads DELETION_VALIDATION_STRICT (default: true)
- [x] Reads DELETION_RECENT_ACTIVITY_DAYS (default: 7)
- [x] Configuration documented in .env.example

**Files to Modify**:
- `backend/src/services/EnhancedAutoSyncService.ts`
- `backend/.env.example`

**Dependencies**: None

---

### Task 3.3: Update SyncLogService for Deletion Tracking
**Status**: ✅ Complete  
**Priority**: Medium  
**Estimated Time**: 1.5 hours

**Description**: 削除同期のログ記録機能を追加。

**Acceptance Criteria**:
- [x] Method `logDeletionSync()` added to SyncLogService
- [x] Logs deletion count, seller numbers, errors
- [x] Logs manual review requirements
- [x] Sends alerts for manual review cases
- [x] Integrates with existing sync log structure

**Files to Modify**:
- `backend/src/services/SyncLogService.ts`

**Dependencies**: Task 1.4, Task 2.5

---

### Task 3.4: Update Periodic Sync Manager
**Status**: ✅ Complete  
**Priority**: Medium  
**Estimated Time**: 1 hour

**Description**: 定期同期マネージャーで削除同期を実行。

**Acceptance Criteria**:
- [x] `EnhancedPeriodicSyncManager.runSync()` calls updated `runFullSync()`
- [x] Logs deletion sync results
- [x] Updates health checker with deletion metrics
- [x] Handles deletion sync errors gracefully

**Files to Modify**:
- `backend/src/services/EnhancedAutoSyncService.ts`

**Dependencies**: Task 3.1, Task 3.3

---

## Phase 4: Query Updates and Recovery

### Task 4.1: Update SellerService Queries
**Status**: ✅ Complete  
**Priority**: High  
**Estimated Time**: 2 hours

**Description**: 既存のクエリに削除フィルタを追加。

**Acceptance Criteria**:
- [x] All `SellerService` queries filter out deleted sellers by default
- [x] Add `includeDeleted` parameter to relevant methods
- [x] Update `getAllSellers()`, `getSellerById()`, `searchSellers()`
- [x] Maintain backward compatibility
- [x] Add tests for deleted seller filtering

**Files to Modify**:
- `backend/src/services/SellerService.ts`
- `backend/src/services/SellerService.supabase.ts`

**Dependencies**: Task 1.1

---

### Task 4.2: Update PropertyService Queries
**Status**: ✅ Complete  
**Priority**: Medium  
**Estimated Time**: 1 hour

**Description**: 物件クエリにも削除フィルタを追加。

**Acceptance Criteria**:
- [x] All `PropertyService` queries filter out deleted properties
- [x] Add `includeDeleted` parameter where needed
- [x] Update related seller queries to exclude deleted

**Files to Modify**:
- `backend/src/services/PropertyService.ts`

**Dependencies**: Task 1.2

---

### Task 4.3: Implement Recovery API
**Status**: ✅ Complete  
**Priority**: Medium  
**Estimated Time**: 2 hours

**Description**: 削除された売主を復元するAPI機能を実装。

**Acceptance Criteria**:
- [x] Method `recoverDeletedSeller()` implemented
- [x] Checks deletion audit log
- [x] Restores seller by setting deleted_at to NULL
- [x] Restores related properties
- [x] Updates audit log with recovery timestamp
- [x] Returns RecoveryResult with success/failure

**Files to Modify**:
- `backend/src/services/EnhancedAutoSyncService.ts`

**Files to Create**:
- `backend/src/types/deletion.ts` (RecoveryResult interface) - Already exists

**Dependencies**: Task 1.3

---

### Task 4.4: Add Recovery API Endpoint
**Status**: ✅ Complete  
**Priority**: Low  
**Estimated Time**: 1 hour

**Description**: 復元機能のREST APIエンドポイントを追加。

**Acceptance Criteria**:
- [x] POST `/api/sellers/:sellerNumber/recover` endpoint created
- [x] Requires admin authentication
- [x] Calls `recoverDeletedSeller()` method
- [x] Returns recovery result
- [x] Logs recovery operation
- [x] GET `/api/sellers/:sellerNumber/recovery-status` endpoint created for checking recovery eligibility

**Files to Create**:
- `backend/src/routes/sellerRecovery.ts`

**Files to Modify**:
- `backend/src/index.ts` (register route)

**Dependencies**: Task 4.3

---

## Phase 5: Testing and Documentation

### Task 5.1: Write Unit Tests
**Status**: Pending  
**Priority**: High  
**Estimated Time**: 4 hours

**Description**: コア機能のユニットテストを作成。

**Acceptance Criteria**:
- [ ] Test `detectDeletedSellers()` with various scenarios
- [ ] Test `validateDeletion()` with different seller states
- [ ] Test `executeSoftDelete()` with transaction rollback
- [ ] Test `recoverDeletedSeller()` success and failure cases
- [ ] Test configuration loading
- [ ] All tests pass with >80% coverage

**Files to Create**:
- `backend/src/services/__tests__/EnhancedAutoSyncService.deletion.test.ts`

**Dependencies**: Phase 2 complete

---

### Task 5.2: Write Integration Tests
**Status**: Pending  
**Priority**: High  
**Estimated Time**: 3 hours

**Description**: エンドツーエンドの統合テストを作成。

**Acceptance Criteria**:
- [ ] Test full sync flow (add + delete)
- [ ] Test pagination with large datasets
- [ ] Test error handling and rollback
- [ ] Test periodic sync manager integration
- [ ] All integration tests pass

**Files to Create**:
- `backend/src/services/__tests__/DeletionSync.integration.test.ts`

**Dependencies**: Phase 3 complete

---

### Task 5.3: Create Manual Testing Script
**Status**: Pending  
**Priority**: Medium  
**Estimated Time**: 2 hours

**Description**: 手動テスト用のスクリプトを作成。

**Acceptance Criteria**:
- [ ] Script to simulate spreadsheet deletion
- [ ] Script to verify soft delete in DB
- [ ] Script to test recovery
- [ ] Script to check audit logs
- [ ] Documentation for manual testing steps

**Files to Create**:
- `backend/test-deletion-sync-manual.ts`
- `backend/verify-deletion-sync.ts`

**Dependencies**: Phase 2 complete

---

### Task 5.4: Update Documentation
**Status**: Pending  
**Priority**: Medium  
**Estimated Time**: 2 hours

**Description**: 機能のドキュメントを作成・更新。

**Acceptance Criteria**:
- [ ] README updated with deletion sync feature
- [ ] Environment variables documented
- [ ] API documentation updated
- [ ] Troubleshooting guide created
- [ ] Recovery procedure documented

**Files to Create**:
- `.kiro/specs/spreadsheet-deletion-sync/USER_GUIDE.md`
- `.kiro/specs/spreadsheet-deletion-sync/TROUBLESHOOTING.md`

**Files to Modify**:
- `README.md`
- `backend/.env.example`

**Dependencies**: Phase 4 complete

---

### Task 5.5: Create Monitoring Dashboard
**Status**: Pending  
**Priority**: Low  
**Estimated Time**: 3 hours

**Description**: 削除同期の監視ダッシュボードを作成（オプション）。

**Acceptance Criteria**:
- [ ] Dashboard shows deletion sync statistics
- [ ] Shows sellers requiring manual review
- [ ] Shows recent deletion history
- [ ] Allows recovery from UI
- [ ] Real-time sync status

**Files to Create**:
- `frontend/src/pages/DeletionSyncDashboard.tsx`
- `frontend/src/components/DeletionSyncStats.tsx`

**Dependencies**: Phase 4 complete

---

## Phase 6: Deployment and Monitoring

### Task 6.1: Deploy Database Migration
**Status**: Pending  
**Priority**: High  
**Estimated Time**: 1 hour

**Description**: 本番環境にマイグレーションを適用。

**Acceptance Criteria**:
- [ ] Migration tested in staging environment
- [ ] Backup created before migration
- [ ] Migration applied to production
- [ ] Indexes verified
- [ ] No downtime during migration

**Dependencies**: Task 1.1, 1.2, 1.3, 1.4

---

### Task 6.2: Enable Deletion Sync in Production
**Status**: Pending  
**Priority**: High  
**Estimated Time**: 30 minutes

**Description**: 本番環境で削除同期を有効化。

**Acceptance Criteria**:
- [ ] DELETION_SYNC_ENABLED=true set in production
- [ ] Periodic sync manager restarted
- [ ] First sync completed successfully
- [ ] Logs verified
- [ ] No errors in production

**Dependencies**: All Phase 2-4 tasks complete

---

### Task 6.3: Set Up Monitoring and Alerts
**Status**: Pending  
**Priority**: High  
**Estimated Time**: 2 hours

**Description**: 削除同期の監視とアラートを設定。

**Acceptance Criteria**:
- [ ] Alert for manual review required
- [ ] Alert for deletion sync failures
- [ ] Dashboard for deletion metrics
- [ ] Log aggregation configured
- [ ] On-call rotation notified

**Dependencies**: Task 6.2

---

### Task 6.4: Create Runbook
**Status**: Pending  
**Priority**: Medium  
**Estimated Time**: 2 hours

**Description**: 運用手順書を作成。

**Acceptance Criteria**:
- [ ] Runbook for handling manual review cases
- [ ] Runbook for recovery procedures
- [ ] Runbook for troubleshooting sync failures
- [ ] Runbook for emergency disable
- [ ] Team trained on procedures

**Files to Create**:
- `.kiro/specs/spreadsheet-deletion-sync/RUNBOOK.md`

**Dependencies**: Task 6.3

---

## Summary

**Total Tasks**: 29  
**Estimated Total Time**: 45.5 hours (~6 days)

**Critical Path**:
1. Phase 1: Database Schema (3 hours)
2. Phase 2: Core Logic (10 hours)
3. Phase 3: Integration (6.5 hours)
4. Phase 4: Query Updates (6 hours)
5. Phase 5: Testing (11 hours)
6. Phase 6: Deployment (5.5 hours)

**Recommended Order**:
1. Complete Phase 1 (database schema) first
2. Implement Phase 2 (core logic) with unit tests
3. Integrate Phase 3 (sync flow)
4. Update Phase 4 (queries and recovery)
5. Complete Phase 5 (testing and docs)
6. Deploy Phase 6 (production rollout)

**Risk Mitigation**:
- Start with soft delete (reversible)
- Test thoroughly in staging
- Enable gradually in production
- Monitor closely for first week
- Have rollback plan ready
