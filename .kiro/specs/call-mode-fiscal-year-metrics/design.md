# Design Document

## Overview

通話モードページの実績セクションにおいて、会社の年度（10月～9月）に基づいた月平均計算機能を実装する。現在の実装は単月のメトリクスのみを表示しているが、これを拡張して年度開始月から現在月までの月平均、および前年度同期間の月平均を計算・表示する機能を追加する。

年度計算ロジックは再利用可能なユーティリティとして実装し、将来的に他の機能でも利用できるようにする。

## Architecture

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (React)                          │
│  ┌──────────────────────────────────────────────────────┐  │
│  │     PerformanceMetricsSection Component              │  │
│  │  - Display current month metrics                     │  │
│  │  - Display fiscal year monthly averages              │  │
│  │  - Display previous year monthly averages            │  │
│  │  - Display fixed targets                             │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ HTTP Request
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    Backend (Express)                         │
│  ┌──────────────────────────────────────────────────────┐  │
│  │         Performance Metrics API Route                │  │
│  │  GET /api/sellers/performance-metrics?month=YYYY-MM  │  │
│  └──────────────────────────────────────────────────────┘  │
│                            │                                 │
│                            ▼                                 │
│  ┌──────────────────────────────────────────────────────┐  │
│  │      PerformanceMetricsService (Enhanced)            │  │
│  │  - Calculate current month metrics                   │  │
│  │  - Calculate fiscal year monthly averages            │  │
│  │  - Calculate previous year monthly averages          │  │
│  │  - Use FiscalYearUtils for date calculations         │  │
│  └──────────────────────────────────────────────────────┘  │
│                            │                                 │
│                            ▼                                 │
│  ┌──────────────────────────────────────────────────────┐  │
│  │           FiscalYearUtils (New)                      │  │
│  │  - Get fiscal year boundaries                        │  │
│  │  - Calculate months elapsed in fiscal year           │  │
│  │  - Get previous fiscal year date ranges              │  │
│  │  - Handle fiscal year transitions                    │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ Database Query
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    Database (Supabase)                       │
│                      sellers table                           │
└─────────────────────────────────────────────────────────────┘
```

## Components and Interfaces

### 1. FiscalYearUtils (New Utility)

年度計算のための再利用可能なユーティリティクラス。

```typescript
export interface FiscalYearPeriod {
  startDate: Date;
  endDate: Date;
  fiscalYear: number; // 年度を表す年（例：2024年度 = 2024）
}

export interface FiscalYearMonthRange {
  startMonth: Date; // 年度開始月（10月1日）
  endMonth: Date;   // 指定月の末日
  monthsElapsed: number; // 経過月数
}

export class FiscalYearUtils {
  /**
   * 会社の年度開始月（10月 = 9）
   */
  static readonly FISCAL_YEAR_START_MONTH = 9; // 0-indexed (October)

  /**
   * 指定日が属する年度の期間を取得
   * @param date 基準日
   * @returns 年度の開始日と終了日
   */
  static getFiscalYearPeriod(date: Date): FiscalYearPeriod;

  /**
   * 指定月までの年度内経過月数を取得
   * @param year 年
   * @param month 月（1-12）
   * @returns 年度開始月から指定月までの範囲と経過月数
   */
  static getFiscalYearMonthRange(year: number, month: number): FiscalYearMonthRange;

  /**
   * 前年度の同期間を取得
   * @param year 現在の年
   * @param month 現在の月（1-12）
   * @returns 前年度の同期間の開始日と終了日
   */
  static getPreviousFiscalYearRange(year: number, month: number): {
    startDate: Date;
    endDate: Date;
  };

  /**
   * 指定月が年度の何ヶ月目かを計算
   * @param year 年
   * @param month 月（1-12）
   * @returns 年度開始からの経過月数（1-12）
   */
  static getMonthsElapsedInFiscalYear(year: number, month: number): number;
}
```

### 2. Enhanced PerformanceMetricsService

既存のサービスを拡張して、月平均計算機能を追加。

```typescript
export interface MonthlyAverageMetrics {
  currentValue: number;
  fiscalYearMonthlyAverage: number;
  previousYearMonthlyAverage?: number;
  target?: number;
}

