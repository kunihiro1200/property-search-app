# Design Document

## Overview

コールモードページの実績セクションを、文字の羅列から視覚的に分かりやすいカード形式のレイアウトに改善します。プログレスバー、カラーコーディング、アイコンを活用して、ユーザーが実績を一目で把握できるようにします。

## Architecture

### Component Structure

```
PerformanceMetricsSection (既存コンポーネントを改修)
├── MetricCard (新規)
│   ├── MetricHeader
│   ├── MetricValue
│   ├── ProgressBar (新規)
│   └── ComparisonIndicator (新規)
└── RepresentativeTable (新規)
```

### Data Flow

1. PerformanceMetricsSection が API からデータを取得（既存）
2. 各指標を MetricCard コンポーネントに渡す
3. MetricCard が ProgressBar と ComparisonIndicator を使用して視覚化
4. 担当者別データは RepresentativeTable で表示

## Components and Interfaces

### MetricCard Component

```typescript
interface MetricCardProps {
  title: string;
  currentValue: number;
  monthlyAverage: number;
  target?: number;
  previousYearAverage?: number;
  unit?: string; // '%' or '件' など
  showProgressBar?: boolean;
  children?: React.ReactNode; // 担当者テーブルなど
}
```

**機能:**
- タイトルと数値を大きく表示
- 目標値がある場合はプログレスバーを表示
- 現在値と平均値の比較インジケーターを表示
- カラーコーディング（達成度に応じて）

### ProgressBar Component

```typescript
interface ProgressBarProps {
  current: number;
  target: number;
  showPercentage?: boolean;
}
```

**機能:**
- 目標に対する達成度を視覚化
- 達成度に応じた色分け:
  - 100%以上: 緑 (bg-green-500)
  - 80-99%: 黄 (bg-yellow-500)
  - 80%未満: 赤 (bg-red-500)
- パーセンテージ表示

### ComparisonIndicator Component

```typescript
interface ComparisonIndicatorProps {
  current: number;
  average: number;
  label: string; // '月平均' or '前年度平均'
}
```

**機能:**
- 現在値と比較値を並べて表示
- 差分に応じたアイコン表示:
  - 上昇: ↑ (緑)
  - 下降: ↓ (赤)
  - 横ばい: → (グレー)
- 差分の数値を表示

### RepresentativeTable Component

```typescript
interface RepresentativeTableProps {
  data: RepresentativeMetricWithAverage[];
  showTotal?: boolean;
  totalData?: {
    count: number;
    rate: number;
    fiscalYearMonthlyAverage: number;
  };
}
```

**機能:**
- 担当者別データをテーブル形式で表示
- 列: 担当者名、件数、割合、月平均
- 割合の高い順にソート
- 合計行を太字で表示
- 空データの場合は「データなし」表示

## Data Models

既存のデータモデルを使用:

