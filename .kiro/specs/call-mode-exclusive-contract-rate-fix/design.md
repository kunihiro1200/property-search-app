# Design Document: 専任件数の割合の計算式修正と表示改善

## Architecture Overview

### Current Architecture (Incorrect)
```
PerformanceMetricsService.calculateExclusiveContracts()
  ↓
  分子: 専任件数（contract_year_month基準、status = '専任媒介'）
  分母: 訪問査定取得数（visit_acquisition_date基準）
  ↓
  計算式: 専任件数 ÷ 訪問査定取得数 × 100
  ↓
  Return rate
```

### Target Architecture (Correct)
```
PerformanceMetricsService.calculateExclusiveContracts()
  ↓
  分子: 専任件数（contract_year_month基準、status = '専任媒介'）
  分母: 訪問数（visit_date基準）- 一般媒介数（contract_year_month基準、status = '一般媒介'）
  ↓
  計算式: 専任件数 ÷ (訪問数 - 一般媒介数) × 100
  ↓
  Return { rate, numerator, denominator, visitCount, generalAgencyCount }
```

## Database Schema

### sellers Table (Relevant Fields)
```sql
CREATE TABLE sellers (
  id SERIAL PRIMARY KEY,
  seller_number VARCHAR(50) UNIQUE NOT NULL,
  inquiry_date TIMESTAMP,
  visit_date TIMESTAMP,
  visit_acquisition_date TIMESTAMP,
  visit_assignee VARCHAR(10),
  contract_year_month TIMESTAMP,
  status VARCHAR(50),
  confidence VARCHAR(20),
  deleted_at TIMESTAMP,
  -- other fields...
);
```

### Key Fields for Calculation
- `status`: 契約状況（"専任媒介", "一般媒介", "他決", etc.）
- `visit_date`: 訪問日（分母の訪問数カウント用）
- `visit_acquisition_date`: 訪問査定取得日（現在の誤った計算で使用中）
- `visit_assignee`: 営業担当者
- `contract_year_month`: 契約年月（専任件数と一般媒介数のカウント用）
- `confidence`: 確度（"D", "ダブり" を除外）
- `deleted_at`: 削除フラグ（NULL のみカウント）

## Calculation Logic Design

### 分子: 専任件数
**Date Basis:** `contract_year_month`（契約年月）

```typescript
const { data: exclusiveData, error: exclusiveError } = await this.table('sellers')
  .select('visit_assignee')
  .eq('status', '専任媒介')
  .not('visit_assignee', 'is', null)
  .neq('visit_assignee', '')
  .gte('contract_year_month', startDate)
  .lte('contract_year_month', endDate)
  .is('deleted_at', null)
  .not('confidence', 'in', '("D","ダブり")');
```

### 分母: 訪問数 - 一般媒介数

#### 訪問数
**Date Basis:** `visit_date`（訪問日）

```typescript
const { data: visitData, error: visitError } = await this.table('sellers')
  .select('visit_assignee')
  .gte('visit_date', startDate)
  .lte('visit_date', endDate)
  .not('visit_assignee', 'is', null)
  .neq('visit_assignee', '')
  .is('deleted_at', null);
```

#### 一般媒介数
**Date Basis:** `contract_year_month`（契約年月）

```typescript
const { data: generalAgencyData, error: generalError } = await this.table('sellers')
  .select('visit_assignee')
  .eq('status', '一般媒介')
  .gte('contract_year_month', startDate)
  .lte('contract_year_month', endDate)
  .not('visit_assignee', 'is', null)
  .neq('visit_assignee', '')
  .is('deleted_at', null);
```

### 計算式
```typescript
const denominator = visitCount - generalAgencyCount;
const rate = denominator > 0 ? (exclusiveCount / denominator) * 100 : 0;
```

### 具体例: 2025年11月 I の場合
```
専任件数: 3件（contract_year_month = 2025-11, status = '専任媒介'）
訪問数: 12件（visit_date = 2025-11）
一般媒介数: 1件（contract_year_month = 2025-11, status = '一般媒介'）

計算:
分母 = 12 - 1 = 11
専任件数の割合 = 3 ÷ 11 × 100 = 27.3%
```

## API Response Design

### Modified Response Structure
```typescript
interface ExclusiveContractsMetric {
  byRepresentative: RepresentativeMetricWithDetails[];
  total: {
    count: number;
    rate: number;
    numerator: number;        // 専任件数
    denominator: number;      // 訪問数 - 一般媒介数
    visitCount: number;       // 訪問数
    generalAgencyCount: number; // 一般媒介数
  };
}

interface RepresentativeMetricWithDetails {
  representative: string;
  count: number;
  rate: number;
  numerator: number;        // 専任件数
  denominator: number;      // 訪問数 - 一般媒介数
  visitCount: number;       // 訪問数
  generalAgencyCount: number; // 一般媒介数
}
```

