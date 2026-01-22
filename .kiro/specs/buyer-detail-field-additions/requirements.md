# Requirements Document

## Introduction

買主詳細ページにおいて、スプレッドシートに存在するがUIブラウザに表示されていないフィールドを追加し、不要なフィールドを削除する機能を実装する。

## Glossary

- **Buyer_Detail_Page**: 買主詳細ページ（BuyerDetailPage.tsx）
- **Spreadsheet**: Google Spreadsheetの買主データシート
- **Dropdown_Field**: プルダウン選択式のフィールド
- **Inline_Editable_Field**: インライン編集可能なフィールド

## Requirements

### Requirement 1: 【問合メール】電話対応フィールドの追加

**User Story:** As a 営業担当者, I want to 問合メールに対する電話対応状況を記録したい, so that 対応状況を追跡できる。

#### Acceptance Criteria

1. WHEN 買主詳細ページを表示する THEN THE Buyer_Detail_Page SHALL 「【問合メール】電話対応」フィールドをドロップダウン形式で表示する
2. THE Dropdown_Field SHALL 以下の選択肢を含む: 「済」「未」「不通」「電話番号なし」「不要」
3. WHEN ユーザーが選択肢を変更する THEN THE Buyer_Detail_Page SHALL データベースとスプレッドシートに値を保存する

### Requirement 2: 3回架電確認済みフィールドの追加

**User Story:** As a 営業担当者, I want to 3回架電の確認状況を記録したい, so that 架電状況を管理できる。

#### Acceptance Criteria

1. WHEN 買主詳細ページを表示する THEN THE Buyer_Detail_Page SHALL 「3回架電確認済み」フィールドをドロップダウン形式で表示する
2. THE Dropdown_Field SHALL 以下の選択肢を含む: 「3回架電OK」「3回架電未」「他」
3. WHEN ユーザーが選択肢を変更する THEN THE Buyer_Detail_Page SHALL データベースとスプレッドシートに値を保存する

### Requirement 3: メール種別フィールドの追加

**User Story:** As a 営業担当者, I want to メールの種別を記録したい, so that 対応内容を分類できる。

#### Acceptance Criteria

1. WHEN 買主詳細ページを表示する THEN THE Buyer_Detail_Page SHALL 「メール種別」フィールドをドロップダウン形式で表示する
2. THE Dropdown_Field SHALL 以下の選択肢を含む:
   - 「メールアドレス確認」
   - 「資料請求メール（戸、マ）」
   - 「資料請求メール（土）許可不要」
   - 「資料請求メール（土）売主へ要許可」
   - 「買付あり内覧NG」
   - 「買付あり内覧OK」
   - 「前回問合せ後反応なし」
   - 「前回問合せ後反応なし（買付あり、物件不適合）」
   - 「物件指定なし問合せ（Pinrich)」
   - 「民泊問合せ」
3. WHEN ユーザーが選択肢を変更する THEN THE Buyer_Detail_Page SHALL データベースとスプレッドシートに値を保存する

### Requirement 4: 持家ヒアリングフィールドの追加

**User Story:** As a 営業担当者, I want to 持家ヒアリングの結果を記録したい, so that 顧客の住居状況を把握できる。

#### Acceptance Criteria

1. WHEN 買主詳細ページを表示する THEN THE Buyer_Detail_Page SHALL 「持家ヒアリング」フィールドをテキスト入力形式で表示する
2. WHEN ユーザーが値を入力する THEN THE Buyer_Detail_Page SHALL データベースとスプレッドシートに値を保存する

### Requirement 5: 担当への確認事項フィールドの追加

**User Story:** As a 営業担当者, I want to 担当への確認事項を記録したい, so that 確認が必要な事項を管理できる。

#### Acceptance Criteria

1. WHEN 買主詳細ページを表示する THEN THE Buyer_Detail_Page SHALL 「担当への確認事項」フィールドをテキスト入力形式で表示する
2. THE Inline_Editable_Field SHALL 複数行入力に対応する
3. WHEN ユーザーが値を入力する THEN THE Buyer_Detail_Page SHALL データベースとスプレッドシートに値を保存する

### Requirement 6: 配信種別フィールドの追加

**User Story:** As a 営業担当者, I want to 配信種別を記録したい, so that メール配信の要否を管理できる。

#### Acceptance Criteria

1. WHEN 買主詳細ページを表示する THEN THE Buyer_Detail_Page SHALL 「配信種別」フィールドをドロップダウン形式で表示する
2. THE Dropdown_Field SHALL 以下の選択肢を含む: 「要」「不要」
3. WHEN ユーザーが選択肢を変更する THEN THE Buyer_Detail_Page SHALL データベースとスプレッドシートに値を保存する

### Requirement 7: 不要フィールドの削除

**User Story:** As a 営業担当者, I want to 不要なフィールドを非表示にしたい, so that 画面がすっきりして使いやすくなる。

#### Acceptance Criteria

1. WHEN 買主詳細ページを表示する THEN THE Buyer_Detail_Page SHALL 「LINE」フィールドを表示しない
2. WHEN 買主詳細ページを表示する THEN THE Buyer_Detail_Page SHALL 「ニックネーム」フィールドを表示しない
3. WHEN 買主詳細ページを表示する THEN THE Buyer_Detail_Page SHALL 「現住居」フィールドを表示しない
4. THE Buyer_Detail_Page SHALL データベースのカラムは削除せず、UIからの表示のみを非表示にする