```typescript
interface EnhancedPerformanceMetrics {
  month: string;
  visitAppraisalRate: {
    currentValue: number;
    fiscalYearMonthlyAverage: number;
    target: 28;
  };
  exclusiveContracts: {
    byRepresentative: RepresentativeMetricWithAverage[];
    total: {
      count: number;
      rate: number;
      fiscalYearMonthlyAverage: number;
      target: 48;
    };
  };
  competitorLossUnvisited: {
    currentValue: number;
    fiscalYearMonthlyAverage: number;
    previousYearMonthlyAverage: number;
  };
  competitorLossVisited: {
    byRepresentative: RepresentativeMetricWithAverage[];
    total: {
      count: number;
      rate: number;
      fiscalYearMonthlyAverage: number;
      previousYearMonthlyAverage: number;
    };
  };
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: カード表示の完全性
*For any* 実績データ、すべての指標（訪問査定取得割合、専任件数、他決割合未訪問、他決割合訪問済み）がカード形式で表示される
**Validates: Requirements 1.1**

### Property 2: プログレスバーの正確性
*For any* 目標値を持つ指標、プログレスバーの幅が (currentValue / target * 100) に正確に対応する
**Validates: Requirements 1.2**

### Property 3: カラーコーディングの一貫性
*For any* 達成度、以下のルールに従って色が適用される：
- 達成度 >= 100% → 緑
- 80% <= 達成度 < 100% → 黄
- 達成度 < 80% → 赤
**Validates: Requirements 1.3**

### Property 4: 比較インジケーターの正確性
*For any* 現在値と平均値のペア、以下のルールに従ってアイコンが表示される：
- 現在値 > 平均値 + 0.5 → 上向き矢印（緑）
- 現在値 < 平均値 - 0.5 → 下向き矢印（赤）
- その他 → 横向き矢印（グレー）
**Validates: Requirements 2.2, 2.3, 2.4**

### Property 5: テーブルソートの正確性
*For any* 担当者別データ、テーブルの行が割合の降順にソートされている
**Validates: Requirements 3.3**

### Property 6: レスポンシブレイアウトの適応性
*For any* 画面幅、以下のレイアウトが適用される：
- 幅 < 768px → 1列レイアウト
- 768px <= 幅 < 1024px → 2列グリッド
- 幅 >= 1024px → 2列グリッド（最大幅制限付き）
**Validates: Requirements 4.1, 4.2, 4.3**

## Error Handling

### データ取得エラー
- API エラー時は既存のエラー表示を維持
- 再試行ボタンを提供

### データ欠損
- 担当者データが空の場合は「データなし」を表示
- 目標値がない場合はプログレスバーを非表示

### 計算エラー
- ゼロ除算を防ぐため、分母が0の場合は0%として扱う
- NaN や Infinity は0として扱う

## Testing Strategy

### Unit Tests

1. **MetricCard コンポーネント**
   - 正しくpropsを受け取って表示する
   - 目標値がない場合はプログレスバーを表示しない
   - 子要素を正しくレンダリングする

2. **ProgressBar コンポーネント**
   - 達成度に応じた正しい幅を計算する
   - 達成度に応じた正しい色を適用する
   - 100%を超える場合は100%幅で表示する

3. **ComparisonIndicator コンポーネント**
   - 差分に応じた正しいアイコンを表示する
   - 差分に応じた正しい色を適用する
   - 数値を正しくフォーマットする

4. **RepresentativeTable コンポーネント**
   - データを割合の降順にソートする
   - 合計行を正しく表示する
   - 空データの場合は「データなし」を表示する

### Integration Tests

1. PerformanceMetricsSection が各サブコンポーネントを正しく統合する
2. API レスポンスが正しく各コンポーネントに渡される
3. レスポンシブレイアウトが画面サイズに応じて切り替わる

### Visual Regression Tests

1. 各指標カードのスナップショット
2. プログレスバーの各状態（緑/黄/赤）
3. テーブル表示のスナップショット
4. モバイル/タブレット/デスクトップレイアウト

## UI/UX Design

### Layout

```
┌─────────────────────────────────────────────┐
│ 実績                    [月選択: 2025-12]   │
├─────────────────────────────────────────────┤
│ ┌──────────────┐  ┌──────────────┐         │
│ │訪問査定取得  │  │専任件数      │         │
│ │61.5%        │  │15件 (93.8%) │         │
│ │━━━━━━━━━━  │  │━━━━━━━━━━  │         │
│ │↑ 月平均33.6%│  │↑ 月平均95.1%│         │
│ │目標: 28%    │  │目標: 48%    │         │
│ └──────────────┘  └──────────────┘         │
│                                             │
│ ┌──────────────┐  ┌──────────────┐         │
│ │他決(未訪問)  │  │他決(訪問済)  │         │
│ │15.0%        │  │7.7%         │         │
│ │━━━━━━━━━━  │  │━━━━━━━━━━  │         │
│ │↑ 月平均7.8% │  │↓ 月平均19.6%│         │
│ │前年度: 6.9% │  │前年度: 32.5%│         │
│ └──────────────┘  └──────────────┘         │
└─────────────────────────────────────────────┘
```

### Color Scheme

- **成功/良好**: `text-green-600`, `bg-green-500`
- **警告/注意**: `text-yellow-600`, `bg-yellow-500`
- **エラー/要改善**: `text-red-600`, `bg-red-500`
- **中立**: `text-gray-600`, `bg-gray-300`
- **背景**: `bg-white`, `bg-gray-50`

### Typography

- **カードタイトル**: `text-sm font-medium text-gray-700`
- **メイン数値**: `text-3xl font-bold`
- **サブ数値**: `text-sm text-gray-600`
- **テーブルヘッダー**: `text-xs font-semibold text-gray-700 uppercase`

### Spacing

- カード間のギャップ: `gap-4` (1rem)
- カード内パディング: `p-6` (1.5rem)
- セクション間マージン: `space-y-4` (1rem)

## Implementation Notes

### Tailwind CSS Classes

プログレスバーの実装例:
```tsx
<div className="w-full bg-gray-200 rounded-full h-2.5">
  <div 
    className={`h-2.5 rounded-full ${colorClass}`}
    style={{ width: `${Math.min(percentage, 100)}%` }}
  />
</div>
```

### アイコンの実装

React Icons ライブラリを使用:
- 上向き: `<FiTrendingUp className="text-green-600" />`
- 下向き: `<FiTrendingDown className="text-red-600" />`
- 横ばい: `<FiMinus className="text-gray-600" />`

### レスポンシブグリッド

```tsx
<div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-6xl">
  {/* カード */}
</div>
```

## Performance Considerations

- コンポーネントの再レンダリングを最小化するため、React.memo を使用
- 大きなテーブルの場合は仮想化を検討（現状は不要）
- 画像やアイコンは SVG を使用して軽量化

## Accessibility

- プログレスバーに `role="progressbar"` と `aria-valuenow` を設定
- カラーコーディングだけでなく、アイコンも併用
- キーボードナビゲーション対応
- スクリーンリーダー用の適切な aria-label を設定
