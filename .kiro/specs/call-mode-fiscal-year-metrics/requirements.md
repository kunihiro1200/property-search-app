# Requirements Document

## Introduction

通話モードページの実績セクションにおいて、会社の年度（10月～9月）に基づいた月平均計算を実装する。現在の実装では暦年ベースの計算となっているが、これを年度ベース（10月開始）に変更し、年度開始月から現在月までの月平均を正確に表示する。

## Glossary

- **年度 (Fiscal Year)**: 当社の会計年度。10月1日から翌年9月30日までの期間（例：2024年10月～2025年9月）
- **月平均 (Monthly Average)**: 年度開始月（10月）から現在月までの期間における平均値
- **実績セクション (Performance Metrics Section)**: 通話モードページに表示される業績指標のセクション
- **訪問査定取得割合 (Visit Appraisal Acquisition Rate)**: 訪問を実施した案件のうち、査定を取得できた割合
- **専任件数 (Exclusive Contract Count)**: 専任媒介契約を締結した件数
- **専任割合 (Exclusive Contract Rate)**: 全契約のうち専任媒介契約の割合
- **他決割合 (Competitor Loss Rate)**: 他社に決定された案件の割合
- **担当者 (Assignee)**: 案件を担当する従業員（I、U、Yなどのイニシャルで識別）

## Requirements

### Requirement 1

**User Story:** As a manager, I want to see performance metrics calculated based on our fiscal year (October to September), so that I can accurately track team performance aligned with our business cycle.

#### Acceptance Criteria

1. WHEN the system calculates monthly averages THEN the system SHALL use the fiscal year period starting from October 1st
2. WHEN the current date is in December THEN the system SHALL calculate monthly averages from October to December (3 months)
3. WHEN the current date is in September THEN the system SHALL calculate monthly averages from October to September (12 months)
4. WHEN the current date is in January THEN the system SHALL calculate monthly averages from October of the previous year to January (4 months)
5. WHEN displaying any metric with monthly average THEN the system SHALL clearly indicate the calculation period

### Requirement 2

**User Story:** As a user viewing the performance metrics section, I want to see visit appraisal acquisition rates with monthly averages, so that I can understand our current performance against targets.

#### Acceptance Criteria

1. WHEN displaying visit appraisal acquisition rate THEN the system SHALL show the current rate as a percentage
2. WHEN displaying visit appraisal acquisition rate THEN the system SHALL show the fiscal year monthly average as a percentage
3. WHEN displaying visit appraisal acquisition rate THEN the system SHALL show the fixed target of 28%
4. WHEN calculating monthly average THEN the system SHALL use data from the fiscal year start month to the current month
5. THE system SHALL display the format: "訪問査定取得割合：XX.X％（月平均XX.X％、目標28％）"

### Requirement 3

**User Story:** As a user viewing the performance metrics section, I want to see exclusive contract counts and rates by assignee with monthly averages, so that I can track individual and team performance.

#### Acceptance Criteria

1. WHEN displaying exclusive contract metrics THEN the system SHALL show counts and rates for assignees I, U, and Y separately
2. WHEN displaying exclusive contract metrics THEN the system SHALL show a total count and rate
3. WHEN displaying exclusive contract data for each assignee THEN the system SHALL show the current count, current rate, and fiscal year monthly average rate
4. WHEN displaying total exclusive contract data THEN the system SHALL show the fixed target of 48%
5. THE system SHALL display the format: "専任件数（専任割合）:I：XX（XX.X%、月平均XX.X％）　U：XX（XX.X%、月平均XX.X％）　Y：XX（XX.X%、月平均XX.X％）計：XX（XX.X%、月平均XX.X％、目標48％）"

### Requirement 4

**User Story:** As a user viewing the performance metrics section, I want to see competitor loss rates for unvisited properties with monthly and previous year averages, so that I can identify trends and improvement areas.

#### Acceptance Criteria

1. WHEN displaying competitor loss rate for unvisited properties THEN the system SHALL show the current rate as a percentage
2. WHEN displaying competitor loss rate for unvisited properties THEN the system SHALL show the fiscal year monthly average as a percentage
3. WHEN displaying competitor loss rate for unvisited properties THEN the system SHALL show the previous fiscal year monthly average as a percentage
4. WHEN calculating previous year average THEN the system SHALL use data from the same period in the previous fiscal year
5. THE system SHALL display the format: "他決割合（未訪問）：XX.X％（月平均XX.X％、前年度平均XX.X％）"

### Requirement 5

**User Story:** As a user viewing the performance metrics section, I want to see competitor loss rates for visited properties by assignee with monthly and previous year averages, so that I can evaluate follow-up effectiveness.

#### Acceptance Criteria

1. WHEN displaying competitor loss rate for visited properties THEN the system SHALL show counts and rates for assignees I, U, and Y separately
2. WHEN displaying competitor loss rate for visited properties THEN the system SHALL show a total count and rate
3. WHEN displaying competitor loss data for each assignee THEN the system SHALL show the current count, current rate, and fiscal year monthly average rate
4. WHEN displaying total competitor loss data THEN the system SHALL show the previous fiscal year monthly average rate
5. THE system SHALL display the format: "他決割合（訪問済み）：I：XX（XX.X%、月平均XX.X％）　U：XX（XX.X%、月平均XX.X％）　Y：XX（XX.X%、月平均XX.X％）計：XX（XX.X%、月平均XX.X％、前年度月平均XX.X％）"

### Requirement 6

**User Story:** As a developer, I want the fiscal year calculation logic to be centralized and reusable, so that it can be consistently applied across different metrics.

#### Acceptance Criteria

1. THE system SHALL provide a utility function to determine the current fiscal year start and end dates
2. THE system SHALL provide a utility function to calculate the number of months elapsed in the current fiscal year
3. THE system SHALL provide a utility function to get the date range for the same period in the previous fiscal year
4. WHEN any metric calculation requires fiscal year data THEN the system SHALL use these centralized utility functions
5. THE utility functions SHALL handle edge cases such as the transition between fiscal years correctly
