# Design Document

## Overview

通話モードページに「実績」セクションを追加し、月次の営業実績を可視化します。このセクションでは、訪問査定取得数、訪問査定取得割合、専任媒介件数、他決割合などの重要な営業指標を表示します。

データはバックエンドAPIで計算され、フロントエンドで表示されます。月次フィルタリング機能により、過去の実績も確認できます。

## Architecture

### System Components

```
┌─────────────────┐
│  CallModePage   │
│   (Frontend)    │
└────────┬────────┘
         │
         │ GET /api/sellers/performance-metrics?month=YYYY-MM
         │
         ▼
┌─────────────────┐
│ Performance     │
│ Metrics API     │
│  (Backend)      │
└────────┬────────┘
         │
         │ Query sellers table
         │
         ▼
┌─────────────────┐
│   Supabase      │
│   Database      │
└─────────────────┘
```

### Data Flow

1. ユーザーが通話モードページを開く
2. フロントエンドが現在の月のパフォーマンスメトリクスをリクエスト
3. バックエンドがデータベースから売主データを取得
4. バックエンドが各メトリクスを計算
5. フロントエンドが結果を表示

## Components and Interfaces

### Backend API

#### Endpoint: GET /api/sellers/performance-metrics

**Query Parameters:**
- `month` (string, required): YYYY-MM形式の月指定

**Response:**
```typescript
interface PerformanceMetrics {
  month: string;
  visitAppraisalCount: number;
  visitAppraisalRate: number;
  exclusiveContracts: {
    byRepresentative: Array<{
      representative: string;
      count: number;
      rate: number;
    }>;
    total: {
      count: number;
      rate: number;
    };
  };
  competitorLossUnvisited: {
    count: number;
    rate: number;
  };
  competitorLossVisited: {
    byRepresentative: Array<{
      representative: string;
      count: number;
      rate: number;
    }>;
    total: {
      count: number;
      rate: number;
    };
  };
}
```

### Frontend Component

#### PerformanceMetricsSection Component

**Props:**
```typescript
interface PerformanceMetricsSectionProps {
  sellerId: string;
  selectedMonth?: string; // YYYY-MM形式、デフォルトは現在の月
}
```

**State:**
```typescript
interface PerformanceMetricsState {
  metrics: PerformanceMetrics | null;
  loading: boolean;
  error: string | null;
  selectedMonth: string;
}
```

## Data Models

### Database Schema

既存の`sellers`テーブルを使用します。以下のフィールドを参照します：

- `visit_date` (timestamp): 訪問日
- `inquiry_date` (timestamp): 反響日
- `confidence` (varchar): 確度（A, B, B', C, D, E, ダブり）
- `status` (varchar): 状況（当社）
- `assigned_to` (varchar): 営担（営業担当者のイニシャル）
- `contract_year_month` (timestamp): 契約年月

### Calculation Logic

#### 1. 訪問査定取得数 (Visit Appraisal Count)

```sql
SELECT COUNT(*)
FROM sellers
WHERE EXTRACT(YEAR FROM visit_date) = :year
  AND EXTRACT(MONTH FROM visit_date) = :month
  AND visit_date IS NOT NULL
```

#### 2. 訪問査定取得割合 (Visit Appraisal Rate)

```sql
-- 分子: 訪問査定取得数
SELECT COUNT(*) as visit_count
FROM sellers
WHERE EXTRACT(YEAR FROM visit_date) = :year
  AND EXTRACT(MONTH FROM visit_date) = :month
  AND visit_date IS NOT NULL

-- 分母: 依頼件数（確度D・ダブりを除く）
SELECT COUNT(*) as inquiry_count
FROM sellers
WHERE EXTRACT(YEAR FROM inquiry_date) = :year
  AND EXTRACT(MONTH FROM inquiry_date) = :month
  AND confidence NOT IN ('D', 'ダブり')

-- 割合 = visit_count / inquiry_count * 100
```

#### 3. 専任件数（専任割合）(Exclusive Contract Count and Rate)

```sql
-- 担当者別の専任件数
SELECT 
  assigned_to as representative,
  COUNT(*) as exclusive_count
FROM sellers
WHERE EXTRACT(YEAR FROM contract_year_month) = :year
  AND EXTRACT(MONTH FROM contract_year_month) = :month
  AND status = '専任媒介'
  AND assigned_to IS NOT NULL
  AND assigned_to != ''
GROUP BY assigned_to

-- 担当者別の訪問件数（専任割合の分母）
SELECT 
  assigned_to as representative,
  COUNT(*) as visit_count
FROM sellers
WHERE EXTRACT(YEAR FROM visit_date) = :year
  AND EXTRACT(MONTH FROM visit_date) = :month
  AND visit_date IS NOT NULL
  AND assigned_to IS NOT NULL
  AND assigned_to != ''
GROUP BY assigned_to

-- 専任割合 = exclusive_count / visit_count * 100
```

