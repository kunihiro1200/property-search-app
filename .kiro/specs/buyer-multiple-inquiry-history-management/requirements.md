# Requirements Document

## Introduction

買主が複数回問い合わせを行った場合、または同時に複数物件に問い合わせた場合の履歴管理と表示を改善するシステム。現在、同一人物の複数問い合わせは「過去買主リスト」として1つの行にまとめられているが、UIでの表示や内覧結果の記録、メール配信時の情報表示が不十分である。

## Glossary

- **Buyer**: 買主。物件に問い合わせを行う顧客
- **Buyer_Number**: 買主番号。各問い合わせに付与される一意の識別番号
- **Primary_Buyer_Record**: 主買主レコード。同一人物の最新の買主番号で管理されるレコード
- **Past_Buyer_List**: 過去買主リスト。同一人物の過去の買主番号を記録するカラム
- **Property_Inquiry**: 物件問い合わせ。買主が特定の物件に対して行う問い合わせ
- **Viewing_Result**: 内覧結果。物件を実際に見学した結果の記録
- **Email_Distribution**: メール配信。買主に物件情報をメールで送信する機能
- **System**: 買主管理システム

## Requirements

### Requirement 1

**User Story:** As a user, I want to see all past buyer numbers for the same person in the buyer detail page, so that I can understand the complete inquiry history.

#### Acceptance Criteria

1. WHEN a user views a buyer detail page, THE System SHALL display all past buyer numbers from the "past buyer list" column
2. WHEN displaying past buyer numbers, THE System SHALL show each past buyer number as a clickable link or expandable item
3. WHEN a user clicks on a past buyer number, THE System SHALL display the inquiry details associated with that buyer number
4. THE System SHALL display the property number, inquiry date, and inquiry source for each past buyer number

### Requirement 2

**User Story:** As a user, I want to record viewing results for any buyer number (including past ones), so that I can track all property viewing activities accurately.

#### Acceptance Criteria

1. WHEN a user records a viewing result, THE System SHALL allow selection of any buyer number (current or past) for that person
2. WHEN a viewing result is recorded for a past buyer number, THE System SHALL link the result to the specific property inquiry associated with that buyer number
3. WHEN viewing the buyer detail page, THE System SHALL display all viewing results grouped by buyer number
4. THE System SHALL display viewing results with the associated property number and buyer number clearly indicated

### Requirement 3

**User Story:** As a user, I want to see all property inquiries for a buyer organized clearly, so that I can understand which properties they are interested in.

#### Acceptance Criteria

1. WHEN a buyer has multiple property inquiries, THE System SHALL display them in a structured list format
2. WHEN displaying multiple inquiries, THE System SHALL show property number, inquiry date, and current status for each inquiry
3. THE System SHALL group inquiries by buyer number to distinguish between different inquiry instances
4. THE System SHALL provide a visual indicator when a buyer has inquiries across multiple buyer numbers

### Requirement 4

**User Story:** As a user, I want to send emails with property information for multiple properties to a single buyer, so that I can efficiently communicate about all relevant properties.

#### Acceptance Criteria

1. WHEN a buyer has inquiries for multiple properties, THE System SHALL allow selection of multiple properties for a single email
2. WHEN generating an email for multiple properties, THE System SHALL automatically include property-specific information for each selected property
3. WHEN displaying property information in the email, THE System SHALL clearly separate information for each property with property number as a header
4. THE System SHALL include the transmission notes (伝達事項) for each property in the email body
5. WHEN formatting the email, THE System SHALL organize multiple properties in a readable structure with clear visual separation

### Requirement 5

**User Story:** As a user, I want the system to automatically retrieve and format property-specific transmission notes, so that I don't have to manually copy information for each property.

#### Acceptance Criteria

1. WHEN generating an email for a property, THE System SHALL automatically retrieve the transmission notes associated with that property number
2. WHEN multiple properties are selected, THE System SHALL retrieve transmission notes for all selected properties
3. THE System SHALL format each property's information as a distinct section in the email body
4. THE System SHALL include property number, property address, and transmission notes for each property section
5. WHEN transmission notes are empty for a property, THE System SHALL display a placeholder or skip that section

### Requirement 6

**User Story:** As a user, I want to understand the relationship between different buyer numbers for the same person, so that I can avoid confusion when managing their inquiries.

#### Acceptance Criteria

1. WHEN viewing a buyer record, THE System SHALL clearly indicate if this buyer has past buyer numbers
2. THE System SHALL display a count of past buyer numbers in a prominent location
3. WHEN a buyer has past inquiries, THE System SHALL provide a visual indicator (badge, icon, or label)
4. THE System SHALL allow users to quickly navigate between related buyer numbers for the same person

## Notes

- 現在のデータ構造では、最新の買主番号のみがデータベースに保存され、過去の買主番号は「過去買主リスト」カラムに履歴として残されている
- この設計は維持しつつ、UIレイヤーでの表示と操作性を改善する
- メール配信機能は既存のテンプレートシステムを拡張する形で実装する
