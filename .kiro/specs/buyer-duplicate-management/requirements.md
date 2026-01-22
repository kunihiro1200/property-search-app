# Requirements Document: 買主関連表示機能

## Introduction

買主データの同期において、同じ人物が複数の買主番号で登録されるケースが発生しています。これは以下の2つのケースに分類されます：

1. **正常な複数問合せ**: 同一人物が異なる物件に問合せ（例: 買主6647と6648）
2. **真の重複**: 同じ物件への重複した問合せ（データ入力ミス）

本機能は、同一人物による複数の問合せを検出し、関連情報として表示することで、営業活動を支援します。真の重複については、システムで統合せず、手動でスプレッドシートから削除する運用とします。

## Glossary

- **System**: 買主管理システム
- **Buyer**: 買主レコード
- **Buyer_Number**: 買主番号（スプレッドシートから同期されるキー）
- **Related_Buyer**: 関連買主（同じ電話番号またはメールアドレスを持つ別の買主）
- **Multiple_Inquiry**: 複数問合せ（同一人物が異なる物件に問合せしているケース）
- **True_Duplicate**: 真の重複（同じ物件への重複した問合せ）

## Requirements

### Requirement 1: 関連買主の検出

**User Story:** As a sales representative, I want to see related buyers for the same person, so that I can understand their complete inquiry history.

#### Acceptance Criteria

1. WHEN viewing a buyer detail page, THE System SHALL detect other buyers with the same phone number
2. WHEN viewing a buyer detail page, THE System SHALL detect other buyers with the same email address
3. WHEN related buyers are detected, THE System SHALL display them in a "関連買主" section
4. WHEN displaying related buyers, THE System SHALL show buyer number, inquiry property, and inquiry date

### Requirement 2: 複数問合せの識別

**User Story:** As a sales representative, I want to distinguish between multiple inquiries and true duplicates, so that I can handle them appropriately.

#### Acceptance Criteria

1. WHEN displaying related buyers, THE System SHALL show the property number for each inquiry
2. WHEN related buyers have different property numbers, THE System SHALL label them as "複数問合せ"
3. WHEN related buyers have the same property number, THE System SHALL label them as "重複の可能性"
4. THE System SHALL NOT automatically merge or delete any buyer records

### Requirement 3: 問合せ履歴の統合表示

**User Story:** As a sales representative, I want to see all inquiries from the same person in one view, so that I can provide better customer service.

#### Acceptance Criteria

1. WHEN viewing a buyer detail page, THE System SHALL display all inquiries from related buyers
2. WHEN displaying inquiry history, THE System SHALL include inquiries from all related buyers
3. WHEN displaying inquiry history, THE System SHALL clearly indicate which buyer number each inquiry belongs to
4. WHEN displaying inquiry history, THE System SHALL sort inquiries by date (newest first)

### Requirement 4: 関連買主の通知

**User Story:** As a sales representative, I want to be notified when viewing a buyer with related records, so that I am aware of the complete context.

#### Acceptance Criteria

1. WHEN a buyer has related buyers, THE System SHALL display a notification badge on the buyer detail page
2. WHEN a buyer has related buyers, THE System SHALL show the count of related buyers
3. THE notification SHALL be visible but not intrusive
4. THE notification SHALL link to the "関連買主" section

### Requirement 5: 同期ロジックの維持

**User Story:** As a developer, I want to maintain the current sync logic, so that buyer records are correctly synchronized from the spreadsheet.

#### Acceptance Criteria

1. WHEN syncing buyers from the spreadsheet, THE System SHALL use buyer_number as the primary key
2. WHEN syncing buyers from the spreadsheet, THE System SHALL NOT use buyer_id (auto-generated UUID) as the key
3. WHEN a buyer with the same buyer_number exists, THE System SHALL update the existing record
4. WHEN a buyer with the same buyer_number does not exist, THE System SHALL create a new record
5. THE System SHALL NOT prevent creation of buyers with the same phone number or email address

## Notes

- 買主番号（buyer_number）はスプレッドシートから同期されるキーです
- 買主ID（id）は自動生成されるUUIDで、キーとして使用すべきではありません
- 電話番号とメールアドレスは関連買主検出の基準です
- **重要**: システムは買主レコードを自動的に統合・削除しません
- 同一人物による複数の問合せは正常なケースとして扱います（例: 買主6647と6648）
- 真の重複（同じ物件への重複問合せ）は、手動でスプレッドシートから行を削除して対応します
- システムの役割は「関連情報の表示」であり、「重複の統合」ではありません

## 運用方針

### 正常な複数問合せのケース
- 同一人物が異なる物件に問合せ
- 両方のレコードを保持
- 関連買主として表示
- 統合不要

### 真の重複のケース
- 同じ物件への重複した問合せ
- データ入力ミス
- **対応方法**: 手動でスプレッドシートから該当行を削除
- システムでの自動統合は行わない