#### 4. 他決割合（未訪問）(Competitor Loss Rate - Unvisited)

```sql
-- 分子: 未訪問で他決になった件数
SELECT COUNT(*) as unvisited_loss_count
FROM sellers
WHERE EXTRACT(YEAR FROM inquiry_date) = :year
  AND EXTRACT(MONTH FROM inquiry_date) = :month
  AND (assigned_to IS NULL OR assigned_to = '')
  AND status IN ('他決→追客', '他決→追客不要')

-- 分母: 依頼件数（確度D・ダブり・訪問件数を除く）
SELECT COUNT(*) as inquiry_count
FROM sellers
WHERE EXTRACT(YEAR FROM inquiry_date) = :year
  AND EXTRACT(MONTH FROM inquiry_date) = :month
  AND confidence NOT IN ('D', 'ダブり')
  AND visit_date IS NULL

-- 割合 = unvisited_loss_count / inquiry_count * 100
```

#### 5. 他決割合（訪問済み）(Competitor Loss Rate - Visited)

**修正された計算式:**

分子: 「契約年月 他決は分かった時点」が指定月 かつ 「状況(当社)」に"他決"を含む件数
分母: (visit_dateが指定月の営担の総件数 - contract_year_monthが指定月 AND 「状況(当社)」が"一般媒介"の件数)

**例:** 2025年11月の営担 I の場合
- 分子: 2件（contract_year_monthが11月で他決の件数）
- 分母: 12 - 1 = 11件（visit_dateが11月の営担Iの総件数 - contract_year_monthが11月で一般媒介の件数）
- 結果: 2 ÷ 11 ≈ 18.2%

**例:** 2025年11月の営担 U の場合
- 分子: 1件（contract_year_monthが11月で他決の件数）
- 分母: 9 - 1 = 8件（visit_dateが11月の営担Uの総件数 - contract_year_monthが11月で一般媒介の件数）
- 結果: 1 ÷ 8 ≈ 12.5%