### Example Response
```json
{
  "exclusiveContracts": {
    "byRepresentative": [
      {
        "representative": "I",
        "count": 3,
        "rate": 27.3,
        "numerator": 3,
        "denominator": 11,
        "visitCount": 12,
        "generalAgencyCount": 1
      }
    ],
    "total": {
      "count": 4,
      "rate": 25.0,
      "numerator": 4,
      "denominator": 16,
      "visitCount": 18,
      "generalAgencyCount": 2
    }
  }
}
```

## Frontend Display Design

### MetricCard Component Enhancement

#### Display Structure
```
┌─────────────────────────────────────────┐
│ 専任件数（専任割合）                      │
│                                         │
│ 専任件数 ÷ (訪問数 - 一般媒介数)         │  ← 計算式の説明（上部）
│                                         │
│         27.3%                           │  ← パーセンテージ値（中央）
│                                         │
│    3 ÷ (12 - 1) = 27.3%                │  ← 実際の数字（下部）
│                                         │
│ 合計: 3件                               │
│ ┌─────────────────────────────────┐    │
│ │ 営担別テーブル                    │    │
│ └─────────────────────────────────┘    │
└─────────────────────────────────────────┘
```

#### Component Props
```typescript
interface MetricCardProps {
  title: string;
  currentValue: number;
  monthlyAverage: number;
  target?: number;
  previousYearAverage?: number;
  unit?: string;
  showProgressBar?: boolean;
  children?: React.ReactNode;
  // 新規追加
  formulaLabel?: string;        // 計算式の説明
  formulaWithNumbers?: string;  // 実際の数字を使った計算式
}
```

#### Display Implementation
```typescript
export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  currentValue,
  monthlyAverage,
  target,
  previousYearAverage,
  unit = '%',
  showProgressBar = false,
  children,
  formulaLabel,
  formulaWithNumbers,
}) => {
  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-sm font-medium text-gray-700 mb-3">{title}</h3>
      
      {/* 計算式の説明（上部） */}
      {formulaLabel && (
        <div className="text-xs text-gray-600 mb-2 font-medium">
          {formulaLabel}
        </div>
      )}
      
      {/* パーセンテージ値（中央） */}
      <div className="text-2xl font-bold text-gray-900 mb-2">
        {currentValue.toFixed(1)}{unit}
      </div>
      
      {/* 実際の数字を使った計算式（下部） */}
      {formulaWithNumbers && (
        <div className="text-xs text-gray-500 mb-3">
          {formulaWithNumbers}
        </div>
      )}
      
      {/* 月平均との比較 */}
      <div className="text-sm text-gray-600 mb-4">
        月平均: {monthlyAverage.toFixed(1)}{unit}
      </div>
      
      {/* その他の要素 */}
      {showProgressBar && target !== undefined && (
        <ProgressBar current={currentValue} target={target} />
      )}
      
      {children}
    </div>
  );
};
```

### PerformanceMetricsSection Component Update

```typescript
<MetricCard
  title="専任件数（専任割合）"
  currentValue={metrics.exclusiveContracts.total.rate}
  monthlyAverage={metrics.exclusiveContracts.total.fiscalYearMonthlyAverage}
  target={metrics.exclusiveContracts.total.target}
  showProgressBar={true}
  formulaLabel="専任件数 ÷ (訪問数 - 一般媒介数)"
  formulaWithNumbers={`${metrics.exclusiveContracts.total.numerator} ÷ (${metrics.exclusiveContracts.total.visitCount} - ${metrics.exclusiveContracts.total.generalAgencyCount}) = ${metrics.exclusiveContracts.total.rate.toFixed(1)}%`}
>
  <div className="text-sm text-gray-700 mb-2">
    合計: {metrics.exclusiveContracts.total.count}件
  </div>
  <RepresentativeTable
    data={metrics.exclusiveContracts.byRepresentative}
    showTotal={false}
  />
</MetricCard>
```

## Data Flow

