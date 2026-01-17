# Design Document: Exclusive Contracts Calculation Fix ✅ IMPLEMENTED

## Architecture Overview

### Previous Architecture
```
PerformanceMetricsService.calculateExclusiveContracts()
  ↓
  Query: visit_date + visit_assignee exists + confidence filter
  ↓
  Count all matching records (regardless of status)
  ↓
  Return count by representative
```

### Implemented Architecture ✅
```
PerformanceMetricsService.calculateExclusiveContracts()
  ↓
  Query: status = '専任媒介' + contract_year_month + visit_assignee exists + confidence filter
  ↓
  Count only records with status = '専任媒介' and contract_year_month in range
  ↓
  Return count by representative
```

## Database Schema

### sellers Table (Relevant Fields)
```sql
CREATE TABLE sellers (
  id SERIAL PRIMARY KEY,
  seller_number VARCHAR(50) UNIQUE NOT NULL,
  inquiry_date TIMESTAMP,
  visit_date TIMESTAMP,
  visit_assignee VARCHAR(10),
  contract_year_month TIMESTAMP,
  status VARCHAR(50),
  confidence VARCHAR(20),
  -- other fields...
);
```

### Key Fields for Exclusive Contracts
- `status`: 契約状況（"専任媒介", "一般媒介", "他決", etc.）
- `visit_date`: 訪問日
- `visit_assignee`: 営業担当者
- `confidence`: 確度（"D", "ダブり" を除外）
- `contract_year_month`: 契約年月（オプション）

## Query Design

### ✅ Implemented: contract_year_month Based
契約年月を基準にカウント（契約が成立した月の実績として計上）

```typescript
const { data: exclusiveData, error: exclusiveError } = await this.table('sellers')
  .select('visit_assignee')
  .eq('status', '専任媒介')
  .not('visit_assignee', 'is', null)
  .neq('visit_assignee', '')
  .gte('contract_year_month', startDate)
  .lte('contract_year_month', endDate)
  .not('confidence', 'in', '("D","ダブり")');
```

**Pros:**
- ✅ 契約が成立した月の実績として計上される
- ✅ 契約実績の正確な把握
- ✅ ビジネスロジックと整合性がある
- ✅ ユーザーの期待値（3件）と一致

**Cons:**
- `contract_year_month` が null の場合はカウントされない（現時点では問題なし）

### ❌ Not Selected: visit_date Based
訪問日を基準にカウント（訪問した月の実績として計上）

```typescript
const { data: exclusiveData, error: exclusiveError } = await this.table('sellers')
  .select('visit_assignee')
  .eq('status', '専任媒介')
  .not('visit_assignee', 'is', null)
  .neq('visit_assignee', '')
  .gte('visit_date', startDate)
  .lte('visit_date', endDate)
  .not('confidence', 'in', '("D","ダブり")');
```

**Why Not Selected:**
- ❌ 訪問した月と契約した月が異なる場合がある
- ❌ 実績の不正確さ（訪問しただけで契約していない場合もカウントされる）
- ❌ ユーザー期待値との不一致（2件しかカウントされない）

### ❌ Not Selected: Hybrid Approach
訪問日を基準にしつつ、契約年月も考慮

**Why Not Selected:**
- ❌ ロジックが複雑
- ❌ 重複カウントの可能性
- ❌ 不要な複雑性

## Recommended Approach ✅ IMPLEMENTED

**contract_year_month Based** を実装

理由:
1. ✅ 契約が成立した月の実績として正確に計上される
2. ✅ ビジネスロジックと整合性がある（専任媒介契約は契約日が重要）
3. ✅ ユーザーの期待値（3件）と一致
4. ✅ 契約実績の正確な把握が可能
5. ✅ シンプルで理解しやすい

## Implementation Details ✅ COMPLETE

### Modified Method Signature
```typescript
async calculateExclusiveContracts(
  year: number,
  month: number
): Promise<{
  byRepresentative: RepresentativeMetric[];
  total: { count: number; rate: number };
}>
```

