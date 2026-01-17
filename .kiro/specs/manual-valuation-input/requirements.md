# Requirements Document

## Introduction

通話モードページの査定計算セクションにおいて、マンション物件に対して固定資産税路線価を使用せずに、査定額1、査定額2、査定額3を直接手入力できる機能を追加します。この手入力された査定額は、自動計算された査定額よりも優先され、メール送信や通話モード上部の表示など、システム全体で使用されます。また、この手入力フィールドはマンション以外の物件種別でも常に表示され、入力があれば自動計算よりも優先されます。

## Glossary

- **System**: 不動産査定管理システム
- **User**: システムを使用する不動産営業担当者
- **Seller**: 不動産売却を検討している顧客
- **Property**: 査定対象の不動産物件
- **Valuation Amount**: 査定額（査定額1、査定額2、査定額3の3つの金額）
- **Manual Valuation**: 手入力された査定額
- **Auto-calculated Valuation**: 固定資産税路線価から自動計算された査定額
- **Call Mode Page**: 通話モードページ（売主との通話中に使用する画面）
- **Valuation Section**: 査定計算セクション（通話モードページ内の査定額を表示・編集するエリア）

## Requirements

### Requirement 1

**User Story:** As a User, I want to manually input valuation amounts for apartment properties, so that I can provide accurate valuations without relying on fixed asset tax road prices.

#### Acceptance Criteria

1. WHEN a User views the Valuation Section THEN the System SHALL display three input fields for manual valuation amounts (査定額1, 査定額2, 査定額3)
2. WHEN a User enters values into the manual valuation input fields THEN the System SHALL accept numeric values representing Japanese Yen
3. WHEN a User saves manual valuation amounts THEN the System SHALL store these values in the database associated with the Seller record
4. WHEN manual valuation amounts exist for a Seller THEN the System SHALL display these amounts in the Valuation Section
5. WHEN a User clears manual valuation amounts THEN the System SHALL remove these values from the database

### Requirement 2

**User Story:** As a User, I want manual valuation amounts to take priority over auto-calculated amounts, so that my expert judgment is reflected in all system outputs.

#### Acceptance Criteria

1. WHEN manual valuation amounts exist for a Seller THEN the System SHALL use manual valuation amounts instead of auto-calculated valuation amounts for all displays
2. WHEN manual valuation amounts exist for a Seller THEN the System SHALL use manual valuation amounts in the Call Mode Page header display
3. WHEN manual valuation amounts exist for a Seller THEN the System SHALL use manual valuation amounts in email templates
4. WHEN manual valuation amounts exist for a Seller THEN the System SHALL use manual valuation amounts in SMS templates
5. WHEN manual valuation amounts do not exist for a Seller THEN the System SHALL fall back to auto-calculated valuation amounts

### Requirement 3

**User Story:** As a User, I want the manual valuation input fields to be available for all property types, so that I can override automatic calculations when necessary regardless of property type.

#### Acceptance Criteria

1. WHEN a User views the Valuation Section for any Property type THEN the System SHALL display manual valuation input fields
2. WHEN a Property type is apartment THEN the System SHALL display manual valuation input fields without requiring fixed asset tax road price input
3. WHEN a Property type is not apartment THEN the System SHALL display both fixed asset tax road price input and manual valuation input fields
4. WHEN a User enters manual valuation amounts for any Property type THEN the System SHALL prioritize manual values over auto-calculated values
5. WHEN a User views the Valuation Section THEN the System SHALL clearly indicate which valuation source is being used (manual or auto-calculated)

### Requirement 4

**User Story:** As a User, I want to see clear visual distinction between manual and auto-calculated valuations, so that I understand the source of the displayed amounts.

#### Acceptance Criteria

1. WHEN manual valuation amounts are displayed THEN the System SHALL show a visual indicator that these are manually entered values
2. WHEN auto-calculated valuation amounts are displayed THEN the System SHALL show a visual indicator that these are automatically calculated values
3. WHEN a User is editing valuation amounts THEN the System SHALL display labels that clearly distinguish manual input fields from auto-calculation fields
4. WHEN manual valuation amounts override auto-calculated amounts THEN the System SHALL display a message indicating that manual values are being used
5. WHEN the Valuation Section is in view mode THEN the System SHALL display the valuation source (manual or auto-calculated) alongside the amounts

### Requirement 5

**User Story:** As a User, I want the system to track who entered manual valuation amounts and when, so that there is accountability and audit trail for valuation decisions.

#### Acceptance Criteria

1. WHEN a User saves manual valuation amounts THEN the System SHALL record the User's identity as the valuation assignee
2. WHEN a User saves manual valuation amounts THEN the System SHALL record the timestamp of the entry
3. WHEN manual valuation amounts are displayed THEN the System SHALL show the valuation assignee name
4. WHEN manual valuation amounts are displayed THEN the System SHALL show the timestamp of when they were entered
5. WHEN a User updates existing manual valuation amounts THEN the System SHALL update the valuation assignee and timestamp to reflect the most recent change

### Requirement 6

**User Story:** As a User, I want to easily switch between manual input and auto-calculation modes, so that I can choose the most appropriate valuation method for each property.

#### Acceptance Criteria

1. WHEN a User enters a fixed asset tax road price THEN the System SHALL auto-calculate valuation amounts after a 1-second delay
2. WHEN a User enters manual valuation amounts THEN the System SHALL not trigger auto-calculation
3. WHEN a User clears manual valuation amounts THEN the System SHALL display auto-calculated amounts if they exist
4. WHEN a User enters both fixed asset tax road price and manual valuation amounts THEN the System SHALL prioritize manual valuation amounts
5. WHEN the Valuation Section is in edit mode THEN the System SHALL allow the User to switch between manual and auto-calculated values by clearing or entering data in the respective fields
