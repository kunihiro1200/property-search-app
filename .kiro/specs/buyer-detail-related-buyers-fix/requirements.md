# Requirements Document

## Introduction

買主詳細ページで関連買主（重複案件）が正しく表示されない問題を修正します。具体的には、買主6647の詳細ページで買主6648が重複案件として表示されず、さらにページを開くとAPIエラーが発生する問題に対処します。

## Glossary

- **System**: 買主管理システム
- **Related_Buyer**: 同一人物と判定された別の買主レコード（電話番号またはメールアドレスが一致）
- **Buyer_Detail_Page**: 買主の詳細情報を表示するページ
- **Related_Buyers_Section**: 買主詳細ページ内の関連買主を表示するセクション
- **Unified_Inquiry_History_Table**: 統合された問い合わせ履歴を表示するテーブル
- **API_Endpoint**: バックエンドのデータ取得エンドポイント

## Requirements

### Requirement 1: 関連買主データの取得修正

**User Story:** As a user, I want to view related buyers on the buyer detail page, so that I can see all duplicate records for the same person.

#### Acceptance Criteria

1. WHEN a user opens a buyer detail page, THE System SHALL fetch related buyers without returning 404 errors
2. WHEN fetching related buyers, THE System SHALL use the correct buyer ID format (UUID)
3. IF a buyer has related buyers (matching phone or email), THEN THE System SHALL return all related buyer records
4. WHEN the API endpoint receives an invalid buyer ID, THEN THE System SHALL return a descriptive error message instead of 404

### Requirement 2: 問い合わせ履歴の取得修正

**User Story:** As a user, I want to view unified inquiry history for a buyer and their related buyers, so that I can see the complete interaction history.

#### Acceptance Criteria

1. WHEN a user opens a buyer detail page, THE System SHALL fetch unified inquiry history without returning 404 errors
2. WHEN fetching inquiry history, THE System SHALL include history from the current buyer and all related buyers
3. WHEN no inquiry history exists, THE System SHALL return an empty array instead of an error
4. WHEN the API endpoint receives an invalid buyer ID, THEN THE System SHALL return a descriptive error message

### Requirement 3: エラーハンドリングの改善

**User Story:** As a user, I want the buyer detail page to handle errors gracefully, so that I can still view available information even when some data fails to load.

#### Acceptance Criteria

1. WHEN an API call fails, THE System SHALL display an error message to the user
2. WHEN related buyers fail to load, THE System SHALL still display the main buyer information
3. WHEN inquiry history fails to load, THE System SHALL still display other sections of the page
4. THE System SHALL log detailed error information for debugging purposes

### Requirement 4: 関連買主の表示

**User Story:** As a user, I want to see related buyers displayed in the buyer detail page, so that I can identify duplicate records.

#### Acceptance Criteria

1. WHEN a buyer has related buyers, THE System SHALL display them in the Related Buyers Section
2. WHEN displaying related buyers, THE System SHALL show buyer number, name, phone, and email
3. WHEN a user clicks on a related buyer, THE System SHALL navigate to that buyer's detail page
4. WHEN no related buyers exist, THE System SHALL display a message indicating no duplicates found

### Requirement 5: APIエンドポイントの検証

**User Story:** As a developer, I want API endpoints to validate input parameters, so that invalid requests are rejected with clear error messages.

#### Acceptance Criteria

1. WHEN an API endpoint receives a buyer ID, THE System SHALL validate it is a valid UUID format
2. WHEN an API endpoint receives an invalid UUID, THE System SHALL return a 400 Bad Request error
3. WHEN an API endpoint cannot find a buyer, THE System SHALL return a 404 Not Found error with a descriptive message
4. THE System SHALL distinguish between "invalid ID format" and "buyer not found" errors