### Implemented Query Logic ✅
```typescript
// 専任媒介の件数を取得（contract_year_month が指定月、status が '専任媒介'）
const { data: exclusiveData, error: exclusiveError } = await this.table('sellers')
  .select('visit_assignee')
  .eq('status', '専任媒介')
  .not('visit_assignee', 'is', null)
  .neq('visit_assignee', '')
  .gte('contract_year_month', startDate)  // ← CHANGED from visit_date
  .lte('contract_year_month', endDate)    // ← CHANGED from visit_date
  .not('confidence', 'in', '("D","ダブり")');
```

### Updated Comments ✅
```typescript
/**
 * 専任媒介件数と割合を計算
 * 条件: 
 * - status が '専任媒介'
 * - visit_assignee が存在
 * - contract_year_month が指定月（契約が成立した月）
 * - confidence が "D" または "ダブり" でない
 */
```

## Data Flow ✅ IMPLEMENTED

```
User Request (2025-11)
  ↓
PerformanceMetricsService.calculateEnhancedMetrics()
  ↓
calculateExclusiveContracts(2025, 11)
  ↓
Query Database:
  - status = '専任媒介'
  - contract_year_month between 2025-11-01 and 2025-11-30  ← CHANGED
  - visit_assignee is not null
  - confidence not in ('D', 'ダブり')
  ↓
Group by visit_assignee
  ↓
Calculate rate = count / visitAppraisalCount * 100
  ↓
Return {
  byRepresentative: [
    { representative: 'I', count: 3, rate: 25.0 },  ← CORRECT COUNT
    { representative: 'U', count: 1, rate: 8.3 },
    ...
  ],
  total: { count: 4, rate: 33.3 }
}
```

## Testing Strategy

### Unit Tests
1. Test with status = '専任媒介'
2. Test with other status values (should not be counted)
3. Test with null visit_assignee (should not be counted)
4. Test with confidence = 'D' or 'ダブり' (should not be counted)
5. Test with visit_date outside the month (should not be counted)

### Integration Tests
1. Test with real data from November 2025
2. Test with multiple representatives
3. Test with edge cases (empty results, single result)

### Verification Script
Create `backend/verify-exclusive-contracts-fix.ts`:
```typescript
// Compare old logic vs new logic
// Show differences
// Verify expected counts
```

## Performance Considerations

### Query Performance
- Add index on `status` field if not exists
- Add composite index on `(visit_date, status, visit_assignee)` for optimal performance

```sql
CREATE INDEX idx_sellers_exclusive_contracts 
ON sellers(visit_date, status, visit_assignee) 
WHERE status = '専任媒介' AND confidence NOT IN ('D', 'ダブり');
```

### Caching
- No changes needed to caching strategy
- Results are already cached by month

## Error Handling

### Potential Errors
1. Database connection error
2. Invalid date range
3. No data for the specified month

### Error Handling Strategy
```typescript
if (exclusiveError) {
  console.error('Error calculating exclusive contracts:', exclusiveError);
  throw exclusiveError;
}

if (!exclusiveData) {
  return {
    byRepresentative: [],
    total: { count: 0, rate: 0 }
  };
}
```

## Rollback Plan

### If Issues Occur
1. Revert the change to `PerformanceMetricsService.ts`
2. Clear cache if necessary
3. Verify old logic is working

### Rollback Command
```bash
git revert <commit-hash>
npm run build
pm2 restart backend
```

## Migration Considerations

### No Database Migration Needed
- Using existing fields
- No schema changes required

### Data Validation
- Verify `status` field values are consistent
- Check for null or empty `status` values
- Ensure `visit_date` is populated for relevant records

## Documentation Updates

### Code Comments
- Update method documentation
- Add inline comments explaining the logic

### User Documentation
- Update performance metrics guide
- Explain what "exclusive contracts" means
- Document the calculation formula

## Success Metrics

### Technical Metrics
- Query execution time < 100ms
- No increase in error rate
- All tests passing

### Business Metrics
- Exclusive contracts count matches user expectations
- Representative "I" shows 2-3 contracts for November 2025
- Other representatives show accurate counts

## Future Enhancements

### Potential Improvements
1. Add filter for contract_year_month as well
2. Add breakdown by contract type
3. Add trend analysis over time
4. Add alerts for unusual patterns

### Monitoring
- Track query performance
- Monitor data quality
- Alert on unexpected counts
