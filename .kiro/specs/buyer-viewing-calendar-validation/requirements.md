# Requirements Document

## Introduction

買主リストの内覧ページ（BuyerViewingResultPage）において、「カレンダーで開く」ボタンを押す前に必須フィールドの入力を検証する機能を追加します。これにより、不完全な情報でカレンダー登録が行われることを防ぎ、データの整合性を保ちます。

## Glossary

- **Buyer_Viewing_Page**: 買主リストの内覧結果入力ページ（BuyerViewingResultPage.tsx）
- **Calendar_Button**: 「カレンダーで開く」ボタン
- **Required_Fields**: カレンダー登録前に入力が必須のフィールド群
- **Validation_System**: 必須フィールドの入力状態を検証するシステム
- **Warning_Message**: 未入力フィールドがある場合に表示される警告メッセージ
- **Exclusive_Property**: 専任物件（viewing_typeフィールドを使用）
- **General_Property**: 一般媒介物件（viewing_type_generalフィールドを使用）
- **Follow_Up_Assignee**: 後続担当者（従業員のイニシャル）

## Requirements

### Requirement 1: 必須フィールドの定義

**User Story:** As a user, I want to know which fields are required before opening the calendar, so that I can ensure all necessary information is entered.

#### Acceptance Criteria

1. THE Validation_System SHALL define the following fields as required: 内覧日（最新）, 時間, 内覧形態（専任物件の場合）または内覧形態_一般媒介（一般媒介物件の場合）, 後続担当
2. WHEN a property is an Exclusive_Property, THE Validation_System SHALL require the viewing_type field
3. WHEN a property is a General_Property, THE Validation_System SHALL require the viewing_type_general field
4. THE Validation_System SHALL validate all Required_Fields before allowing calendar access

### Requirement 2: バリデーション実行タイミング

**User Story:** As a user, I want validation to occur when I click the calendar button, so that I receive immediate feedback about missing information.

#### Acceptance Criteria

1. WHEN a user clicks the Calendar_Button, THE Validation_System SHALL check all Required_Fields
2. IF any Required_Fields are empty, THEN THE Validation_System SHALL prevent the calendar from opening
3. IF all Required_Fields are filled, THEN THE Validation_System SHALL allow the calendar to open
4. THE Validation_System SHALL execute validation before any calendar-related actions

### Requirement 3: 警告メッセージの表示

**User Story:** As a user, I want to see clear warning messages about missing fields, so that I know exactly what information needs to be entered.

#### Acceptance Criteria

1. WHEN validation fails, THE Validation_System SHALL display a Warning_Message
2. THE Warning_Message SHALL list all empty Required_Fields
3. WHEN multiple fields are empty, THE Warning_Message SHALL enumerate all missing fields
4. THE Warning_Message SHALL use clear Japanese text (例: "●●が未入力です")
5. THE Warning_Message SHALL be displayed in a user-friendly format (alert, toast, or modal)

### Requirement 4: カレンダーリンクの生成

**User Story:** As a user, I want the calendar to open for the assigned follow-up staff member, so that the viewing appointment is added to the correct person's calendar.

#### Acceptance Criteria

1. WHEN the Calendar_Button is clicked and validation passes, THE Buyer_Viewing_Page SHALL generate a calendar link for the Follow_Up_Assignee
2. THE Buyer_Viewing_Page SHALL use the Follow_Up_Assignee's email address in the calendar link
3. THE Buyer_Viewing_Page SHALL include the src parameter in the Google Calendar URL to specify the target calendar
4. THE Buyer_Viewing_Page SHALL include viewing date, time, and property information in the calendar event

### Requirement 5: UI状態管理

**User Story:** As a user, I want the calendar button to be clearly visible only when appropriate, so that I understand when I can proceed to calendar registration.

#### Acceptance Criteria

1. WHEN 内覧日（最新）is empty, THE Buyer_Viewing_Page SHALL hide the Calendar_Button
2. WHEN 内覧日（最新）is filled, THE Buyer_Viewing_Page SHALL display the Calendar_Button
3. THE Calendar_Button SHALL remain clickable regardless of other field states (validation occurs on click)
4. THE Buyer_Viewing_Page SHALL provide visual feedback during validation

### Requirement 6: システム隔離の遵守

**User Story:** As a system architect, I want changes to be isolated to the buyer management system, so that other systems remain unaffected.

#### Acceptance Criteria

1. WHEN implementing validation, THE Validation_System SHALL only modify files in the buyer management system
2. THE Validation_System SHALL not modify seller management, property management, or other system files
3. THE Validation_System SHALL not affect shared services unless absolutely necessary
4. WHEN modifying shared files, THE Validation_System SHALL ensure backward compatibility with all systems

### Requirement 7: データ整合性の保証

**User Story:** As a system administrator, I want to ensure that calendar events are only created with complete information, so that data integrity is maintained.

#### Acceptance Criteria

1. THE Validation_System SHALL prevent calendar event creation when Required_Fields are incomplete
2. THE Validation_System SHALL ensure that viewing_type or viewing_type_general is selected based on property type
3. THE Validation_System SHALL verify that Follow_Up_Assignee is a valid employee initial
4. THE Validation_System SHALL maintain consistency between form data and calendar event data

### Requirement 8: エラーハンドリング

**User Story:** As a user, I want the system to handle errors gracefully, so that I can understand what went wrong and how to fix it.

#### Acceptance Criteria

1. WHEN validation fails, THE Validation_System SHALL display a user-friendly error message
2. WHEN calendar link generation fails, THE Validation_System SHALL display an appropriate error message
3. THE Validation_System SHALL log validation errors for debugging purposes
4. THE Validation_System SHALL not crash or freeze when validation errors occur
