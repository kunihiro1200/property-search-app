# Requirements Document

## Introduction

本機能は、売主情報管理システムに「状況（売主）」フィールドを追加し、売主の現在の状況を9つの選択肢から選択・記録できるようにするものです。これにより、売主の物件状況をより詳細に把握し、適切なフォローアップを行うことが可能になります。

## Glossary

- **System**: 売主情報管理システム
- **Seller**: 不動産の売主
- **Seller Status Field**: 売主の状況を示すフィールド（状況（売主））
- **Status Options**: 状況の選択肢（居空更賃他古有駐事の9つ）
- **User**: システムを使用する従業員

## Requirements

### Requirement 1

**User Story:** As a user, I want to select a seller status from predefined options, so that I can accurately record the current situation of the seller's property.

#### Acceptance Criteria

1. WHEN a user views the seller information form THEN the System SHALL display a "状況（売主）" field with a dropdown selector
2. WHEN a user clicks the status dropdown THEN the System SHALL display nine options: "居", "空", "更", "賃", "他", "古", "有", "駐", "事"
3. WHEN a user selects a status option THEN the System SHALL save the selected value to the database
4. WHEN a user views an existing seller record THEN the System SHALL display the previously selected status if one exists
5. WHERE the status field is not yet set THEN the System SHALL display an empty or default state

### Requirement 2

**User Story:** As a user, I want the seller status to be stored persistently, so that the information is available for future reference and analysis.

#### Acceptance Criteria

1. WHEN a user saves a seller record with a status THEN the System SHALL persist the status value to the sellers table
2. WHEN the database stores the status THEN the System SHALL use a VARCHAR or TEXT column to accommodate the status values
3. WHEN a user updates an existing seller's status THEN the System SHALL overwrite the previous value with the new selection
4. WHEN querying seller records THEN the System SHALL return the status field along with other seller information

### Requirement 3

**User Story:** As a user, I want to view the seller status in the seller list and detail pages, so that I can quickly understand each seller's situation.

#### Acceptance Criteria

1. WHEN a user views the sellers list page THEN the System SHALL display the status field for each seller in the table
2. WHEN a user views a seller detail page THEN the System SHALL display the status field in the seller information section
3. WHEN displaying the status THEN the System SHALL show the selected status value clearly
4. WHERE no status is set THEN the System SHALL display an appropriate empty state indicator

### Requirement 4

**User Story:** As a developer, I want the status field to be properly typed and validated, so that data integrity is maintained throughout the system.

#### Acceptance Criteria

1. WHEN the backend receives a status value THEN the System SHALL validate that it is one of the nine allowed options
2. WHEN an invalid status value is submitted THEN the System SHALL reject the request and return an appropriate error message
3. WHEN the frontend sends status data THEN the System SHALL use proper TypeScript types for the status field
4. WHEN the API returns seller data THEN the System SHALL include the status field in the response type definition
