# Requirements Document

## Introduction

コールモードページの専任件数の割合の計算式を修正し、正しい計算方法とその説明を表示する機能を実装します。

## Glossary

- **System**: コールモードページのパフォーマンスメトリクス表示システム
- **専任件数**: contract_year_month基準で「専任媒介」のステータスを持つ売主の数
- **訪問数**: visit_date基準でカウントされる訪問の総数
- **一般媒介数**: contract_year_month基準で「一般媒介」のステータスを持つ売主の数
- **専任件数の割合**: 専任件数を(訪問数 - 一般媒介数)で割った百分率

## Requirements

### Requirement 1: 専任件数の割合の計算式修正

**User Story:** As a 営業担当者, I want to see the correct exclusive contract rate calculation, so that I can accurately evaluate my performance metrics.

#### Acceptance Criteria

1. WHEN calculating 専任件数の割合 THEN THE System SHALL use the formula: 専任件数 ÷ (訪問数 - 一般媒介数) × 100
2. WHEN 専任件数 is counted THEN THE System SHALL use contract_year_month as the date basis and filter by status = '専任媒介'
3. WHEN 訪問数 is counted THEN THE System SHALL use visit_date as the date basis
4. WHEN 一般媒介数 is counted THEN THE System SHALL use contract_year_month as the date basis and filter by status = '一般媒介'
5. WHEN (訪問数 - 一般媒介数) equals zero THEN THE System SHALL display "N/A" or "0%" to avoid division by zero

### Requirement 2: 計算式の表示

**User Story:** As a 営業担当者, I want to see how the exclusive contract rate is calculated, so that I can understand the metric better.

#### Acceptance Criteria

1. WHEN displaying 専任件数の割合 THEN THE System SHALL show a descriptive label at the top explaining the calculation
2. THE descriptive label SHALL read: "専任件数 ÷ (訪問数 - 一般媒介数)"
3. WHEN displaying 専任件数の割合 THEN THE System SHALL show the calculation formula with actual numbers below the percentage
4. THE formula with numbers SHALL be formatted as: "3 ÷ (12 - 1) = 27.3%" for example
5. THE descriptive label SHALL be displayed prominently above the metric value
6. THE formula with actual numbers SHALL be visible but less prominent than the descriptive label
7. THE display SHALL follow the format: descriptive label (top) → percentage value (middle) → formula with numbers (bottom)

### Requirement 3: データ整合性の確保

**User Story:** As a システム管理者, I want to ensure data consistency across different date bases, so that metrics are calculated correctly.

#### Acceptance Criteria

1. WHEN querying 専任件数 THEN THE System SHALL filter by contract_year_month within the selected date range
2. WHEN querying 訪問数 THEN THE System SHALL filter by visit_date within the selected date range
3. WHEN querying 一般媒介数 THEN THE System SHALL filter by contract_year_month within the selected date range
4. THE System SHALL handle cases where visit_date and contract_year_month are in different months
5. THE System SHALL ensure all counts are based on non-deleted records (deleted_at IS NULL)

### Requirement 4: 既存メトリクスとの整合性

**User Story:** As a 営業担当者, I want the exclusive contract rate to align with other metrics, so that the dashboard is consistent.

#### Acceptance Criteria

1. THE System SHALL use the same date range selection for all metrics on the page
2. THE System SHALL use the same employee filter for all metrics on the page
3. WHEN displaying 専任件数の割合 THEN THE System SHALL use the same styling as other percentage metrics
4. THE calculation SHALL be consistent with the 他決割合（訪問済み）calculation logic for the denominator
5. THE System SHALL update all metrics simultaneously when filters change
