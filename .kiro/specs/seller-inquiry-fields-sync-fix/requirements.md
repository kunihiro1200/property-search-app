# Requirements Document

## Introduction

売主リストにおいて、反響年、反響日付、サイト（問合せ元）のフィールドがスプレッドシートからデータベースへ正しく同期されていない問題を解決します。現在、ColumnMapperに反響年のマッピングが欠けており、サイトフィールドのマッピングも不正確です。

## Glossary

- **反響年 (inquiry_year)**: 売主からの問い合わせがあった年（YYYY形式の文字列）
- **反響日付 (inquiry_date)**: 売主からの問い合わせがあった日付（DATE型）
- **サイト (inquiry_site)**: 問い合わせ元のサイト名（例: アットホーム、スーモなど）
- **ColumnMapper**: スプレッドシートとデータベース間のカラムマッピングを行うサービス
- **SpreadsheetSyncService**: スプレッドシートとデータベースの同期を行うサービス
- **売主リスト (SellersPage)**: 売主一覧を表示するフロントエンドページ
- **売主詳細 (SellerDetailPage)**: 売主の詳細情報を表示するフロントエンドページ

## Requirements

### Requirement 1

**User Story:** As a システム管理者, I want the spreadsheet sync to correctly map inquiry year and site fields, so that all inquiry information is accurately stored in the database.

#### Acceptance Criteria

1. WHEN スプレッドシートからデータを同期する場合、THE ColumnMapper SHALL 「反響年」カラムをinquiry_yearフィールドにマッピングする
2. WHEN スプレッドシートからデータを同期する場合、THE ColumnMapper SHALL 「サイト」カラムをinquiry_siteフィールドにマッピングする
3. WHEN 反響年のデータ型を変換する場合、THE システム SHALL 文字列型として保存する
4. WHEN 反響年が空の場合、THE システム SHALL nullとして保存する
5. WHEN サイトが空の場合、THE システム SHALL nullとして保存する

### Requirement 2

**User Story:** As a 営業担当者, I want to see the inquiry year and site in the seller list and detail pages, so that I can understand the source and timing of each inquiry.

#### Acceptance Criteria

1. WHEN 売主リストを表示する場合、THE システム SHALL 反響年を表示する
2. WHEN 売主リストを表示する場合、THE システム SHALL サイト（問合せ元）を表示する
3. WHEN 売主詳細を表示する場合、THE システム SHALL 反響年を表示する
4. WHEN 売主詳細を表示する場合、THE システム SHALL サイト（問合せ元）を表示する

### Requirement 3

**User Story:** As a システム管理者, I want the sync service to update inquiry year and site when they change in the spreadsheet, so that the database always reflects the latest information.

#### Acceptance Criteria

1. WHEN スプレッドシートの反響年が変更された場合、THE 同期サービス SHALL データベースのinquiry_yearを更新する
2. WHEN スプレッドシートのサイトが変更された場合、THE 同期サービス SHALL データベースのinquiry_siteを更新する
3. WHEN 同期が完了した場合、THE システム SHALL フロントエンドに最新のデータを返す

### Requirement 4

**User Story:** As a 営業担当者, I want the inquiry information to be consistent across all views, so that I can trust the data I see.

#### Acceptance Criteria

1. WHEN APIが売主データを返す場合、THE システム SHALL inquiry_yearフィールドをレスポンスに含める
2. WHEN APIが売主データを返す場合、THE システム SHALL inquiry_siteフィールドをレスポンスに含める
3. WHEN フロントエンドが売主データを受け取る場合、THE システム SHALL inquiryYearプロパティを型定義に含める
4. WHEN フロントエンドが売主データを受け取る場合、THE システム SHALL inquirySiteプロパティを型定義に含める
