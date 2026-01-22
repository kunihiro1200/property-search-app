# Requirements Document

## Introduction

本機能は、AWSのAIサービスを活用した電話システムを統合し、売主との通話を自動化・記録するシステムです。Amazon Connectを中心としたAWSサービス群を使用して、発信・着信の両方に対応し、通話内容を自動的に文字起こしして売主リストのコメントとして記録します。

## Prerequisites（前提条件）

本機能を実装する前に、以下のAWSサービスのセットアップが必要です：

### 1. AWSアカウントの準備
- AWSアカウントの作成（未作成の場合）
- 適切なIAMユーザーの作成と権限設定
- 請求アラートの設定（コスト管理のため）

### 2. Amazon Connectのセットアップ
- Amazon Connectインスタンスの作成
- 電話番号の取得（日本の電話番号が必要）
- コンタクトフロー（通話フロー）の基本設定
- 推定コスト：月額基本料金 + 通話料金（従量課金）

### 3. Amazon Transcribeの有効化
- リージョンでのサービス有効化
- 日本語音声認識の設定
- 推定コスト：音声1分あたり約$0.024（日本語）

### 4. Amazon S3バケットの作成
- 通話録音ファイル保存用バケット
- 適切なアクセス権限とライフサイクルポリシーの設定
- 推定コスト：ストレージ容量に応じた従量課金

### 5. オプション：その他のAWSサービス
- Amazon Comprehend（感情分析用）
- Amazon Lex（対話型AI用、必要に応じて）

### セットアップの推奨順序
1. AWSアカウント作成・IAM設定
2. Amazon Connectインスタンス作成
3. 電話番号取得
4. S3バケット作成
5. Amazon Transcribe有効化
6. 本システムとの統合実装

**注意：** これらのセットアップは実装開始前に完了している必要があります。セットアップ手順の詳細は、設計書（design.md）で説明します。

## Glossary

- **System**: 売主管理システム（本アプリケーション）
- **AI Phone Service**: Amazon Connectを中心としたAWS AIサービス群（Amazon Connect、Amazon Transcribe、Amazon Lex、Amazon Polly等）
- **Call Log**: 通話記録（日時、通話時間、参加者、文字起こしテキスト等を含む）
- **Seller**: 売主（不動産の売却を検討している顧客）
- **User**: システムを使用する従業員
- **Transcription**: 音声の文字起こしテキスト
- **Activity Log**: 売主に関する活動履歴（コメント、通話記録等）

## Requirements

### Requirement 1

**User Story:** As a user, I want to make outbound calls to sellers using AI-powered phone service, so that I can efficiently communicate with sellers and have the conversation automatically recorded.

#### Acceptance Criteria

1. WHEN a user selects a seller and initiates an outbound call THEN the system SHALL establish a connection through AI Phone Service to the seller's phone number
2. WHEN an outbound call is connected THEN the system SHALL start recording the conversation and transcribing it in real-time
3. WHEN an outbound call ends THEN the system SHALL save the call log with transcription to the seller's activity log
4. WHEN a user views a seller's detail page THEN the system SHALL display a call button that initiates an outbound call
5. WHEN the seller's phone number is invalid or missing THEN the system SHALL prevent the call and display an error message

### Requirement 2

**User Story:** As a user, I want to receive inbound calls from sellers through the AI phone service, so that sellers can reach us and their inquiries are automatically logged.

#### Acceptance Criteria

1. WHEN a seller calls the designated phone number THEN the AI Phone Service SHALL answer the call and identify the caller
2. WHEN an inbound call is received THEN the system SHALL attempt to match the caller's phone number with existing sellers
3. WHEN a caller is matched to a seller THEN the system SHALL record and transcribe the conversation
4. WHEN an inbound call ends THEN the system SHALL save the call log with transcription to the matched seller's activity log
5. WHEN a caller cannot be matched to any seller THEN the system SHALL create a new activity log entry with the caller's phone number

### Requirement 3