export interface RepresentativeMetricWithAverage extends RepresentativeMetric {
  fiscalYearMonthlyAverage: number;
  previousYearMonthlyAverage?: number;
}

export interface EnhancedPerformanceMetrics {
  month: string;
  
  // 訪問査定取得割合
  visitAppraisalRate: MonthlyAverageMetrics & {
    target: 28; // 固定値
  };
  
  // 専任件数（専任割合）
  exclusiveContracts: {
    byRepresentative: RepresentativeMetricWithAverage[];
    total: {
      count: number;
      rate: number;
      fiscalYearMonthlyAverage: number;
      target: 48; // 固定値
    };
  };
  
  // 他決割合（未訪問）
  competitorLossUnvisited: MonthlyAverageMetrics & {
    previousYearMonthlyAverage: number; // 必須
  };
  
  // 他決割合（訪問済み）
  competitorLossVisited: {
    byRepresentative: RepresentativeMetricWithAverage[];
    total: {
      count: number;
      rate: number;
      fiscalYearMonthlyAverage: number;
      previousYearMonthlyAverage: number; // 必須
    };
  };
}

export class PerformanceMetricsService extends BaseRepository {
  /**
   * 拡張されたメトリクス計算（月平均を含む）
   */
  async calculateEnhancedMetrics(month: string): Promise<EnhancedPerformanceMetrics>;

  /**
   * 年度内の月平均を計算
   * @param year 年
   * @param month 月
   * @param calculateMonthMetric 単月のメトリクスを計算する関数
   * @returns 年度開始月から指定月までの月平均
   */
  private async calculateFiscalYearMonthlyAverage(
    year: number,
    month: number,
    calculateMonthMetric: (y: number, m: number) => Promise<number>
  ): Promise<number>;

  /**
   * 前年度同期間の月平均を計算
   * @param year 現在の年
   * @param month 現在の月
   * @param calculateMonthMetric 単月のメトリクスを計算する関数
   * @returns 前年度同期間の月平均
   */
  private async calculatePreviousYearMonthlyAverage(
    year: number,
    month: number,
    calculateMonthMetric: (y: number, m: number) => Promise<number>
  ): Promise<number>;

