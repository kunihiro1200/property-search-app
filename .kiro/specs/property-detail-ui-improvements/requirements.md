# Requirements Document

## Introduction

物件詳細画面のUI改善として、Gmail配信ボタンの配置変更と格納先URLの表示位置変更を行います。これにより、ユーザーが物件詳細画面から直接Gmail配信を実行でき、関連するURL情報が適切なセクションにまとめられます。

## Glossary

- **Gmail配信ボタン**: 買主に物件情報をGmailで一括配信するためのボタン
- **物件詳細画面**: 個別の物件情報を表示・編集する画面（PropertyListingDetailPage）
- **物件リスト画面**: 複数の物件を一覧表示する画面（PropertyListingsPage）
- **ヘッダー**: 画面上部の物件番号や戻るボタンが配置されているエリア
- **格納先URL**: 物件関連ドキュメントが保存されているGoogle DriveなどのURL
- **物件詳細情報セクション**: 土地面積、建物面積、構造などの物件スペック情報を表示するセクション
- **地図、サイトURL等セクション**: GoogleマップURL、SUUMO URLなどの外部リンクをまとめて表示するセクション

## Requirements

### Requirement 1

**User Story:** As a user, I want to access the Gmail distribution button from the property detail page header, so that I can quickly send property information to buyers without navigating back to the property list.

#### Acceptance Criteria

1. WHEN a user views the property detail page THEN the system SHALL display a Gmail distribution button in the header area
2. WHEN a user clicks the Gmail distribution button in the property detail header THEN the system SHALL open the email template selector modal
3. WHEN the Gmail distribution button is moved to the property detail header THEN the system SHALL remove the Gmail distribution button from the property list table
4. WHEN the Gmail distribution button is displayed in the header THEN the system SHALL position it near the save button for easy access
5. WHEN the Gmail distribution functionality is triggered from the property detail page THEN the system SHALL use the current property's number and address for email generation

### Requirement 2

**User Story:** As a user, I want to see the storage URL in the "Maps and Site URLs" section, so that all external links are organized in one place for easier access.

#### Acceptance Criteria

1. WHEN a user views the property detail page THEN the system SHALL display the storage URL in the "地図、サイトURL等" section
2. WHEN the storage URL is moved to the "地図、サイトURL等" section THEN the system SHALL remove the storage URL from the "物件詳細情報" section
3. WHEN the storage URL is displayed in the "地図、サイトURL等" section THEN the system SHALL format it as a clickable link with an external link icon
4. WHEN the storage URL is not available THEN the system SHALL not display an empty field in the "地図、サイトURL等" section
5. WHEN multiple URLs exist in the "地図、サイトURL等" section THEN the system SHALL display them in a consistent format with proper spacing
