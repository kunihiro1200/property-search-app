# Requirements Document

## Introduction

買主データの双方向同期機能を実装する。現在はスプレッドシートからDBへの一方向同期のみがサポートされているが、DBで編集されたデータをスプレッドシートに書き戻す機能を追加する。これにより、ブラウザ上での買主情報編集がスプレッドシートにも反映されるようになる。

## Glossary

- **Bidirectional_Sync_Service**: DBの変更をスプレッドシートに書き戻す双方向同期サービス
- **Buyer_Write_Service**: 買主データをスプレッドシートに書き込むサービス
- **Conflict_Resolver**: 同期競合を検出・解決するコンポーネント
- **Change_Tracker**: DBの変更を追跡するコンポーネント
- **Spreadsheet_Writer**: Google Sheets APIを使用してスプレッドシートに書き込むコンポーネント

## Requirements

### Requirement 1: DBからスプレッドシートへの書き戻し

**User Story:** As a user, I want my edits in the browser to be saved to the spreadsheet, so that the spreadsheet remains the single source of truth.

#### Acceptance Criteria

1. WHEN a user updates a buyer field in the browser THEN the Bidirectional_Sync_Service SHALL write the change to the corresponding cell in the spreadsheet
2. WHEN the spreadsheet write succeeds THEN the Bidirectional_Sync_Service SHALL update the buyer's `last_synced_at` timestamp in the database
3. IF the spreadsheet write fails THEN the Bidirectional_Sync_Service SHALL log the error and return an appropriate error message to the user
4. WHEN writing to the spreadsheet THEN the Spreadsheet_Writer SHALL use the buyer_number to locate the correct row
5. WHEN writing to the spreadsheet THEN the Spreadsheet_Writer SHALL only update the specific fields that were changed

### Requirement 2: フィールドマッピング

**User Story:** As a developer, I want a clear mapping between database fields and spreadsheet columns, so that data is written to the correct location.

#### Acceptance Criteria

1. THE Buyer_Write_Service SHALL use the existing BuyerColumnMapper to determine the correct spreadsheet column for each database field
2. WHEN a database field is updated THEN the Buyer_Write_Service SHALL map it to the corresponding spreadsheet column letter
3. THE Buyer_Write_Service SHALL support all editable buyer fields including: email, phone, name, address, notes, and other contact information
4. IF a field has no corresponding spreadsheet column THEN the Buyer_Write_Service SHALL skip that field and log a warning

### Requirement 3: 競合検出と解決

**User Story:** As a user, I want to be notified if my changes conflict with recent spreadsheet updates, so that I don't accidentally overwrite important data.

#### Acceptance Criteria

1. WHEN writing to the spreadsheet THEN the Conflict_Resolver SHALL first check if the spreadsheet value has changed since the last sync
2. IF a conflict is detected THEN the Conflict_Resolver SHALL return an error with both the current spreadsheet value and the attempted new value
3. WHEN a conflict occurs THEN the System SHALL allow the user to choose whether to overwrite or cancel the change
4. THE Conflict_Resolver SHALL use the `last_synced_at` timestamp to determine if the spreadsheet may have been modified

### Requirement 4: 変更追跡

**User Story:** As a system administrator, I want to track all changes made through the browser, so that I can audit data modifications.

#### Acceptance Criteria

1. WHEN a buyer field is updated THEN the Change_Tracker SHALL record the old value, new value, timestamp, and user who made the change
2. THE Change_Tracker SHALL store change history in the audit_logs table
3. WHEN a spreadsheet write succeeds THEN the Change_Tracker SHALL mark the change as synced
4. IF a spreadsheet write fails THEN the Change_Tracker SHALL mark the change as pending_sync

### Requirement 5: エラーハンドリングとリトライ

**User Story:** As a user, I want the system to handle temporary failures gracefully, so that my changes are not lost.

#### Acceptance Criteria

1. IF a spreadsheet write fails due to a network error THEN the Bidirectional_Sync_Service SHALL retry up to 3 times with exponential backoff
2. IF all retries fail THEN the Bidirectional_Sync_Service SHALL queue the change for later retry
3. WHEN the system recovers THEN the Bidirectional_Sync_Service SHALL process any queued changes
4. THE System SHALL provide a UI indicator showing pending sync status for unsaved changes

### Requirement 6: API エンドポイント

**User Story:** As a frontend developer, I want a clear API to update buyer data with spreadsheet sync, so that I can integrate the feature into the UI.

#### Acceptance Criteria

1. THE System SHALL provide a PUT /api/buyers/:id endpoint that updates both DB and spreadsheet
2. WHEN the endpoint is called THEN it SHALL first update the database, then sync to spreadsheet
3. THE endpoint SHALL return the updated buyer data along with sync status
4. IF sync fails but DB update succeeds THEN the endpoint SHALL return success with a warning about pending sync
5. THE endpoint SHALL accept a `force` parameter to overwrite spreadsheet conflicts

### Requirement 7: パフォーマンス

**User Story:** As a user, I want my edits to be saved quickly, so that I can continue working without delays.

#### Acceptance Criteria

1. THE Bidirectional_Sync_Service SHALL complete a single field update within 3 seconds under normal conditions
2. WHEN multiple fields are updated simultaneously THEN the Spreadsheet_Writer SHALL batch them into a single API call
3. THE System SHALL not block the UI while waiting for spreadsheet sync to complete
4. WHEN the spreadsheet sync is in progress THEN the UI SHALL show a non-blocking indicator
