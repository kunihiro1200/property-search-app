# Requirements Document

## Introduction

本システムは、不動産売主リスト管理システムにGoogleカレンダー連携機能を追加し、訪問査定予約を自動的にGoogleカレンダーに同期する機能を提供します。営業担当者が予約を作成すると、自動的に担当者のGoogleカレンダーにイベントが作成され、予約の変更やキャンセルも同期されます。

## Glossary

- **System**: 不動産売主リスト管理システム
- **User**: システムを使用する営業担当者
- **Google Calendar API**: Googleが提供するカレンダー操作API
- **OAuth 2.0**: Googleアカウントへの安全なアクセスを提供する認証プロトコル
- **Refresh Token**: アクセストークンを更新するための長期的な認証情報
- **Calendar Event**: Googleカレンダー上のイベント（予約）
- **Appointment**: システム内の訪問査定予約

## Requirements

### Requirement 1

**User Story:** As a user, I want to authenticate with my Google account, so that the system can access my Google Calendar.

#### Acceptance Criteria

1. WHEN a user initiates Google authentication THEN the system SHALL redirect the user to Google's OAuth consent screen
2. WHEN a user grants calendar access permissions THEN the system SHALL receive and store the refresh token securely
3. WHEN the system stores authentication tokens THEN the system SHALL encrypt sensitive token data
4. WHEN a user's refresh token expires THEN the system SHALL prompt the user to re-authenticate

### Requirement 2

**User Story:** As a user, I want appointments to be automatically created in my Google Calendar, so that I can manage my schedule in one place.

#### Acceptance Criteria

1. WHEN a user creates an appointment THEN the system SHALL create a corresponding event in the user's Google Calendar
2. WHEN creating a calendar event THEN the system SHALL include seller name, phone number, property address, and notes in the event description
3. WHEN creating a calendar event THEN the system SHALL set the event location to the property address
4. WHEN creating a calendar event THEN the system SHALL add reminders (1 day before and 30 minutes before)
5. WHEN a calendar event is created successfully THEN the system SHALL store the calendar event ID with the appointment record

### Requirement 3

**User Story:** As a user, I want appointment updates to sync with Google Calendar, so that my calendar stays accurate.

#### Acceptance Criteria

1. WHEN a user updates an appointment's time THEN the system SHALL update the corresponding calendar event's time
2. WHEN a user updates an appointment's location THEN the system SHALL update the corresponding calendar event's location
3. WHEN a user updates an appointment's notes THEN the system SHALL update the corresponding calendar event's description
4. WHEN a calendar event update fails THEN the system SHALL maintain the appointment data and log the error

### Requirement 4

**User Story:** As a user, I want cancelled appointments to be removed from my Google Calendar, so that my calendar reflects current commitments.

#### Acceptance Criteria

1. WHEN a user cancels an appointment THEN the system SHALL delete the corresponding calendar event
2. WHEN a calendar event deletion fails THEN the system SHALL still mark the appointment as cancelled in the database
3. WHEN deleting a calendar event THEN the system SHALL handle cases where the event was already deleted manually

### Requirement 5

**User Story:** As a system administrator, I want to configure Google Calendar API credentials, so that the system can integrate with Google services.

#### Acceptance Criteria

1. WHEN the system starts THEN the system SHALL load Google API credentials from environment variables
2. WHEN Google API credentials are missing THEN the system SHALL log a warning and disable calendar features
3. WHEN the system initializes the calendar service THEN the system SHALL validate the OAuth configuration
