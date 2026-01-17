# Requirements Document

## Introduction

売主リストのテーブル一覧UIにおいて、反響日付の表示ロジックを改善する機能です。現在は「反響日付」フィールドのみを表示していますが、スプレッドシートに「反響詳細日時」データがある場合はそちらを優先的に表示し、ない場合は従来の「反響日付」を表示するようにします。

## Glossary

- **反響日付 (inquiry_date)**: 売主からの問い合わせがあった日付（DATE型）
- **反響詳細日時 (inquiry_detailed_datetime)**: 査定依頼が実際にメールで届いた詳細な日時（TIMESTAMP型）
- **売主リスト (SellersPage)**: 売主一覧を表示するフロントエンドページ
- **スプレッドシート**: Google Sheetsで管理されている売主データの元データ
- **ColumnMapper**: スプレッドシートとデータベース間のカラムマッピングを行うサービス

## Requirements

### Requirement 1

**User Story:** As a 営業担当者, I want to see the most accurate inquiry date/time in the seller list, so that I can understand when each inquiry was received with precision.

#### Acceptance Criteria

1. WHEN 売主リストを表示する場合、THE システム SHALL 反響詳細日時（inquiry_detailed_datetime）が存在すればそれを表示する
2. WHEN 反響詳細日時が存在しない場合、THE システム SHALL 反響日付（inquiry_date）を表示する
3. WHEN 反響詳細日時を表示する場合、THE システム SHALL 日付と時刻の両方を表示する
4. WHEN 反響日付のみを表示する場合、THE システム SHALL 日付のみを表示する

### Requirement 2

**User Story:** As a システム管理者, I want the spreadsheet sync to include the detailed inquiry datetime, so that the database has accurate inquiry timing data.

#### Acceptance Criteria

1. WHEN スプレッドシートからデータを同期する場合、THE ColumnMapper SHALL 「反響詳細日時」カラムをinquiry_detailed_datetimeフィールドにマッピングする
2. WHEN 反響詳細日時のデータ型を変換する場合、THE システム SHALL TIMESTAMP型として正しくパースする
3. WHEN 反響詳細日時が空の場合、THE システム SHALL nullとして保存する

### Requirement 3

**User Story:** As a 営業担当者, I want the inquiry date display to be consistent across the application, so that I can trust the data I see.

#### Acceptance Criteria

1. WHEN APIが売主データを返す場合、THE システム SHALL inquiry_detailed_datetimeフィールドをレスポンスに含める
2. WHEN フロントエンドが売主データを受け取る場合、THE システム SHALL inquiryDetailedDatetimeプロパティを型定義に含める
3. WHEN 表示用の日付を決定する場合、THE システム SHALL 反響詳細日時 > 反響日付の優先順位で選択する
