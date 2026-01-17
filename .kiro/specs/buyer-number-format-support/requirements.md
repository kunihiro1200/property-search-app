# Requirements Document

## Introduction

買主番号（buyer_number）が `BY_R1UikR1lpuf7x2` のような英数字混合形式の場合、現在のシステムは「無効な買主番号です」というエラーを表示する。これは、システムが買主番号として数値またはUUIDのみを有効と認識しているためである。スプレッドシートの5列目に格納されている買主番号は、数値だけでなく英数字混合形式も存在するため、これらの形式をサポートする必要がある。

## Glossary

- **Buyer_Number**: スプレッドシートの5列目に格納されている買主の識別番号。数値形式（例: `6647`）または英数字混合形式（例: `BY_R1UikR1lpuf7x2`）がある。
- **Buyer_ID**: データベース内部で使用されるUUID形式の一意識別子。
- **UUID**: Universally Unique Identifier。`123e4567-e89b-12d3-a456-426614174000` のような形式。
- **Frontend_Validator**: フロントエンドで買主番号の形式を検証するロジック。
- **Backend_Validator**: バックエンドで買主番号の形式を検証するミドルウェア。

## Requirements

### Requirement 1: 英数字混合形式の買主番号サポート

**User Story:** ユーザーとして、`BY_R1UikR1lpuf7x2` のような英数字混合形式の買主番号をクリックした際に、正しく買主詳細ページが表示されることを期待する。

#### Acceptance Criteria

1. WHEN ユーザーが英数字混合形式の買主番号（例: `BY_R1UikR1lpuf7x2`）をクリック THEN THE System SHALL 買主詳細ページを正常に表示する
2. WHEN フロントエンドが買主番号を検証 THEN THE Frontend_Validator SHALL 数値、UUID、および英数字混合形式（`BY_` プレフィックス付き）を有効として認識する
3. WHEN バックエンドが買主番号を検証 THEN THE Backend_Validator SHALL 数値、UUID、および英数字混合形式を有効として認識する
4. WHEN 無効な形式の買主番号が入力された場合 THEN THE System SHALL 適切なエラーメッセージを表示する

### Requirement 2: バックエンドAPIの買主番号形式対応

**User Story:** 開発者として、バックエンドAPIが英数字混合形式の買主番号を正しく処理できることを期待する。

#### Acceptance Criteria

1. WHEN APIが `GET /api/buyers/:id` を受信し、idが英数字混合形式の場合 THEN THE BuyerService SHALL `buyer_number` カラムで検索を実行する
2. WHEN APIが買主番号で検索を実行 THEN THE System SHALL 大文字小文字を区別せずに検索する
3. WHEN 買主が見つからない場合 THEN THE System SHALL 404エラーを返す

### Requirement 3: フロントエンドバリデーションの更新

**User Story:** ユーザーとして、買主詳細ページにアクセスした際に、不正なバリデーションエラーが表示されないことを期待する。

#### Acceptance Criteria

1. WHEN BuyerDetailPageが買主番号パラメータを受け取る THEN THE Frontend_Validator SHALL 以下の形式を有効として認識する:
   - 数値形式（例: `6647`）
   - UUID形式（例: `123e4567-e89b-12d3-a456-426614174000`）
   - 英数字混合形式（例: `BY_R1UikR1lpuf7x2`）
2. WHEN 有効な買主番号形式が検出された場合 THEN THE System SHALL APIリクエストを実行する
3. WHEN 無効な買主番号形式が検出された場合 THEN THE System SHALL 「無効な買主番号です」エラーを表示する
