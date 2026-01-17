# ログイン機能修正

## Introduction

売主リスト管理システムのログイン機能が動作していない問題を修正します。現在、Supabase Authを使用したGoogleログインが実装されていますが、認証フローが正しく完了していません。

## Glossary

- **Supabase Auth**: Supabaseが提供する認証サービス
- **OAuth**: Open Authorizationの略。サードパーティ認証プロトコル
- **Session Token**: ユーザーのログイン状態を保持するトークン
- **Redirect URI**: OAuth認証後にリダイレクトされるURL

## Requirements

### Requirement 1

**User Story:** As a user, I want to log in with my Google account, so that I can access the seller management system.

#### Acceptance Criteria

1. WHEN a user clicks the "Googleでログイン" button THEN the system SHALL redirect to Google's OAuth consent screen
2. WHEN a user approves the OAuth consent THEN the system SHALL redirect back to the application with authentication tokens
3. WHEN the callback is received THEN the system SHALL create or retrieve the employee record
4. WHEN authentication is successful THEN the system SHALL store the session token and redirect to the home page
5. WHEN authentication fails THEN the system SHALL display an error message and allow retry

### Requirement 2

**User Story:** As a developer, I want clear error messages and logging, so that I can diagnose authentication issues quickly.

#### Acceptance Criteria

1. WHEN an authentication error occurs THEN the system SHALL log detailed error information to the console
2. WHEN Supabase configuration is missing THEN the system SHALL display a clear error message
3. WHEN the OAuth callback fails THEN the system SHALL log the failure reason
4. WHEN debugging is needed THEN the system SHALL provide step-by-step logs of the authentication flow
