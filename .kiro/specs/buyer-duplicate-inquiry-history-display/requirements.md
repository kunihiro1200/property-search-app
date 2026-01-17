# Requirements Document

## Introduction

買主詳細ページにおいて、重複買主の問合せ履歴が正しく表示されず、Gmail送信ボタンが機能しない問題を修正します。

## Glossary

- **System**: 買主管理システム
- **Buyer**: 買主
- **Duplicate_Buyer**: 同一人物だが異なる買主番号で登録されている買主
- **Inquiry_History**: 問合せ履歴
- **Property_Listing**: 物件リスト
- **Gmail_Button**: Gmail送信ボタン

## Requirements

### Requirement 1: 重複買主の問合せ履歴統合表示

**User Story:** As a user, I want to see all inquiry history from duplicate buyers, so that I can understand the complete interaction history with this person.

#### Acceptance Criteria

1. WHEN a buyer has duplicate records, THE System SHALL retrieve inquiry history from all duplicate buyer IDs
2. WHEN displaying inquiry history, THE System SHALL merge and sort all records by inquiry date
3. WHEN showing inquiry history, THE System SHALL indicate which buyer number each inquiry came from
4. WHEN a buyer has no duplicates, THE System SHALL display only their own inquiry history
5. THE System SHALL mark the current buyer's records distinctly from past duplicate records

### Requirement 2: Gmail送信ボタンの修正

**User Story:** As a user, I want the Gmail send button to work correctly, so that I can send property information to buyers.

#### Acceptance Criteria

1. WHEN user selects properties and clicks Gmail button, THE System SHALL fetch complete property details
2. WHEN property details are fetched successfully, THE System SHALL open the email modal
3. IF property details fetch fails, THEN THE System SHALL display an error message
4. WHEN no properties are selected, THE System SHALL display a warning message
5. THE System SHALL handle 404 errors gracefully and provide clear error messages

### Requirement 3: エラーハンドリングの改善

**User Story:** As a user, I want clear error messages when something goes wrong, so that I can understand what happened.

#### Acceptance Criteria

1. WHEN an API call fails, THE System SHALL log the error details to console
2. WHEN an API call fails, THE System SHALL display a user-friendly error message
3. THE System SHALL include the specific error reason in the error message
4. WHEN a 404 error occurs, THE System SHALL indicate that the resource was not found
5. THE System SHALL not expose technical details to end users

### Requirement 4: 問合せ履歴APIの拡張

**User Story:** As a developer, I want the inquiry history API to support duplicate buyer queries, so that the frontend can display complete history.

#### Acceptance Criteria

1. THE Inquiry_History_API SHALL accept a buyer ID parameter
2. WHEN queried, THE Inquiry_History_API SHALL identify all duplicate buyer IDs
3. THE Inquiry_History_API SHALL retrieve inquiry history from all related buyer IDs
4. THE Inquiry_History_API SHALL return a unified list with buyer number annotations
5. THE Inquiry_History_API SHALL sort results by inquiry date in descending order


## Bug Fix: Schema Cache Issue (2025-12-29)

### Issue Report

**Date**: 2025-12-29  
**Reporter**: User  
**Severity**: High (Blocking all buyer syncs)

**User Report:**
> 結局6647の問合せ履歴に6648はないままだよ　Gmail送信機能も押しても反応なしだよ

Translation:
- Buyer 6648 still not appearing in buyer 6647's inquiry history
- Gmail send button not responding when clicked

### Root Cause

**Database Schema Mismatch:**
- Database table has column: `synced_at`
- Code expects column: `last_synced_at`
- Migration 054 was prepared but never executed
- Result: ALL buyer syncs failing with PostgREST schema cache error

**Impact:**
- 0 buyers syncing successfully (4141 attempts, 4141 failures)
- Buyer 6648 missing from database (exists in spreadsheet row 4115)
- Inquiry history incomplete
- Gmail distribution not working

### Solution

**Step 1: Add Missing Column**
```sql
ALTER TABLE buyers
  ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMP WITH TIME ZONE;

CREATE INDEX IF NOT EXISTS idx_buyers_last_synced_at ON buyers(last_synced_at DESC);
```

**Step 2: Sync Missing Buyer**
```bash
cd backend
npx ts-node sync-buyer-6648.ts
```

**Step 3: Verify**
- Check column exists: `npx ts-node check-last-synced-column.ts`
- Check buyer synced: `npx ts-node check-buyers-6647-6648.ts`
- Test inquiry history display in frontend
- Test Gmail send button functionality

### Documentation Created

- `BUYER_6647_6648_FIX_GUIDE.md` - English fix guide
- `買主6647_6648_修正手順.md` - Japanese fix guide
- `今すぐ実行_買主6648修正.md` - Quick start guide (Japanese)
- `BUYER_SYNC_SCHEMA_ISSUE_DIAGRAM.md` - Visual diagram
- `.kiro/specs/buyer-duplicate-inquiry-history-display/BUG_FIX_SCHEMA_CACHE.md` - Technical details

### Prevention Measures

1. **Migration Tracking**: Implement proper migration tracking table
2. **Schema Validation**: Add startup checks for required columns
3. **Naming Consistency**: Standardize on either `synced_at` or `last_synced_at`
4. **Testing**: Add integration tests for schema validation

### Related Issues

- Migration 056 (email_history table) had similar PostgREST cache issues
- Migration 050 (buyer varchar fields) required manual execution
- Migration 054 (buyer sync columns) was prepared but not executed
