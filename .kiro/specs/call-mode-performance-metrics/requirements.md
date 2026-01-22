# Requirements Document

## Introduction

通話モードページに「実績」セクションを追加し、月次の営業実績を可視化する機能を実装します。このセクションでは、訪問査定取得数、専任媒介件数、他決割合などの重要な営業指標を表示します。

## Glossary

- **通話モードページ (Call Mode Page)**: 売主への架電業務を効率化するためのページ
- **実績セクション (Performance Section)**: 月次の営業実績を表示するセクション
- **訪問査定 (Visit Appraisal)**: 物件の現地訪問による査定
- **専任媒介 (Exclusive Agency)**: 専任媒介契約
- **他決 (Lost to Competitor)**: 他社で決定した案件
- **確度 (Confidence Level)**: 案件の成約可能性を示す指標
- **営担 (Sales Representative)**: 営業担当者
- **状況（当社）(Our Company Status)**: 当社における案件の状況

## Requirements

### Requirement 1

**User Story:** As a sales manager, I want to view monthly visit appraisal acquisition metrics, so that I can track the team's performance in securing property visits.

#### Acceptance Criteria

1. WHEN the performance section is displayed THEN the system SHALL show the count of visit appraisals acquired in the current month
2. WHEN counting visit appraisals THEN the system SHALL reference the "訪問日" (visit date) field to determine if a visit occurred in the current month
3. WHEN the visit date falls within the current month THEN the system SHALL increment the visit appraisal count by one
4. WHEN the visit date is null or outside the current month THEN the system SHALL exclude that record from the count
5. WHEN displaying the count THEN the system SHALL show the numeric value with appropriate formatting

### Requirement 2

**User Story:** As a sales manager, I want to view the visit appraisal acquisition rate, so that I can understand the conversion rate from inquiries to visits.

#### Acceptance Criteria

1. WHEN calculating the visit appraisal acquisition rate THEN the system SHALL divide the monthly visit appraisal count by the monthly inquiry count
2. WHEN counting monthly inquiries THEN the system SHALL exclude records where "確度" (confidence level) equals "D"
3. WHEN counting monthly inquiries THEN the system SHALL exclude records where "確度" (confidence level) equals "ダブり" (duplicate)
4. WHEN the monthly inquiry count is zero THEN the system SHALL display the rate as 0% or N/A
5. WHEN displaying the rate THEN the system SHALL format the value as a percentage with appropriate decimal places

### Requirement 3

**User Story:** As a sales manager, I want to view exclusive agency contract counts by sales representative, so that I can track individual performance in securing exclusive contracts.

#### Acceptance Criteria

1. WHEN displaying exclusive agency counts THEN the system SHALL show counts grouped by "営担" (sales representative)
2. WHEN counting exclusive agency contracts THEN the system SHALL include only records where "状況（当社）" (our company status) equals "専任媒介" (exclusive agency)
3. WHEN counting exclusive agency contracts THEN the system SHALL filter by the current month based on the contract date
4. WHEN displaying counts THEN the system SHALL show each representative's name followed by their count and percentage
5. WHEN calculating the exclusive agency rate THEN the system SHALL divide the representative's exclusive count by their visit count for the month
6. WHEN displaying the format THEN the system SHALL use the pattern "山本：３（１５％）　裏：２（７％）角井：５（２０％）計：１０（●●％）"
7. WHEN calculating the total percentage THEN the system SHALL divide the total exclusive count by the total visit count

### Requirement 4

**User Story:** As a sales manager, I want to view the competitor loss rate for unvisited properties, so that I can identify opportunities lost before site visits.

#### Acceptance Criteria