```sql
-- 担当者別の訪問済み他決件数（分子）
-- 「契約年月 他決は分かった時点」が指定月で、「状況（当社）」に"他決"を含む
SELECT 
  visit_assignee as representative,
  COUNT(*) as visited_loss_count
FROM sellers
WHERE EXTRACT(YEAR FROM contract_year_month) = :year
  AND EXTRACT(MONTH FROM contract_year_month) = :month
  AND status LIKE '%他決%'
GROUP BY visit_assignee

-- 担当者別の総件数（分母の計算用）
-- visit_date が指定月のすべての件数
SELECT 
  visit_assignee as representative,
  COUNT(*) as total_count
FROM sellers
WHERE EXTRACT(YEAR FROM visit_date) = :year
  AND EXTRACT(MONTH FROM visit_date) = :month
  AND visit_assignee IS NOT NULL
  AND visit_assignee != ''
GROUP BY visit_assignee

-- 担当者別の一般媒介件数（分母から除外する）
-- contract_year_month が指定月で、「状況(当社)」が"一般媒介"
SELECT 
  visit_assignee as representative,
  COUNT(*) as general_count
FROM sellers
WHERE EXTRACT(YEAR FROM contract_year_month) = :year
  AND EXTRACT(MONTH FROM contract_year_month) = :month
  AND status = '一般媒介'
  AND visit_assignee IS NOT NULL
  AND visit_assignee != ''
GROUP BY visit_assignee

-- 割合 = visited_loss_count / (total_count - general_count) * 100
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Visit appraisal count accuracy

*For any* month, the visit appraisal count should equal the number of sellers with a visit_date in that month
**Validates: Requirements 1.1, 1.2, 1.3**

### Property 2: Visit appraisal rate calculation

*For any* month with non-zero inquiries (excluding confidence D and ダブり), the visit appraisal rate should equal (visit count / inquiry count) * 100
**Validates: Requirements 2.1, 2.2, 2.3, 2.5**

### Property 3: Exclusive contract count by representative

*For any* month and representative, the exclusive contract count should equal the number of sellers with status '専任媒介' and that representative's assigned_to value in that month
**Validates: Requirements 3.1, 3.2, 3.3**

### Property 4: Exclusive contract rate calculation

*For any* representative with non-zero visits in a month, their exclusive contract rate should equal (exclusive count / visit count) * 100
**Validates: Requirements 3.5, 3.7**

### Property 5: Unvisited competitor loss count

*For any* month, the unvisited competitor loss count should equal the number of sellers with empty assigned_to and status in ('他決→追客', '他決→追客不要')
**Validates: Requirements 4.1, 4.2, 4.3**

### Property 6: Unvisited competitor loss rate calculation

*For any* month with non-zero unvisited inquiries (excluding confidence D, ダブり, and those with visits), the unvisited competitor loss rate should equal (unvisited loss count / unvisited inquiry count) * 100
**Validates: Requirements 4.4, 4.5, 4.6, 4.7, 4.9**

### Property 7: Visited competitor loss count by representative

*For any* month and representative, the visited competitor loss count should equal the number of sellers with contract_year_month in the target month and status containing "他決"
**Validates: Requirements 5.1, 5.2, 5.3**

### Property 8: Visited competitor loss rate calculation

*For any* representative with non-zero valid records in a month (after subtracting general agency count), their visited competitor loss rate should equal (visited loss count / (total count - general agency count)) * 100, where counts are based on contract_year_month in the target month
**Validates: Requirements 5.4, 5.5, 5.6, 5.8**

### Property 9: Month filter updates all metrics

*For any* month selection change, all displayed metrics should be recalculated based on the new month
**Validates: Requirements 6.1, 6.2**

### Property 10: Display format consistency

*For any* metric display, percentages should be formatted consistently and representative-level data should follow the specified format pattern
**Validates: Requirements 3.6, 5.6, 7.3, 7.4**

## Error Handling

### API Error Responses

```typescript
interface ErrorResponse {
  error: {
    code: string;
    message: string;
    retryable: boolean;
  };
}
```

**Error Codes:**
- `INVALID_MONTH_FORMAT`: 月の形式が不正（YYYY-MM形式でない）
- `CALCULATION_ERROR`: メトリクス計算中のエラー
- `DATABASE_ERROR`: データベースクエリエラー

### Frontend Error Handling

- APIエラー時は、エラーメッセージを表示
- ネットワークエラー時は、リトライボタンを表示
- データが存在しない場合は、「データがありません」と表示

## Testing Strategy

### Unit Tests

1. **Backend Calculation Tests**
   - 各メトリクス計算ロジックの単体テスト
   - エッジケース（ゼロ除算、空データなど）のテスト
   - 日付フィルタリングの正確性テスト

2. **Frontend Component Tests**
   - PerformanceMetricsSectionコンポーネントのレンダリングテスト
   - 月選択時の状態更新テスト
   - エラー表示のテスト

### Integration Tests

1. **API Integration Tests**
   - エンドツーエンドのAPIリクエスト/レスポンステスト
   - 異なる月でのデータ取得テスト
   - エラーハンドリングのテスト

2. **UI Integration Tests**
   - 通話モードページでの実績セクション表示テスト
   - 月選択UIとデータ更新の連携テスト

### Property-Based Tests

Property-based testing will be implemented using `fast-check` for TypeScript. Each correctness property will be tested with randomly generated data to ensure the calculations hold across all valid inputs.

**Test Configuration:**
- Minimum 100 iterations per property test
- Each test will be tagged with the property number from the design document

**Example Test Structure:**
```typescript
// Feature: call-mode-performance-metrics, Property 1: Visit appraisal count accuracy
test('Property 1: Visit appraisal count accuracy', () => {
  fc.assert(
    fc.property(
      fc.array(generateRandomSeller()),
      fc.date(),
      (sellers, targetMonth) => {
        const count = calculateVisitAppraisalCount(sellers, targetMonth);
        const expected = sellers.filter(s => 
          s.visitDate && isSameMonth(s.visitDate, targetMonth)
        ).length;
        return count === expected;
      }
    ),
    { numRuns: 100 }
  );
});
```

## Implementation Notes

### Performance Considerations

- データベースクエリは月単位でフィルタリングするため、インデックスを活用
- 大量データの場合は、集計結果をキャッシュすることを検討
- フロントエンドでは、月変更時のみAPIリクエストを送信

### Future Enhancements

- 年単位の集計表示
- グラフによる可視化
- CSVエクスポート機能
- 目標値との比較表示
