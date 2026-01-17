# Requirements Document

## Introduction

通話モードページのステータス更新セクションに「除外日」フィールドを追加し、反響日付とサイトに基づいて自動計算する機能を実装します。除外日は次電日の上に配置され、サイトごとの異なる計算ルールに従って自動的に設定されます。

## Glossary

- **System**: 売主管理システム
- **User**: システムを使用する営業担当者
- **CallModePage**: 通話モードページ（売主情報を編集・更新するページ）
- **ExclusionDate**: 除外日（売主を追客対象から除外する日付）
- **InquiryDate**: 反響日付（売主からの最初の問い合わせ日）
- **Site**: サイト（反響元のサイト識別子：Y, ウ, L, す, a）
- **NextCallDate**: 次電日（次回電話をかける予定日）

## Requirements

### Requirement 1

**User Story:** As a user, I want to see the exclusion date field in the status update section, so that I can know when a seller will be excluded from follow-up.

#### Acceptance Criteria

1. WHEN the CallModePage loads THEN the System SHALL display the exclusion date field in the status update section above the next call date field
2. WHEN the exclusion date field is displayed THEN the System SHALL show it as a read-only date field with a label "除外日"
3. WHEN the exclusion date has a value THEN the System SHALL display the date in YYYY-MM-DD format
4. WHEN the exclusion date is empty THEN the System SHALL display a dash "-" or empty state

### Requirement 2

**User Story:** As a user, I want the exclusion date to be automatically calculated based on inquiry date and site, so that I don't have to manually calculate it.

#### Acceptance Criteria

1. WHEN the inquiry date is within 6 days before today AND the site is "Y" AND the inquiry date is not in the future THEN the System SHALL calculate exclusion date as inquiry date plus 5 days
2. WHEN the inquiry date is within 7 days before today AND the site is "ウ" AND the inquiry date is not in the future THEN the System SHALL calculate exclusion date as inquiry date plus 7 days
3. WHEN the inquiry date is within 5 days before today AND the site is "L" AND the inquiry date is not in the future THEN the System SHALL calculate exclusion date as inquiry date plus 5 days
4. WHEN the inquiry date is within 8 days before today AND the site is "す" AND the inquiry date is not in the future THEN the System SHALL calculate exclusion date as inquiry date plus 9 days
5. WHEN the inquiry date is within 8 days before today AND the site is "a" AND the inquiry date is not in the future THEN the System SHALL calculate exclusion date as inquiry date plus 8 days
6. WHEN none of the above conditions are met THEN the System SHALL set exclusion date to null

### Requirement 3

**User Story:** As a user, I want the exclusion date to be automatically recalculated when seller data is loaded, so that it always reflects the current calculation rules.

#### Acceptance Criteria

1. WHEN the CallModePage loads seller data THEN the System SHALL calculate the exclusion date based on inquiry date and site
2. WHEN the seller data includes inquiry date and site THEN the System SHALL apply the appropriate calculation rule
3. WHEN the calculation results in a valid date THEN the System SHALL store the exclusion date in the seller record
4. WHEN the calculation results in null THEN the System SHALL clear any existing exclusion date value

### Requirement 4

**User Story:** As a developer, I want the exclusion date calculation logic to be implemented in the backend, so that it is consistent across all parts of the system.

#### Acceptance Criteria

1. WHEN the backend receives a seller update request THEN the System SHALL calculate the exclusion date before saving
2. WHEN the backend retrieves seller data THEN the System SHALL include the exclusion date in the response
3. WHEN the exclusion date calculation logic is implemented THEN the System SHALL use the inquiry date and site fields from the seller record
4. WHEN the seller record is updated THEN the System SHALL recalculate the exclusion date automatically

### Requirement 5

**User Story:** As a user, I want the exclusion date field to be properly integrated with the TypeScript type system, so that the application is type-safe.

#### Acceptance Criteria

1. WHEN the Seller type is defined THEN the System SHALL include an optional exclusionDate field of type string or null
2. WHEN the frontend receives seller data THEN the System SHALL properly type the exclusionDate field
3. WHEN the frontend displays the exclusion date THEN the System SHALL handle null values gracefully
4. WHEN the backend processes seller data THEN the System SHALL validate the exclusionDate field type