1. WHEN calculating the unvisited competitor loss rate THEN the system SHALL count records where "営担" (sales representative) is empty
2. WHEN calculating the unvisited competitor loss rate THEN the system SHALL count records where "状況（当社）" (our company status) equals "他決→追客" (lost to competitor - follow up)
3. WHEN calculating the unvisited competitor loss rate THEN the system SHALL count records where "状況（当社）" (our company status) equals "他決→追客不要" (lost to competitor - no follow up needed)
4. WHEN counting for the denominator THEN the system SHALL use the monthly inquiry count
5. WHEN counting for the denominator THEN the system SHALL exclude records where "確度" (confidence level) equals "D"
6. WHEN counting for the denominator THEN the system SHALL exclude records where "確度" (confidence level) equals "ダブり" (duplicate)
7. WHEN counting for the denominator THEN the system SHALL exclude records that have visit counts
8. WHEN the denominator is zero THEN the system SHALL display the rate as 0% or N/A
9. WHEN displaying the rate THEN the system SHALL format the value as a percentage

### Requirement 5

**User Story:** As a sales manager, I want to view the competitor loss rate for visited properties by sales representative, so that I can identify which representatives are losing deals after site visits.

#### Acceptance Criteria

1. WHEN calculating the visited competitor loss rate THEN the system SHALL count records where "状況（当社）" (our company status) contains the word "他決" (lost to competitor) as the numerator
2. WHEN calculating the visited competitor loss rate THEN the system SHALL use "契約年月 他決は分かった時点" (contract year month - when competitor loss was identified) to determine if the loss occurred in the target month
3. WHEN calculating the visited competitor loss rate THEN the system SHALL group results by "営担" (sales representative)
4. WHEN calculating the denominator for each representative THEN the system SHALL count all records where "訪問日" (visit_date) falls within the target month and matches the representative's "営担" value
5. WHEN calculating the denominator for each representative THEN the system SHALL subtract the count of records where "契約年月 他決は分かった時点" (contract_year_month) is in the target month AND "状況（当社）" (our company status) equals "一般媒介" (general agency) from the total count
6. WHEN calculating the rate for each representative THEN the system SHALL divide their competitor loss count by (their visit count minus their general agency count)
7. WHEN displaying the format THEN the system SHALL use the pattern "山本：３（１５％）　裏：２（７％）角井：５（２０％）計：１０（●●％）"
8. WHEN calculating the total percentage THEN the system SHALL divide the total competitor loss count by (the total visit count minus the total general agency count)
9. WHEN a representative has zero valid records (after subtracting general agency) THEN the system SHALL display their rate as 0% or N/A

**Example Calculation:**
For November 2025, assignee I:
- Numerator: 2 (records with "他決" in status where contract_year_month is November)
- Total visit count: 12 (all records for assignee I where visit_date is November)
- General agency count: 1 (records where contract_year_month is November and status = "一般媒介")
- Denominator: 12 - 1 = 11
- Result: 2 ÷ 11 ≈ 18.2%

For November 2025, assignee U:
- Numerator: 1 (records with "他決" in status where contract_year_month is November)
- Total visit count: 9 (all records for assignee U where visit_date is November)
- General agency count: 1 (records where contract_year_month is November and status = "一般媒介")
- Denominator: 9 - 1 = 8
- Result: 1 ÷ 8 ≈ 12.5%

### Requirement 6

**User Story:** As a user, I want the performance section to automatically update based on the selected month, so that I can view historical performance data.

#### Acceptance Criteria

1. WHEN a user selects a different month THEN the system SHALL recalculate all metrics for the selected month
2. WHEN the month changes THEN the system SHALL update all displayed counts and percentages
3. WHEN loading the page THEN the system SHALL default to the current month
4. WHEN the data is loading THEN the system SHALL display a loading indicator
5. WHEN the data fails to load THEN the system SHALL display an appropriate error message

### Requirement 7

**User Story:** As a user, I want the performance metrics to be clearly organized and easy to read, so that I can quickly understand the team's performance.

#### Acceptance Criteria

1. WHEN displaying the performance section THEN the system SHALL use a clear heading "実績" (Performance)
2. WHEN displaying each metric THEN the system SHALL use descriptive labels
3. WHEN displaying counts and percentages THEN the system SHALL use consistent formatting
4. WHEN displaying representative-level data THEN the system SHALL align the data in a readable format
5. WHEN the section contains no data THEN the system SHALL display an appropriate message indicating no data is available
