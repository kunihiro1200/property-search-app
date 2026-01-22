# Requirements Document

## Introduction

追客ログトラッカーは、売主への電話連絡を自動的に記録し、誰がいつ電話したかを一目で確認できるシンプルな履歴管理機能です。コメント入力を不要とし、電話をかけた事実のみを時系列で記録することで、追客活動の可視化と管理を効率化します。

## Glossary

- **System**: 追客ログトラッカーシステム
- **User**: 不動産営業担当者
- **Seller**: 物件の売主
- **Call_Log**: 電話連絡の記録（日時、担当者、売主IDを含む）
- **Call_Action**: 電話をかける行為
- **Log_Entry**: 追客ログの1件のエントリ

## Requirements

### Requirement 1

**User Story:** As a User, I want the system to automatically record when I make a call to a Seller, so that I don't need to manually log every call.

#### Acceptance Criteria

1. WHEN a User initiates a Call_Action to a Seller THEN the System SHALL automatically create a Log_Entry with the current timestamp and User information
2. WHEN a Log_Entry is created THEN the System SHALL store the Seller ID, User ID, and exact date-time without requiring any manual input
3. WHEN a Call_Action is completed THEN the System SHALL persist the Log_Entry to the database immediately
4. WHEN multiple Users call the same Seller THEN the System SHALL create separate Log_Entry records for each call

### Requirement 2

**User Story:** As a User, I want to view a simple list of all calls made to a Seller, so that I can quickly see the call history without unnecessary details.

#### Acceptance Criteria

1. WHEN a User views a Seller's detail page THEN the System SHALL display a list of all Call_Log entries for that Seller
2. WHEN displaying Call_Log entries THEN the System SHALL show the date, time, and User name for each entry
3. WHEN displaying Call_Log entries THEN the System SHALL NOT include any comment or memo fields
4. WHEN displaying Call_Log entries THEN the System SHALL sort them by date and time in descending order (newest first)
5. WHEN the Call_Log list is empty THEN the System SHALL display an appropriate empty state message

### Requirement 3

**User Story:** As a User, I want to see who made each call, so that I can understand which team member has been in contact with the Seller.

#### Acceptance Criteria

1. WHEN a Call_Log entry is displayed THEN the System SHALL show the User name or identifier who made the call
2. WHEN multiple Users have called the same Seller THEN the System SHALL clearly distinguish between different Users in the log
3. WHEN a User's name is displayed THEN the System SHALL use a consistent format across all log entries

### Requirement 4

**User Story:** As a User, I want the call log to integrate seamlessly with the existing call mode page, so that logging happens automatically without disrupting my workflow.

#### Acceptance Criteria

1. WHEN a User uses the call mode page to make a call THEN the System SHALL trigger automatic Call_Log creation
2. WHEN the call mode page saves call notes THEN the System SHALL create both the call note and the Call_Log entry
3. WHEN the automatic logging fails THEN the System SHALL not prevent the User from completing other call-related tasks
4. WHEN a User navigates away from the call mode page THEN the System SHALL ensure the Call_Log entry has been saved

### Requirement 5

**User Story:** As a User, I want to see a count of total calls made to each Seller, so that I can quickly assess the level of engagement.

#### Acceptance Criteria

1. WHEN viewing a Seller's information THEN the System SHALL display the total count of Call_Log entries
2. WHEN a new Call_Log entry is created THEN the System SHALL update the call count immediately
3. WHEN displaying the call count THEN the System SHALL use a clear and visible format