**User Story:** As a user, I want call transcriptions to be automatically saved as comments in the seller's activity log, so that I can review conversation details without listening to recordings.

#### Acceptance Criteria

1. WHEN a call transcription is completed THEN the system SHALL format the transcription with timestamp, duration, and participant information
2. WHEN saving a call log THEN the system SHALL create an activity log entry with type "phone_call"
3. WHEN a transcription contains multiple speakers THEN the system SHALL identify and label each speaker in the formatted text
4. WHEN a call log is saved THEN the system SHALL include metadata such as call direction (inbound/outbound), duration, and call status
5. WHEN a user views the seller's activity log THEN the system SHALL display phone call entries with a distinct visual indicator

### Requirement 4

**User Story:** As a user, I want to configure AWS AI Phone Service settings, so that the system can connect to the appropriate AWS resources.

#### Acceptance Criteria

1. WHEN an administrator accesses system settings THEN the system SHALL provide configuration fields for AWS credentials and Amazon Connect instance
2. WHEN AWS credentials are entered THEN the system SHALL validate the credentials before saving
3. WHEN Amazon Connect instance ID is configured THEN the system SHALL verify connectivity to the instance
4. WHEN configuration is saved THEN the system SHALL encrypt sensitive credentials before storing
5. WHEN AWS service connection fails THEN the system SHALL display detailed error messages to help troubleshoot

### Requirement 5

**User Story:** As a user, I want to view call history and statistics, so that I can track communication patterns and team performance.

#### Acceptance Criteria

1. WHEN a user accesses the call history page THEN the system SHALL display a list of all calls with date, seller name, duration, and direction
2. WHEN viewing call history THEN the system SHALL provide filters for date range, call direction, and assigned user
3. WHEN a user selects a call from history THEN the system SHALL display the full transcription and call details
4. WHEN viewing call statistics THEN the system SHALL show metrics including total calls, average duration, and calls per user
5. WHEN exporting call data THEN the system SHALL generate a CSV file with call logs and transcriptions

### Requirement 6

**User Story:** As a user, I want AI-assisted call features such as sentiment analysis and keyword detection, so that I can better understand seller needs and priorities.

#### Acceptance Criteria

1. WHEN a call transcription is processed THEN the system SHALL analyze sentiment (positive, neutral, negative) using AWS AI services
2. WHEN sentiment analysis is completed THEN the system SHALL include sentiment scores in the call log metadata
3. WHEN a transcription contains predefined keywords THEN the system SHALL highlight and tag those keywords
4. WHEN viewing a call log with sentiment analysis THEN the system SHALL display sentiment indicators visually
5. WHEN keywords are detected THEN the system SHALL create automatic follow-up tasks based on keyword rules

### Requirement 7

**User Story:** As a system administrator, I want the phone integration to handle errors gracefully, so that service interruptions don't disrupt user workflow.

#### Acceptance Criteria

1. WHEN AWS service is unavailable THEN the system SHALL display a clear error message and log the failure
2. WHEN a transcription fails THEN the system SHALL save the call log with audio recording reference but without transcription
3. WHEN network connectivity is lost during a call THEN the system SHALL attempt to save partial transcription data
4. WHEN API rate limits are reached THEN the system SHALL queue requests and retry with exponential backoff
5. WHEN critical errors occur THEN the system SHALL send notifications to system administrators

### Requirement 8

**User Story:** As a user, I want to listen to call recordings when needed, so that I can verify transcription accuracy or review tone and context.

#### Acceptance Criteria

1. WHEN a call log is saved THEN the system SHALL store the audio recording in secure cloud storage
2. WHEN a user views a call log THEN the system SHALL provide a play button to listen to the recording
3. WHEN playing a recording THEN the system SHALL synchronize audio playback with transcription text highlighting
4. WHEN a recording is accessed THEN the system SHALL log the access for audit purposes
5. WHEN a recording is older than the retention period THEN the system SHALL archive or delete it according to policy
