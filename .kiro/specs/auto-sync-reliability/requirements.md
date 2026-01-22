# Requirements Document

## Introduction

スプレッドシートに新しい売主データが追加されたら、アプリを開いたときにそのデータが見れるようにする。現在の実装では新規データが反映されないケースがあるため、同期ロジックを修正する。

## Glossary

- **Auto_Sync_System**: スプレッドシートからデータベースへの自動同期を管理するシステム
- **Missing_Seller**: スプレッドシートに存在するがデータベースに存在しない売主レコード

## Requirements

### Requirement 1

**User Story:** As a user, I want new sellers added to the spreadsheet to appear in the app, so that I can see the latest data.

#### Acceptance Criteria

1. WHEN the Auto_Sync_System executes THEN the system SHALL compare all seller numbers in the spreadsheet against the database to identify Missing_Sellers
2. WHEN a Missing_Seller is detected THEN the Auto_Sync_System SHALL create the corresponding record in the database
3. WHEN the server starts THEN the Auto_Sync_System SHALL automatically begin periodic synchronization

### Requirement 2

**User Story:** As a user, I want the synced data to be accurate, so that I can trust the information in the app.

#### Acceptance Criteria

1. WHEN syncing a new seller THEN the Auto_Sync_System SHALL map all fields correctly including name, address, phone, email, inquiry date, and status
2. WHEN syncing valuation amounts THEN the Auto_Sync_System SHALL correctly convert units from 万円 to 円
3. WHEN syncing a new seller THEN the Auto_Sync_System SHALL also sync the associated property information
