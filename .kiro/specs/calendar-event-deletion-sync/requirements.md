# Requirements Document

## Introduction

本機能は、Googleカレンダー上で予定が削除された際に、システム内の対応する訪問予約データも自動的に削除する双方向同期機能を提供します。これにより、Googleカレンダーとシステムのデータ整合性を保ち、ユーザーがどちらの側から予定を削除しても、両方に反映されるようになります。

## Glossary

- **System**: 不動産売主リスト管理システム
- **Calendar Event**: Googleカレンダー上のイベント（予約）
- **Appointment**: システム内の訪問査定予約
- **Webhook**: Googleカレンダーの変更を通知するコールバック機構
- **Push Notification**: Google Calendar APIが提供するリアルタイム通知機能
- **Sync Token**: カレンダーの変更を追跡するためのトークン
- **Calendar Event ID**: Googleカレンダーイベントの一意識別子

## Requirements

### Requirement 1

**User Story:** As a user, I want appointments to be deleted from the system when I delete them from Google Calendar, so that both systems stay synchronized.

#### Acceptance Criteria

1. WHEN a user deletes a calendar event in Google Calendar THEN the system SHALL detect the deletion
2. WHEN the system detects a calendar event deletion THEN the system SHALL find the corresponding appointment by calendar_event_id
3. WHEN a corresponding appointment is found THEN the system SHALL delete or mark the appointment as cancelled
4. WHEN no corresponding appointment is found THEN the system SHALL log the event and continue without error
5. WHEN the appointment is deleted THEN the system SHALL preserve the deletion in activity logs for audit purposes

### Requirement 2

**User Story:** As a system administrator, I want to set up webhook notifications from Google Calendar, so that the system can receive real-time deletion events.

#### Acceptance Criteria

1. WHEN the system starts THEN the system SHALL register webhook subscriptions for each connected employee's calendar
2. WHEN registering a webhook THEN the system SHALL provide a valid callback URL that Google can access
3. WHEN a webhook subscription expires THEN the system SHALL automatically renew the subscription
4. WHEN an employee connects their Google Calendar THEN the system SHALL create a webhook subscription for their calendar
5. WHEN an employee disconnects their Google Calendar THEN the system SHALL cancel their webhook subscription

### Requirement 3

**User Story:** As a user, I want the system to handle webhook notifications securely, so that only legitimate Google Calendar notifications are processed.

#### Acceptance Criteria

1. WHEN the system receives a webhook notification THEN the system SHALL verify the notification signature
2. WHEN a webhook notification has an invalid signature THEN the system SHALL reject the notification and log the attempt
3. WHEN a webhook notification is valid THEN the system SHALL process the calendar changes
4. WHEN processing webhook notifications THEN the system SHALL handle duplicate notifications idempotently

### Requirement 4

**User Story:** As a user, I want the system to periodically check for missed deletions, so that synchronization remains accurate even if webhooks fail.

#### Acceptance Criteria

1. WHEN the periodic sync job runs THEN the system SHALL query Google Calendar for changes since the last sync
2. WHEN changes are detected THEN the system SHALL identify deleted events
3. WHEN deleted events are found THEN the system SHALL delete corresponding appointments
4. WHEN the sync completes THEN the system SHALL update the sync token for the next incremental sync
5. WHEN the sync job fails THEN the system SHALL retry with exponential backoff

### Requirement 5

**User Story:** As a user, I want to be notified when an appointment is deleted due to calendar deletion, so that I'm aware of the change.

#### Acceptance Criteria

1. WHEN an appointment is deleted due to calendar sync THEN the system SHALL create an activity log entry
2. WHEN creating the activity log THEN the system SHALL indicate the deletion source as "Google Calendar Sync"
3. WHEN the deleted appointment had a seller assigned THEN the system SHALL maintain the seller record unchanged
4. WHEN multiple appointments are deleted THEN the system SHALL process them in batch efficiently