```
User Request (2025-11)
  ↓
PerformanceMetricsService.calculateEnhancedMetrics()
  ↓
calculateExclusiveContracts(2025, 11)
  ↓
Query 1: 専任件数
  - status = '専任媒介'
  - contract_year_month between 2025-11-01 and 2025-11-30
  - visit_assignee is not null
  - deleted_at IS NULL
  - confidence not in ('D', 'ダブり')
  → Result: 3件（営担 I）
  ↓
Query 2: 訪問数
  - visit_date between 2025-11-01 and 2025-11-30
  - visit_assignee is not null
  - deleted_at IS NULL
  → Result: 12件（営担 I）
  ↓
Query 3: 一般媒介数
  - status = '一般媒介'
  - contract_year_month between 2025-11-01 and 2025-11-30
  - visit_assignee is not null
  - deleted_at IS NULL
  → Result: 1件（営担 I）
  ↓
Calculate:
  denominator = 12 - 1 = 11
  rate = 3 / 11 * 100 = 27.3%
  ↓
Return {
  byRepresentative: [
    {
      representative: 'I',
      count: 3,
      rate: 27.3,
      numerator: 3,
      denominator: 11,
      visitCount: 12,
      generalAgencyCount: 1
    }
  ],
  total: { ... }
}
  ↓
Frontend Display:
  専任件数 ÷ (訪問数 - 一般媒介数)
  27.3%
  3 ÷ (12 - 1) = 27.3%
```

## Error Handling

### Division by Zero
```typescript
const denominator = visitCount - generalAgencyCount;

if (denominator <= 0) {
  return {
    byRepresentative: [],
    total: {
      count: exclusiveCount,
      rate: 0,
      numerator: exclusiveCount,
      denominator: 0,
      visitCount,
      generalAgencyCount,
    },
  };
}
```

### Database Errors
```typescript
if (exclusiveError || visitError || generalError) {
  console.error('Error calculating exclusive contracts:', {
    exclusiveError,
    visitError,
    generalError,
  });
  throw new Error('Failed to calculate exclusive contracts');
}
```

### Null/Undefined Handling
```typescript
const exclusiveCount = exclusiveData?.length || 0;
const visitCount = visitData?.length || 0;
const generalAgencyCount = generalAgencyData?.length || 0;
```

## Performance Considerations

### Query Optimization
```sql
-- Add composite indexes for optimal performance
CREATE INDEX idx_sellers_exclusive_contracts 
ON sellers(contract_year_month, status, visit_assignee, deleted_at) 
WHERE status = '専任媒介' AND deleted_at IS NULL;

CREATE INDEX idx_sellers_visit_date 
ON sellers(visit_date, visit_assignee, deleted_at) 
WHERE deleted_at IS NULL;

CREATE INDEX idx_sellers_general_agency 
ON sellers(contract_year_month, status, visit_assignee, deleted_at) 
WHERE status = '一般媒介' AND deleted_at IS NULL;
```

### Caching Strategy
- Cache results by month and representative
- Invalidate cache when data is updated
- TTL: 1 hour for current month, 24 hours for past months

## Testing Strategy

### Unit Tests
1. Test with correct data (3 ÷ (12 - 1) = 27.3%)
2. Test with zero denominator (訪問数 = 一般媒介数)
3. Test with no exclusive contracts
4. Test with no visits
5. Test with no general agency contracts
6. Test with multiple representatives

### Integration Tests
1. Test with real data from November 2025
2. Verify営担 I shows 27.3%
3. Verify other representatives show correct rates
4. Test with different months

### Verification Script
Create `backend/test-exclusive-contract-rate-fix.ts`:
```typescript
// Compare old calculation vs new calculation
// Show differences for each representative
// Verify expected rates
```

## Rollback Plan

### If Issues Occur
1. Revert changes to `PerformanceMetricsService.ts`
2. Revert changes to `MetricCard.tsx`
3. Revert changes to `PerformanceMetricsSection.tsx`
4. Clear cache
5. Restart backend

### Rollback Command
```bash
git revert <commit-hash>
cd backend && npm run build
cd ../frontend && npm run build
pm2 restart all
```

## Success Metrics

### Technical Metrics
- Query execution time < 200ms (3 queries)
- No increase in error rate
- All tests passing

### Business Metrics
- 営担 I の2025年11月の専任件数の割合 = 27.3%
- 計算式が画面に表示される
- 実際の数字が表示される

## Documentation Updates

### Code Comments
```typescript
/**
 * 専任媒介件数と割合を計算
 * 
 * 計算式:
 * 専任件数の割合 = 専任件数 ÷ (訪問数 - 一般媒介数) × 100
 * 
 * 分子: 専任件数（contract_year_month基準、status = '専任媒介'）
 * 分母: 訪問数（visit_date基準）- 一般媒介数（contract_year_month基準、status = '一般媒介'）
 * 
 * 例: 2025年11月 I の場合
 * 専任件数: 3件
 * 訪問数: 12件
 * 一般媒介数: 1件
 * 専任件数の割合 = 3 ÷ (12 - 1) = 27.3%
 */
```

### User Documentation
- Update performance metrics guide
- Explain the calculation formula
- Document the display format

## Future Enhancements

### Potential Improvements
1. Add breakdown by contract type
2. Add trend analysis over time
3. Add alerts for unusual patterns
4. Add export functionality

### Monitoring
- Track query performance
- Monitor data quality
- Alert on unexpected rates
