# Requirements Document

## Introduction

ログイン後に社員の名前が「不明」と表示される問題を修正します。現在、Googleアカウントでログインした際に、Google OAuth APIから取得できる名前情報が正しくemployeesテーブルに保存されていないため、多くのユーザーの名前が「不明」または暗号化されたような文字列として表示されています。

## Glossary

- **System**: 売主リスト管理システム
- **Employee**: システムを使用する社員
- **Google OAuth**: Google認証サービス
- **Supabase Auth**: Supabaseの認証サービス
- **Employee Record**: employeesテーブルに保存される社員情報

## Requirements

### Requirement 1

**User Story:** As a system user, I want my name to be displayed correctly after logging in with Google, so that I can be properly identified in the system.

#### Acceptance Criteria

1. WHEN a user logs in with Google THEN the System SHALL retrieve the user's display name from Google OAuth user metadata
2. WHEN the display name is not available from Google OAuth THEN the System SHALL extract the name from the email address before the @ symbol
3. WHEN creating a new employee record THEN the System SHALL store the retrieved or extracted name in the name field
4. WHEN displaying employee information THEN the System SHALL show the stored name instead of encrypted strings or "不明"
5. WHEN an existing employee logs in THEN the System SHALL update their name if it was previously set to a default or invalid value

### Requirement 2

**User Story:** As a system administrator, I want to fix existing employee records with incorrect names, so that all users are properly identified.

#### Acceptance Criteria

1. WHEN running a data migration script THEN the System SHALL identify all employee records with invalid names
2. WHEN an employee record has an encrypted-looking name THEN the System SHALL attempt to retrieve the correct name from Supabase Auth
3. WHEN the correct name cannot be retrieved THEN the System SHALL extract the name from the email address
4. WHEN updating employee names THEN the System SHALL preserve the original google_id and email
5. WHEN the migration completes THEN the System SHALL report the number of records updated

### Requirement 3

**User Story:** As a developer, I want proper logging of the authentication process, so that I can debug name retrieval issues.

#### Acceptance Criteria

1. WHEN retrieving user information from Google OAuth THEN the System SHALL log the available user metadata fields
2. WHEN creating or updating an employee record THEN the System SHALL log the name being stored
3. WHEN name extraction fails THEN the System SHALL log a warning with the email address
4. WHEN the authentication callback completes THEN the System SHALL log the final employee information
