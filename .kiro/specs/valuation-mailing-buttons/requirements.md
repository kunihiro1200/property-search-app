# Requirements Document

## Introduction

本機能は、通話モードページの査定計算セクションに「郵送」「済」「不要」ボタンを追加し、査定書の郵送ステータスを簡単に設定できるようにするものです。現在、査定計算セクションには査定額の計算・表示機能がありますが、査定書の郵送状況を管理するUIがありません。本機能により、ユーザーは査定書の郵送予定、郵送完了、郵送不要をワンクリックで記録できるようになります。

## Glossary

- **通話モードページ (Call Mode Page)**: 売主への電話対応時に使用する専用ページ。売主情報、物件情報、査定計算、通話履歴などを一画面で確認・操作できる
- **査定計算セクション (Valuation Section)**: 通話モードページ内の、固定資産税路線価から査定額を計算・表示するセクション
- **郵送ステータス (Mailing Status)**: 査定書の郵送状況を示すフィールド。「未」（郵送予定）、「済」（郵送完了）、「不要」の値を持つ

## Requirements

### Requirement 1

**User Story:** As a 営業担当者, I want to mark a valuation as "pending mail" with one click, so that I can quickly record when I plan to send the valuation document by postal mail.

#### Acceptance Criteria

1. WHEN a user clicks the "郵送" button in the valuation section THEN the system SHALL update the mailing status to "未" and display visual confirmation
2. WHEN the "郵送" button is clicked THEN the system SHALL persist the change to the database immediately
3. WHEN the mailing status is "未" THEN the system SHALL display the "郵送" button in a highlighted state indicating the action has been taken

### Requirement 2

**User Story:** As a 営業担当者, I want to mark a valuation as "mailed" with one click, so that I can record when I have completed sending the valuation document by postal mail.

#### Acceptance Criteria

1. WHEN a user clicks the "済" button in the valuation section THEN the system SHALL update the mailing status to "済" and display visual confirmation
2. WHEN the mailing status is updated to "済" THEN the system SHALL record the current date as the mail sent date (mail_sent_date)
3. WHEN the "済" button is clicked THEN the system SHALL persist the change to the database immediately
4. WHEN the mailing status is "済" THEN the system SHALL display the "済" button in a highlighted state indicating the action has been taken

### Requirement 3

**User Story:** As a 営業担当者, I want to mark a valuation as "not needed" with one click, so that I can record when postal mailing is unnecessary for this seller.

#### Acceptance Criteria

1. WHEN a user clicks the "不要" button in the valuation section THEN the system SHALL update the mailing status to "不要" and display visual confirmation
2. WHEN the "不要" button is clicked THEN the system SHALL persist the change to the database immediately
3. WHEN the mailing status is "不要" THEN the system SHALL display the "不要" button in a highlighted state indicating the action has been taken

### Requirement 4

**User Story:** As a 営業担当者, I want to see the current mailing status clearly, so that I can understand at a glance whether the valuation has been mailed or marked as not needed.

#### Acceptance Criteria

1. WHEN the valuation section loads THEN the system SHALL display the current mailing status with appropriate visual styling
2. WHEN the mailing status is "済" THEN the system SHALL display the mail sent date alongside the status
3. WHEN the mailing status is empty THEN the system SHALL display all three buttons ("郵送", "済", "不要") as available actions
4. WHEN the mailing status is "未", "済", or "不要" THEN the system SHALL allow the user to change the status by clicking another button

### Requirement 5

**User Story:** As a 営業担当者, I want the mailing buttons to be visible in the valuation section, so that I can easily access them while reviewing valuation information.

#### Acceptance Criteria

1. WHEN the valuation section is displayed THEN the system SHALL show the "郵送", "済", and "不要" buttons in a prominent location within the section
2. WHEN the valuation section is in view mode (not editing) THEN the system SHALL display the mailing status buttons alongside the valuation amount display
3. WHEN the valuation section is in edit mode THEN the system SHALL continue to display the mailing status buttons