  // 既存のメソッドは維持
  async calculateMetrics(month: string): Promise<PerformanceMetrics>;
  async calculateVisitAppraisalCount(year: number, month: number): Promise<number>;
  async calculateVisitAppraisalRate(year: number, month: number): Promise<number>;
  async calculateExclusiveContracts(year: number, month: number): Promise<...>;
  async calculateCompetitorLossUnvisited(year: number, month: number): Promise<...>;
  async calculateCompetitorLossVisited(year: number, month: number): Promise<...>;
}
```

### 3. Enhanced Frontend Component

フロントエンドコンポーネントを拡張して、月平均と目標値を表示。

```typescript
export const PerformanceMetricsSection: React.FC = () => {
  // 既存のstate
  const [selectedMonth, setSelectedMonth] = useState<string>(...);
  const [metrics, setMetrics] = useState<EnhancedPerformanceMetrics | null>(null);
  
  // 新しい表示フォーマット関数
  const formatWithAverage = (
    current: number,
    average: number,
    target?: number
  ): string => {
    let result = `${current.toFixed(1)}%（月平均${average.toFixed(1)}%`;
    if (target !== undefined) {
      result += `、目標${target}%`;
    }
    result += '）';
    return result;
  };

  const formatRepresentativeWithAverage = (
    metrics: RepresentativeMetricWithAverage[]
  ): string => {
    return metrics
      .map((m) => 
        `${m.representative}：${m.count}（${m.rate.toFixed(1)}%、` +
        `月平均${m.fiscalYearMonthlyAverage.toFixed(1)}%）`
      )
      .join('　');
  };

  // レンダリング
  return (
    <div>
      {/* 訪問査定取得割合 */}
      <div>
        訪問査定取得割合：
        {formatWithAverage(
          metrics.visitAppraisalRate.currentValue,
          metrics.visitAppraisalRate.fiscalYearMonthlyAverage,
          metrics.visitAppraisalRate.target
        )}
      </div>

      {/* 専任件数（専任割合） */}
      <div>
        専任件数（専任割合）:
        {formatRepresentativeWithAverage(
          metrics.exclusiveContracts.byRepresentative
        )}
        　計：{metrics.exclusiveContracts.total.count}（
        {metrics.exclusiveContracts.total.rate.toFixed(1)}%、
        月平均{metrics.exclusiveContracts.total.fiscalYearMonthlyAverage.toFixed(1)}%、
        目標{metrics.exclusiveContracts.total.target}%）
      </div>

      {/* 他決割合（未訪問） */}
      <div>
        他決割合（未訪問）：
        {formatWithAverage(
          metrics.competitorLossUnvisited.currentValue,
          metrics.competitorLossUnvisited.fiscalYearMonthlyAverage
        )}
        （前年度平均{metrics.competitorLossUnvisited.previousYearMonthlyAverage.toFixed(1)}%）
      </div>

      {/* 他決割合（訪問済み） */}
      <div>
        他決割合（訪問済み）：
        {formatRepresentativeWithAverage(
          metrics.competitorLossVisited.byRepresentative
        )}
        　計：{metrics.competitorLossVisited.total.count}（
        {metrics.competitorLossVisited.total.rate.toFixed(1)}%、
        月平均{metrics.competitorLossVisited.total.fiscalYearMonthlyAverage.toFixed(1)}%、
        前年度月平均{metrics.competitorLossVisited.total.previousYearMonthlyAverage.toFixed(1)}%）
      </div>
    </div>
  );
};
```

## Data Models

### FiscalYearPeriod

```typescript
interface FiscalYearPeriod {
  startDate: Date;      // 年度開始日（10月1日）
  endDate: Date;        // 年度終了日（翌年9月30日）
  fiscalYear: number;   // 年度（例：2024年度 = 2024）
}
```

### FiscalYearMonthRange

```typescript
interface FiscalYearMonthRange {
  startMonth: Date;     // 年度開始月（10月1日）
  endMonth: Date;       // 指定月の末日
  monthsElapsed: number; // 経過月数（1-12）
}
```

### MonthlyAverageMetrics

```typescript
interface MonthlyAverageMetrics {
  currentValue: number;                  // 当月の値
  fiscalYearMonthlyAverage: number;      // 年度月平均
  previousYearMonthlyAverage?: number;   // 前年度月平均（オプション）
  target?: number;                       // 目標値（オプション）
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Fiscal year period calculation consistency

*For any* date, calculating the fiscal year period should return October 1st as the start date and September 30th of the following year as the end date, and the fiscal year number should match the year of the start date.

**Validates: Requirements 1.1**

### Property 2: Months elapsed calculation correctness

*For any* year and month within a fiscal year, the months elapsed should be between 1 and 12, and should correctly reflect the number of months from October to the specified month.

**Validates: Requirements 1.2, 1.3, 1.4**

### Property 3: Previous year range correspondence

*For any* current year and month, the previous fiscal year range should have the same month span as the current fiscal year range, but shifted back by exactly one year.

**Validates: Requirements 4.4, 5.4**

### Property 4: Monthly average calculation bounds

*For any* set of monthly values, the calculated monthly average should be greater than or equal to the minimum value and less than or equal to the maximum value in the set.

**Validates: Requirements 2.4, 3.3, 4.2, 5.3**

### Property 5: Fiscal year transition handling

*For any* date in January through September, the fiscal year should be the previous calendar year, and for any date in October through December, the fiscal year should be the current calendar year.

**Validates: Requirements 1.5, 6.5**

### Property 6: Target value immutability

*For any* calculation of visit appraisal rate or exclusive contract rate, the target values (28% and 48% respectively) should remain constant regardless of the input month or year.

**Validates: Requirements 2.3, 3.4**

### Property 7: Representative aggregation consistency

*For any* set of representative metrics, the sum of individual representative counts should equal the total count, and the total rate should be calculated from the total count divided by the appropriate denominator.

**Validates: Requirements 3.1, 3.2, 5.1, 5.2**

### Property 8: Rate calculation non-negativity

*For any* calculated rate (visit appraisal, exclusive contract, competitor loss), the result should be non-negative and should not exceed 100%.

**Validates: Requirements 2.1, 2.2, 3.3, 4.1, 4.2, 5.3**

## Error Handling

### FiscalYearUtils Error Handling

- **Invalid Date Input**: 無効な日付が渡された場合、エラーをスローする
- **Invalid Month Range**: 月が1-12の範囲外の場合、エラーをスローする
- **Null/Undefined Input**: null または undefined が渡された場合、エラーをスローする

### PerformanceMetricsService Error Handling

- **Database Query Errors**: データベースクエリが失敗した場合、エラーをログに記録し、適切なエラーレスポンスを返す
- **Missing Data**: データが存在しない月の場合、0 または null を返す（エラーとしない）
- **Calculation Errors**: 計算中にエラーが発生した場合、エラーをログに記録し、デフォルト値（0）を返す

### Frontend Error Handling

- **API Request Failures**: API リクエストが失敗した場合、エラーメッセージを表示し、再試行ボタンを提供
- **Invalid Data Format**: 予期しないデータ形式の場合、エラーメッセージを表示
- **Loading States**: データ取得中は適切なローディング表示を行う

## Testing Strategy

### Unit Tests

単月のメトリクス計算ロジックは既存のテストでカバーされているため、新規追加する機能に焦点を当てる：

1. **FiscalYearUtils Tests**
   - 年度期間計算のテスト（各月での動作確認）
   - 経過月数計算のテスト
   - 前年度範囲計算のテスト
   - エッジケース（年度の境界月）のテスト

2. **Monthly Average Calculation Tests**
   - 年度月平均計算のテスト
   - 前年度月平均計算のテスト
   - データが存在しない場合のテスト

3. **Frontend Display Tests**
   - フォーマット関数のテスト
   - 目標値表示のテスト
   - 担当者別表示のテスト

### Property-Based Tests

プロパティベーステストは、ランダムに生成された入力に対して普遍的な性質が成立することを検証する。各テストは最低100回の反復を実行する。

1. **Property 1: Fiscal year period calculation consistency**
   - ランダムな日付を生成
   - 年度期間を計算
   - 開始日が10月1日、終了日が翌年9月30日であることを検証

2. **Property 2: Months elapsed calculation correctness**
   - ランダムな年と月を生成
   - 経過月数を計算
   - 1-12の範囲内であることを検証

3. **Property 3: Previous year range correspondence**
   - ランダムな年と月を生成
   - 現在と前年度の範囲を計算
   - 月数が一致し、1年前にシフトされていることを検証

4. **Property 4: Monthly average calculation bounds**
   - ランダムな月次データセットを生成
   - 月平均を計算
   - 最小値以上、最大値以下であることを検証

5. **Property 5: Fiscal year transition handling**
   - ランダムな日付を生成
   - 年度を計算
   - 10-12月は現在年、1-9月は前年であることを検証

6. **Property 8: Rate calculation non-negativity**
   - ランダムなカウントデータを生成
   - 各種割合を計算
   - 0%以上100%以下であることを検証

### Integration Tests

1. **End-to-End API Tests**
   - 各月のメトリクス取得APIのテスト
   - 年度境界月（9月、10月）での動作確認
   - 前年度データが存在する/しない場合のテスト

2. **Frontend Integration Tests**
   - コンポーネントのレンダリングテスト
   - 月選択時のデータ更新テスト
   - エラー状態の表示テスト

## Implementation Notes

### 実装の優先順位

1. **Phase 1**: FiscalYearUtils の実装とテスト
2. **Phase 2**: PerformanceMetricsService の拡張（月平均計算）
3. **Phase 3**: API エンドポイントの更新
4. **Phase 4**: フロントエンドコンポーネントの更新
5. **Phase 5**: 統合テストと動作確認

### パフォーマンス考慮事項

- 月平均計算では複数月のデータを取得するため、クエリの最適化が重要
- 可能な限りデータベース側で集計を行い、アプリケーション層での処理を最小化
- 計算結果のキャッシュを検討（特に過去月のデータ）

### 後方互換性

- 既存の `/api/sellers/performance-metrics` エンドポイントは維持
- 新しいエンドポイント `/api/sellers/performance-metrics-enhanced` を追加するか、クエリパラメータで切り替え可能にする
- フロントエンドは段階的に移行可能な設計とする
